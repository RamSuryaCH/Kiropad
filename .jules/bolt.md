## 2026-06-26 - Caching os.networkInterfaces
**Learning:** os.networkInterfaces() is a blocking synchronous system call that can degrade main thread performance when called frequently.
**Action:** Cache the result of os.networkInterfaces() with a TTL to avoid repeated synchronous system calls.
