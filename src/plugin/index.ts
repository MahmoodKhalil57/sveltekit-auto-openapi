import type { Plugin, ViteDevServer } from "vite";
import { generate } from "./generator.ts";

// Debug mode controlled by environment variable
const DEBUG = process.env.DEBUG_OPENAPI === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

const PACKAGE_SCHEMA_MODULE_ID = "sveltekit-auto-openapi/schema-paths";
// Virtual module IDs for user imports
const VIRTUAL_SCHEMA_MODULE_ID = "virtual:" + PACKAGE_SCHEMA_MODULE_ID;
const RESOLVED_VIRTUAL_SCHEMA_MODULE_ID = "\0" + VIRTUAL_SCHEMA_MODULE_ID;

const PACKAGE_VALIDATION_MAP_MODULE_ID =
  "sveltekit-auto-openapi/schema-validation-map";
const VIRTUAL_VALIDATION_MAP_MODULE_ID =
  "virtual:" + PACKAGE_VALIDATION_MAP_MODULE_ID;
const RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID =
  "\0" + VIRTUAL_VALIDATION_MAP_MODULE_ID;

export default function svelteOpenApi(): Plugin {
  let server: ViteDevServer | null = null;
  let root = process.cwd();
  let cachedSchema: any = null;
  let cachedValidationMap: any = null;
  let isGenerating = false;

  return {
    name: "sveltekit-auto-openapi",
    enforce: "pre",

    config() {
      return {
        optimizeDeps: {
          // Prevent Vite from pre-bundling this package so the plugin hooks can run
          exclude: ["sveltekit-auto-openapi"],
        },
        ssr: {
          // Prevent Vite from externalizing this package in SSR so the plugin hooks can run
          noExternal: ["sveltekit-auto-openapi"],
        },
      };
    },

    configResolved(config) {
      root = config.root;
    },

    configureServer(_server) {
      server = _server;
    },

    // Resolve virtual module
    resolveId(id) {
      if (id === VIRTUAL_SCHEMA_MODULE_ID || id === PACKAGE_SCHEMA_MODULE_ID) {
        return RESOLVED_VIRTUAL_SCHEMA_MODULE_ID;
      } else if (
        id === VIRTUAL_VALIDATION_MAP_MODULE_ID ||
        id === PACKAGE_VALIDATION_MAP_MODULE_ID
      ) {
        return RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID;
      }
    },

    // Load virtual module
    async load(id) {
      if (
        id === RESOLVED_VIRTUAL_SCHEMA_MODULE_ID ||
        id === RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID
      ) {
        // CRITICAL: If we're currently generating and a route file imports this virtual module
        // during SSR loading, we must return cached data or empty stub immediately to avoid deadlock
        if (isGenerating) {
          debug(
            "⚠️ Virtual module requested during generation - returning stub to prevent deadlock"
          );

          if (id === RESOLVED_VIRTUAL_SCHEMA_MODULE_ID) {
            return `export default ${JSON.stringify(
              cachedSchema || {},
              null,
              2
            )};`;
          } else {
            return `export default {}; export const initPromise = Promise.resolve();`;
          }
        }

        // Generate if we don't have cached data
        if (!cachedSchema || !cachedValidationMap) {
          isGenerating = true;
          console.log("Generating OpenAPI schema and Validation map...");

          try {
            // Pass server to enable runtime Zod schema loading
            // If route files import virtual modules, they'll get stubs (see above)
            const { openApiPaths, validationMap } = await generate(
              server,
              root
            );

            // Only cache if we got valid data (not empty from re-entry guard)
            if (
              Object.keys(openApiPaths).length > 0 ||
              Object.keys(validationMap).length > 0
            ) {
              console.log("✓ Generation complete.");
              cachedSchema = openApiPaths;
              cachedValidationMap = validationMap;

              // CRITICAL: Invalidate the virtual modules in Vite's module graph
              // This forces any route files that imported the stub during SSR loading
              // to reload and get the real data
              if (server) {
                const schemaModule = server.moduleGraph.getModuleById(
                  RESOLVED_VIRTUAL_SCHEMA_MODULE_ID
                );
                if (schemaModule) {
                  server.moduleGraph.invalidateModule(schemaModule);
                  debug("✓ Invalidated schema module to reload with real data");
                }

                const validationMapModule = server.moduleGraph.getModuleById(
                  RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID
                );
                if (validationMapModule) {
                  server.moduleGraph.invalidateModule(validationMapModule);
                  debug(
                    "✓ Invalidated validation map module to reload with real data"
                  );
                }
              }
            } else {
              debug(
                "⚠️ Generation returned empty data, keeping existing cache"
              );
              // Initialize cache with empty objects if still null
              if (!cachedSchema) cachedSchema = {};
              if (!cachedValidationMap) cachedValidationMap = {};
            }
          } finally {
            isGenerating = false;
          }
        }

        if (id === RESOLVED_VIRTUAL_SCHEMA_MODULE_ID) {
          try {
            // Use null instead of server to avoid circular dependencies during SSR
            return `export default ${JSON.stringify(
              cachedSchema || {},
              null,
              2
            )};`;
          } catch (err) {
            console.error("Failed to generate OpenAPI schema:", err);
            return `export default {};`;
          }
        }

        if (id === RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID) {
          try {
            // In dev mode, skip ssrLoadModule to avoid circular dependencies
            // Just get the structure without loading actual modules

            // Track unique module paths
            const modulePaths = new Set<string>();
            const modulePathMap: Record<string, string> = {};
            let count = 0;

            // First pass: collect all unique module paths
            for (const methods of Object.values(cachedValidationMap || {})) {
              for (const data of Object.values(
                methods as Record<string, any>
              )) {
                const { modulePath } = data as any;
                if (!modulePaths.has(modulePath)) {
                  const varName = `mod_${count++}`;
                  modulePathMap[modulePath] = varName;
                  modulePaths.add(modulePath);
                }
              }
            }

            // Generate lazy-loading imports
            const lazyImports = Array.from(modulePaths)
              .map((modulePath) => {
                const varName = modulePathMap[modulePath];
                return `let ${varName} = null;`;
              })
              .join("\n");

            const lazyLoaders = Array.from(modulePaths)
              .map((modulePath) => {
                const varName = modulePathMap[modulePath];
                return `
  async function load_${varName}() {
    if (!${varName}) {
      ${varName} = await import('/${modulePath}');
    }
    return ${varName};
  }`;
              })
              .join("\n");

            // Build the registry structure
            const registryEntries: string[] = [];

            for (const [routePath, methods] of Object.entries(
              cachedValidationMap || {}
            )) {
              const methodEntries: string[] = [];

              for (const [method, data] of Object.entries(
                methods as Record<string, any>
              )) {
                const { modulePath, isImplemented } = data as any;
                const varName = modulePathMap[modulePath];

                methodEntries.push(
                  `    get ${method}() {
        const mod = ${varName};
        const validation = mod?._config?.standardSchema?.["${method}"];
        return validation ? { ...validation, isImplemented: ${isImplemented} } : undefined;
      }`
                );
              }

              registryEntries.push(
                `  "${routePath}": {\n${methodEntries.join(",\n")}\n  }`
              );
            }

            // Generate initialization function
            const initCalls = Array.from(modulePaths)
              .map((modulePath) => {
                const varName = modulePathMap[modulePath];
                return `  await load_${varName}();`;
              })
              .join("\n");

            // Generate the complete module code
            return `
  ${lazyImports}
  
  ${lazyLoaders}
  
  // Initialize all modules
  let initialized = false;
  async function initializeRegistry() {
    if (initialized) return;
  ${initCalls}
    initialized = true;
  }
  
  const validationRegistry = {
  ${registryEntries.join(",\n")}
  };
  
  // Auto-initialize on first import
  const initPromise = initializeRegistry();
  
  export default validationRegistry;
  export { initPromise };
  `;
          } catch (err) {
            console.error("Failed to generate validation map:", err);
            return `export default {};`;
          }
        }
      }
    },

    // Production build hook - for logging/cleanup only
    // Virtual modules are automatically bundled by Vite/Rollup via resolveId + load hooks
    async closeBundle() {
      if (!cachedSchema || !cachedValidationMap) {
        debug(
          "⚠️ closeBundle: No cached schema/validation map - generation may not have run"
        );
        return;
      }

      console.log(
        `✓ OpenAPI schema bundled with ${
          Object.keys(cachedSchema).length
        } route(s)`
      );
      debug(
        `✓ Validation map bundled with ${
          Object.keys(cachedValidationMap).length
        } route(s)`
      );
    },

    // Trigger HMR on file change
    handleHotUpdate({ file, server }) {
      if (file.endsWith("+server.ts")) {
        // Clear cache to force regeneration on next load
        cachedSchema = null;
        cachedValidationMap = null;

        // Invalidate the virtual module to trigger regeneration
        const schemaModule = server.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_SCHEMA_MODULE_ID
        );
        if (schemaModule) {
          server.moduleGraph.invalidateModule(schemaModule);
        }

        const validationMapModule = server.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_VALIDATION_MAP_MODULE_ID
        );
        if (validationMapModule) {
          server.moduleGraph.invalidateModule(validationMapModule);
        }

        debug(
          "API Route changed, OpenAPI schema will regenerate on next import."
        );

        // Return empty array to trigger full reload for the virtual module
        return [];
      }
    },
  };
}
