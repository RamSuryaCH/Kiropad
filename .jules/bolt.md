## 2026-06-27 - Caching blocking os.networkInterfaces()
**Learning:** os.networkInterfaces() is a blocking, synchronous system call that degrades main thread performance if called frequently.
**Action:** Cache the result with a TTL when generating getLocalIP during frequent UI state updates.
