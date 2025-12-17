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

## `createSchemaValidationHook(options)`

The global server hook for runtime validation.

### Parameters

| Option           | Type      | Default | Description                                                |
| :--------------- | :-------- | :------ | :--------------------------------------------------------- |
| `validateOutput` | `boolean` | `false` | If true, validates response bodies against defined schemas |

### Returns

A SvelteKit `Handle` function.

### Usage

Must be added to `sequence()` in `src/hooks.server.ts`:

```ts
import { sequence } from "@sveltejs/kit/hooks";
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(
  createSchemaValidationHook({
    validateOutput: import.meta.env.DEV, // Enable in dev only
  })
);
```

## Type Definitions

### `RouteConfig`

The type definition for the `_config` export in `+server.ts` files.

```ts
export interface RouteConfig {
  openapiOverride?: PathItemObject; // OpenAPI operations with validation
}
```

**Example:**

```ts
import { z } from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";

export const _config: RouteConfig = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      $headers: {
        schema: z.object({ "x-api-key": z.string() }),
      },
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({ email: z.string().email() }),
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }),
            },
          },
        },
      },
    },
  },
};
```

### `ValidationSchemaConfig`

Configuration for a single validation schema with optional flags.

```ts
export interface ValidationSchemaConfig {
  $showErrorMessage?: boolean; // Show detailed errors (default: true in dev, false in prod)
  $skipValidation?: boolean; // Skip validation entirely (default: false)
  schema: any; // Zod schema or raw JSON Schema object
}
```

**Properties:**

- **`schema`** - Either a Zod schema (e.g., `z.object(...)`) or a raw JSON Schema object. Zod schemas are automatically converted to JSON Schema at build time.
- **`$showErrorMessage`** - Controls whether detailed validation errors are returned to clients. Defaults to `true` in development and `false` in production. Set to `false` for sensitive data like authentication headers.
- **`$skipValidation`** - When `true`, the schema is documented but validation is skipped. Useful for documenting APIs without enforcing validation, or during development.

**Example:**

```ts
{
  $showErrorMessage: false, // Hide errors from clients
  $skipValidation: false,   // Still validate
  schema: z.object({
    authorization: z.string().startsWith("Bearer "),
  }),
}
```

### `OperationObjectWithValidation`

Extends the standard OpenAPI `OperationObject` with custom validation properties and enhanced response types.

```ts
export type OperationObjectWithValidation = OpenAPIV3.OperationObject & {
  // Custom operation-level validation properties
  $headers?: ValidationSchemaConfig;
  $query?: ValidationSchemaConfig;
  $pathParams?: ValidationSchemaConfig;
  $cookies?: ValidationSchemaConfig;

  // Override responses to support validation
  responses?: Record<string, ResponseObjectWithValidation>;
};
```

**Custom Properties:**

- **`$headers`** - Validates HTTP request headers
- **`$query`** - Validates query string parameters
- **`$pathParams`** - Validates URL path parameters (e.g., `/users/{id}`)
- **`$cookies`** - Validates request cookies

These `$` prefixed properties are custom extensions that enable validation while keeping the OpenAPI structure clean for documentation.

**Example:**

```ts
{
  POST: {
    summary: "Update user",
    tags: ["Users"],

    // Validate path parameter
    $pathParams: {
      schema: z.object({
        id: z.string().uuid(),
      }),
    },

    // Validate query string
    $query: {
      schema: z.object({
        notify: z.enum(["true", "false"]).optional(),
      }),
    },

    // Validate authentication header
    $headers: {
      $showErrorMessage: false, // Don't expose auth errors
      schema: z.object({
        authorization: z.string(),
      }),
    },

    // Standard OpenAPI requestBody with validation
    requestBody: {
      content: {
        "application/json": {
          $showErrorMessage: true,
          schema: z.object({
            name: z.string().min(1),
            email: z.string().email(),
          }),
        },
      },
    },

    responses: {
      "200": {
        description: "User updated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              user: z.object({
                id: z.string(),
                name: z.string(),
              }),
            }),
          },
        },
      },
    },
  },
}
```

### `MediaTypeWithValidation`

Extends OpenAPI's `MediaTypeObject` to include validation flags.

```ts
export type MediaTypeWithValidation = OpenAPIV3.MediaTypeObject & {
  $showErrorMessage?: boolean;
  $skipValidation?: boolean;
};
```

Used within `requestBody.content` and `responses[statusCode].content` to add validation flags alongside the schema.

### `ResponseObjectWithValidation`

Extends OpenAPI's `ResponseObject` to support validation in both content and headers.

```ts
export type ResponseObjectWithValidation = Omit<
  OpenAPIV3.ResponseObject,
  "content" | "headers"
> & {
  content?: Record<string, MediaTypeWithValidation>;
  headers?: Record<string, HeaderWithValidation>;
};
```

Allows validation of both response bodies and response headers.

## Validation Properties Reference

### Custom Operation-Level Properties

These properties are added at the operation level (GET, POST, etc.) and use the `$` prefix to distinguish them from standard OpenAPI properties:

| Property      | Type                       | Validates          | Example                                     |
| :------------ | :------------------------- | :----------------- | :------------------------------------------ |
| `$headers`    | `ValidationSchemaConfig`   | Request headers    | `{ "x-api-key": z.string() }`               |
| `$query`      | `ValidationSchemaConfig`   | Query parameters   | `{ page: z.number(), limit: z.number() }`   |
| `$pathParams` | `ValidationSchemaConfig`   | Path parameters    | `{ id: z.string().uuid() }`                 |
| `$cookies`    | `ValidationSchemaConfig`   | Request cookies    | `{ session_id: z.string() }`                |

### Standard OpenAPI Properties with Validation

These follow standard OpenAPI structure but support additional validation flags:

| Property                                      | Validates        | Flags                                   |
| :-------------------------------------------- | :--------------- | :-------------------------------------- |
| `requestBody.content['application/json']`     | Request body     | `$showErrorMessage`, `$skipValidation`  |
| `responses[code].content['application/json']` | Response body    | `$showErrorMessage`, `$skipValidation`  |
| `responses[code].headers[name]`               | Response headers | `$showErrorMessage`, `$skipValidation`  |

## Schema Formats

The library supports two schema formats that can be used interchangeably:

### Zod Schemas (Recommended)

```ts
import { z } from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string().email(),
              age: z.number().int().min(18),
              role: z.enum(["admin", "user"]),
            }),
          },
        },
      },
    },
  },
};
```

**Advantages:**
- Excellent TypeScript integration
- Rich validation features (refinements, transforms)
- Great developer experience with autocomplete

### Raw JSON Schema

```ts
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                age: { type: "integer", minimum: 18 },
                role: { type: "string", enum: ["admin", "user"] },
              },
              required: ["email", "age", "role"],
            },
          },
        },
      },
    },
  },
};
```

**Advantages:**
- No Zod dependency required
- Direct control over OpenAPI schema
- Standard JSON Schema features

Both formats are converted to JSON Schema at build time and validated using `@cfworker/json-schema` at runtime.
