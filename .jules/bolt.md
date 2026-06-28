## 2024-06-28 - Caching getLocalIP to prevent main thread blocking
**Learning:** `os.networkInterfaces()` is a blocking synchronous system call. In `desktop/src/main.ts`, `getLocalIP()` is called on every state update to `getState()`, which might block the main thread and cause performance issues.
**Action:** Implemented a cache in `desktop/src/network.ts` with a 60 second TTL for the local IP address, and updated test suite to properly mock time and reset the cache between runs.
