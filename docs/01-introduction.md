---
title: Introduction
description: Overview of SvelteKit Auto OpenAPI
---

# Introduction

**SvelteKit Auto OpenAPI** bridges the gap between your code and your API documentation. Instead of maintaining a separate `yaml` file or decorating your code with complex decorators, this library reads your **existing SvelteKit code** to generate an OpenAPI 3.0 specification.

## Core Concepts

The library operates on a simple "Cascading Priority" system to generate your API specs:

1.  **High Priority (Manual)**: You explicitly define the OpenAPI object in a `_config` export. This overrides everything else.
2.  **Mid Priority (Validation)**: You define Zod schemas for input/output. We generate the OpenAPI spec _and_ validate requests at runtime.
3.  **Low Priority (Inference)**: You do nothing special. We use TypeScript AST analysis to peek at your `request.json<T>()` calls and infer the schema automatically.
