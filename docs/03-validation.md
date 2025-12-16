---
title: Validation & Schemas
description: How to use Zod for runtime validation and schema generation
---

# Validation & Schemas

The most powerful feature of this library is the `_config` export. It allows you to define strict **Zod** schemas for every part of the HTTP request.

## The `_config` Object

You can export `_config` from any `+server.ts` file.

```ts
import { z } from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";

export const _config: RouteConfig = {
  validation: {
    // Method (GET, POST, PUT, etc.)
    POST: {
      input: {
        // Validate JSON Body
        body: z.object({
          username: z.string().min(3),
          role: z.enum(["admin", "user"]),
        }),

        // Validate Query Strings (?limit=10)
        query: z.object({
          limit: z.coerce.number().optional(),
        }),

        // Validate Path Params (/users/[id])
        parameters: z.object({
          id: z.string().uuid(),
        }),

        // Validate Headers
        headers: z.object({
          "x-custom-auth": z.string(),
        }),

        // Validate Cookies
        cookies: z.object({
          session_id: z.string(),
        }),
      },

      // Define expected responses
      output: {
        "200": {
          body: z.object({ success: z.boolean() }),
          description: "User created successfully",
        },
        "400": {
          body: z.object({ error: z.string() }),
          description: "Validation error",
        },
      },
    },
  },
};
```

## How It Works

1.  **Request Phase**: When a request hits your server, the `SchemaValidationHook` intercepts it.
2.  **Validation**: It checks the request against your `input` schemas.
3.  **Error Handling**: If validation fails, it immediately returns a `400 Bad Request` with detailed error messages (formatted for Zod).
4.  **Response Phase**: After your handler runs, the hook can optionally validate your `output` to ensure you aren't leaking sensitive data (development mode only recommendation).

<!-- end list -->
