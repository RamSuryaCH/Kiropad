## 2026-06-30 - os.networkInterfaces Bottleneck
**Learning:** os.networkInterfaces() is a synchronous, blocking system call. When used in frequently accessed code paths (like generating getLocalIP during frequent UI state updates), it degrades main thread performance.
**Action:** Cache the result of os.networkInterfaces() with a TTL to prevent degrading main thread performance.

## 2026-06-30 - Unbounded string buffers in process listeners
**Learning:** Accumulating unbounded strings in long-running process data listeners causes memory leaks and regex performance bottlenecks.
**Action:** Return early from listeners and clear buffers once the target condition (e.g., matching a URL) is met.
