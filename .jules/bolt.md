## 2024-05-18 - Caching Synchronous System Calls
**Learning:** `os.networkInterfaces()` is a blocking, synchronous system call. When calling it in frequently accessed code paths (e.g., generating `getLocalIP` during frequent UI state updates in Electron), it degrades main thread performance.
**Action:** Always cache the result of `os.networkInterfaces()` with a TTL when it's called frequently, such as in state update loops, to prevent blocking the main thread.
