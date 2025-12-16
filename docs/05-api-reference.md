---
title: API Reference
description: Technical details of library exports
---

# API Reference

## `ScalarModule(options)`

Used to create the documentation route handler.

| Option           | Type      | Default          | Description                                                 |
| :--------------- | :-------- | :--------------- | :---------------------------------------------------------- |
| `openApiPath`    | `string`  | `"openapi.json"` | The relative URL where the raw JSON spec will be served.    |
| `disableOpenApi` | `boolean` | `false`          | If true, the JSON endpoint is not created.                  |
| `scalarDocPath`  | `string`  | `"scalar"`       | The relative URL where the Scalar UI will be served.        |
| `openApiOpts`    | `object`  | `{}`             | Base OpenAPI document properties (info, servers, security). |
| `scalarOpts`     | `object`  | `{}`             | Configuration passed directly to `@scalar/sveltekit`.       |

## `SchemaValidationHook`

The global server hook for runtime validation.

- **Returns**: A SvelteKit `Handle` function.
- **Usage**: Must be added to `sequence()` in `src/hooks.server.ts`.

## `RouteConfig`

The type definition for the `_config` export.

```ts
export interface RouteConfig {
  openapi?: PathItemObject; // Standard OpenAPI Operation object
  validation?: Record<string, ValidationConfig>; // Zod Schemas
}
```
