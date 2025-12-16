---
title: Configuration
description: Global configuration for Vite and Scalar
---

# Configuration

## Vite Plugin

The Vite plugin is responsible for scanning your routes and generating the virtual schema module. It requires no configuration.

```ts
// vite.config.ts
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [svelteOpenApi()],
});
```

## Scalar Module

The Scalar module serves your interactive API documentation. It is highly configurable.

```ts
// src/routes/docs/[slug]/+server.ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

const { GET } = ScalarModule({
  // Path where the JSON spec is served
  openApiPath: "openapi.json",

  // Base OpenAPI info
  openApiOpts: {
    openapi: "3.0.0",
    info: {
      title: "My Awesome API",
      version: "1.0.0",
      description: "Generated automatically with SvelteKit Auto OpenAPI",
    },
  },

  // Scalar UI options
  scalarOpts: {
    theme: "purple",
    layout: "modern",
  },
});

export { GET };
```
