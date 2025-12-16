# SvelteKit Auto OpenAPI

<p align="center">
  <img src="https://img.shields.io/npm/v/sveltekit-auto-openapi?style=for-the-badge&color=orange" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/sveltekit-auto-openapi?style=for-the-badge&color=blue" alt="downloads" />
  <img src="https://img.shields.io/bundlejs/size/sveltekit-auto-openapi?style=for-the-badge&color=green" alt="bundle size" />
</p>

<p align="center">
  <strong>Type-safe OpenAPI generation and runtime validation for SvelteKit.</strong><br/>
  Write standard SvelteKit code, get documented APIs for free.
</p>

---

## ⚡ Features

- **🔎 Automatic Inference**: Generates OpenAPI schemas by analyzing your `request.json<Type>()` calls.
- **🛡️ Runtime Validation**: Validates Headers, Cookies, Query Params, and Body using [Zod](https://zod.dev).
- **📘 Interactive Documentation**: Built-in [Scalar](https://scalar.com) integration for beautiful API references.
- **⚡ Zero Boilerplate**: Works directly with standard SvelteKit `+server.ts` files.
- **🔄 Hot Reload**: OpenAPI schemas update instantly as you modify your routes.

## 🚀 Quick Start

### 1. Install

```bash
npm install sveltekit-auto-openapi
```

```bash
pnpm install sveltekit-auto-openapi
```

```bash
bun install sveltekit-auto-openapi
```

### 2\. Add Vite Plugin

Add the plugin to `vite.config.ts` to enable schema generation.

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default {
  plugins: [sveltekit(), svelteOpenApi()],
};
```

### 3\. Add Validation Hook

Add the hook to `src/hooks.server.ts` to enable runtime validation.

```ts
import { sequence } from "@sveltejs/kit/hooks";
import SchemaValidationHook from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(SchemaValidationHook());
```

### 4\. Create API Docs Route

Expose your documentation at `src/routes/api-docs/[slug]/+server.ts`.

```ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

const scalar = ScalarModule({
  openApiOpts: {
    info: { title: "My App API", version: "1.0.0" },
  },
});

export const { GET } = scalar;
```

---

## 💡 Usage Scenarios

### Level 1: Automatic (AST Inference)

Just write your code. We infer the schema from your generic types.

```ts
// src/routes/api/auth/+server.ts
export async function POST({ request }) {
  // The schema is automatically generated from this generic!
  const { email } = await request.json<{ email: string }>();
  return json({ success: true });
}
```

### Level 2: Strict (Zod Validation)

Export a `_config` object to enforce runtime validation and detailed docs.

```ts
import { z } from "zod";

export const _config = {
  validation: {
    POST: {
      input: {
        body: z.object({ email: z.string().email() }),
        headers: z.object({ "x-api-key": z.string() }),
      },
      output: {
        "200": { body: z.object({ token: z.string() }) },
      },
    },
  },
};
```

### Level 3: Manual (OpenAPI Override)

Need full control? Override specific parts of the OpenAPI spec manually.

```ts
export const _config = {
  openapi: {
    GET: {
      summary: "Legacy Endpoint",
      description: "Manually documented endpoint.",
    },
  },
};
```

## 📚 Documentation

Read the full documentation at **[your-docs-site.com](https://www.google.com/search?q=https://your-docs-site.com)**.

## 📄 License

[MIT](https://www.google.com/search?q=./LICENSE)
