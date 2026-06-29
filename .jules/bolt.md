## 2026-06-29 - os.networkInterfaces() in UI Update Loop
**Learning:** `os.networkInterfaces()` is a blocking, synchronous system call. Calling it in frequently accessed code paths (e.g., generating `getLocalIP` during frequent UI state updates via `getState()`) degrades main thread performance.
**Action:** Cache the result of `os.networkInterfaces()` with a TTL when used in frequently called functions.
