---
title: Automatic Inference
description: Zero-config schema generation using AST
---

# Automatic Inference

If you don't want to write validation schemas, **SvelteKit Auto OpenAPI** can still generate documentation for you by reading your code.

## How it works

The library uses `ts-morph` to analyze your TypeScript Abstract Syntax Tree (AST). It specifically looks for usage of `request.json<T>()` and `json(data)`.

### Request Body

If you type your generic `request.json`, we convert that type into an OpenAPI schema.

```ts
// +server.ts
interface UserPayload {
  name: string;
  age: number;
}

export async function POST({ request }) {
  // We detect 'UserPayload' and generate a schema for it!
  const data = await request.json<UserPayload>();
}
```

### Responses

We also look for standard SvelteKit `json()` responses.

```ts
export async function GET() {
  // We detect this structure and the status code 200
  return json({ id: 1, name: "Alice" }, { status: 200 });
}
```

> **Note**: AST inference is "static analysis". It cannot run your code, so dynamic types or complex runtime logic might not be detected. For 100% accuracy, use the `_config` Validation method.
