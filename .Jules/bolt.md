## 2026-06-30 - os.networkInterfaces Bottleneck
**Learning:** os.networkInterfaces() is a synchronous, blocking system call. When used in frequently accessed code paths (like generating getLocalIP during frequent UI state updates), it degrades main thread performance.
**Action:** Cache the result of os.networkInterfaces() with a TTL to prevent degrading main thread performance.
