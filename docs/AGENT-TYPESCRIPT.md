# TypeScript & Compiler Quirks

Non-obvious TypeScript and toolchain settings that differ between backend and frontend. These are the settings that trip up agents.

---

## Backend (CommonJS)

- **Module system:** `backend/package.json` has no `"type": "module"`, so Node treats `.js` files as CommonJS. Despite `module: nodenext` in tsconfig, relative imports do **not** need `.js` extensions. Don't add them.
- **`verbatimModuleSyntax: false`** — type-only imports don't require `import type` (but it's still good practice).

### Strict flags that bite

- **`exactOptionalPropertyTypes: true`** — cannot assign `undefined` to an optional property explicitly. `obj.prop = undefined` is an error even if the type is `prop?: string`. Use `delete obj.prop` or restructure instead.
- **`noUncheckedIndexedAccess: true`** — array/object index access returns `T | undefined`. Always narrow before use (e.g. `if (arr[i])` or `arr[i]!`).

### Other backend settings

- **`module: nodenext`** — Node.js-style module resolution. Since the package is CommonJS, this works without `.js` extensions.
- **`target: esnext`** — modern JS output.
- **`strict: true`** — full strict mode.

---

## Frontend (ESM)

- **Module system:** `frontend/package.json` has `"type": "module"`. Uses `moduleResolution: "bundler"` so `.js` extensions are not required in imports.
- **`verbatimModuleSyntax: true`** — must use `import type` for type-only imports. Regular `import { SomeType }` will fail.

### Strict flags that bite

- **`erasableSyntaxOnly: true`** (TS 5.8+) — no enums, namespaces, or parameter properties. Use union types and plain objects instead.
- **`noUnusedLocals: true` / `noUnusedParameters: true`** — unused variables/parameters are errors, not warnings.
- **`noFallthroughCasesInSwitch: true`** — switch cases must `break` or `return`.

### Other frontend settings

- **`moduleResolution: "bundler"`** — bundler-style resolution, no `.js` extensions needed.
- **`jsx: "react-jsx"`** — automatic JSX runtime, no `import React` needed.

---

## Framework & Toolchain Notes

### Express 5

The backend uses **Express 5.3.0**. Key differences from Express 4:
- `req.query` is now a getter (read-only).
- Wildcard route syntax changed (`/*` → `/*splat` or use named wildcards).
- `req.body` is `undefined` by default without middleware (already handled by `express.json()` in this project).
- Some middleware behavior changed (e.g., `next('route')` removed).

### React Compiler

The frontend builds with **React Compiler** via Babel (`babel-plugin-react-compiler`). This is an optimization pass that auto-memoizes components. Don't be surprised by compiler-generated code in dev tools or unexpected memoization behavior.

### Cron Package

The backend uses the **`cron`** package (not `node-cron` as some docs may suggest). Import: `import { CronJob } from "cron"`.

---

## Related Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design and data flow
- [`ENV.md`](./ENV.md) — Environment variables
- [`SETUP.md`](./SETUP.md) — Local development setup
