## 2025-02-14 - Unvalidated JSON Input Causing Denial of Service
**Vulnerability:** Passing unvalidated payload fields (like `cwd` in `msg`) directly to strict Node.js built-in APIs like `path.resolve()`. If `cwd` is passed as a non-string object (e.g. `{}`), `path.resolve()` throws a strict `TypeError [ERR_INVALID_ARG_TYPE]`. Since this isn't caught, the server crashes, allowing any authenticated user to repeatedly kill the process.
**Learning:** Always validate the type of dynamic or JSON-parsed inputs before passing them into core Node APIs. Do not assume input types based on expected client behavior.
**Prevention:** Explicitly check types (`typeof input === 'string'`) or use robust validation schemas (like Zod) before performing operations that throw on invalid types.
