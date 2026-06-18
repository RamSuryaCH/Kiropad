import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import * as http from 'http';
import { BridgeServer } from './bridge';
import { PairingManager } from './pairing';

describe('BridgeServer', () => {
  let pm: PairingManager;
  let server: BridgeServer;
  let port: number;

  beforeEach(async () => {
    pm = new PairingManager();
    // Using port 0 lets the OS assign a random available port
    server = new BridgeServer(0, pm);
    server.start();

    // We need to wait for the HTTP server to actually start listening
    // to get the assigned port. Since server.start() is synchronous but
    // the listen callback happens asynchronously, we can access the underlying
    // http server. BridgeServer exposes a protected/private member `server`
    // but we can access it using any or by grabbing the address.
    // However, looking at the code, `server` is a private property.
    // Instead of hacking private access, we can rely on the fact that listen(0)
    // binds synchronously but the callback is asynchronous.

    await new Promise<void>((resolve) => {
      // The HTTP server is private, so we cast to any to get the port
      const checkPort = () => {
        const addr = (server as any).server?.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
          resolve();
        } else {
          setTimeout(checkPort, 10);
        }
      };
      checkPort();
    });
  });

  afterEach(() => {
    server.stop();
    vi.restoreAllMocks();
  });

  describe('WebSocket Upgrade & Auth', () => {
    it('rejects connection without query params', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        ws.on('error', (err: any) => {
          expect(err.message).toMatch(/Unexpected server response: 401/);
          resolve();
        });
        ws.on('open', () => reject(new Error('Should not have connected')));
      });
    });

    it('rejects connection with invalid code', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}?code=000000`);
        ws.on('error', (err: any) => {
          expect(err.message).toMatch(/Unexpected server response: 401/);
          resolve();
        });
        ws.on('open', () => reject(new Error('Should not have connected')));
      });
    });

    it('accepts connection with valid code and receives connected message', async () => {
      return new Promise<void>((resolve, reject) => {
        const validCode = pm.currentCode;
        const ws = new WebSocket(`ws://127.0.0.1:${port}?code=${validCode}&device=TestDevice`);

        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            expect(msg.version).toBe('2.0.0');
            expect(msg.deviceName).toBe('TestDevice');
            expect(msg.sessionToken).toBeDefined();
            ws.close();
            resolve();
          }
        });

        ws.on('error', reject);
      });
    });

    it('rejects connection if locked out', async () => {
      // Force lockout
      for (let i = 0; i < 10; i++) {
        pm.validateCode('000000');
      }
      expect(pm.isLockedOut).toBe(true);

      return new Promise<void>((resolve, reject) => {
        const validCode = pm.currentCode;
        const ws = new WebSocket(`ws://127.0.0.1:${port}?code=${validCode}`);
        ws.on('error', (err: any) => {
          expect(err.message).toMatch(/Unexpected server response: 429/);
          resolve();
        });
        ws.on('open', () => reject(new Error('Should not have connected')));
      });
    });

    it('accepts connection with valid session token', async () => {
      const validCode = pm.currentCode;
      const sessionToken = pm.validateCode(validCode, 'Device');
      expect(sessionToken).not.toBeNull();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}?session=${sessionToken}`);

        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            expect(msg.sessionToken).toBe(sessionToken);
            ws.close();
            resolve();
          }
        });

        ws.on('error', reject);
      });
    });

    it('rejects connection with invalid session token', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}?session=invalid_token`);
        ws.on('error', (err: any) => {
          expect(err.message).toMatch(/Unexpected server response: 401/);
          resolve();
        });
        ws.on('open', () => reject(new Error('Should not have connected')));
      });
    });
  });

  describe('WebSocket Messaging', () => {
    let ws: WebSocket;

    beforeEach(async () => {
      // Connect before each messaging test
      return new Promise<void>((resolve, reject) => {
        const validCode = pm.currentCode;
        ws = new WebSocket(`ws://127.0.0.1:${port}?code=${validCode}`);
        ws.on('open', () => {
          // Wait for the 'connected' message first so tests can start sending
          ws.once('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'connected') {
              resolve();
            } else {
              reject(new Error('Expected connected message'));
            }
          });
        });
        ws.on('error', reject);
      });
    });

    afterEach(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('responds to ping with pong', async () => {
      return new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          expect(msg.type).toBe('pong');
          expect(typeof msg.ts).toBe('number');
          resolve();
        });
        ws.on('error', reject);

        ws.send(JSON.stringify({ type: 'ping' }));
      });
    });

    it('responds with error to invalid JSON', async () => {
      return new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          expect(msg.type).toBe('error');
          expect(msg.text).toBe('Invalid JSON');
          resolve();
        });
        ws.on('error', reject);

        ws.send('invalid-json-data');
      });
    });

    it('responds with error to unknown message type', async () => {
      return new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          expect(msg.type).toBe('error');
          expect(msg.text).toBe('Unknown message type');
          resolve();
        });
        ws.on('error', reject);

        ws.send(JSON.stringify({ type: 'some_unknown_type' }));
      });
    });
  });

  describe('HTTP Server', () => {
    it('returns status 200 and version info on root endpoint', async () => {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({
        name: 'kiropad-desktop',
        version: '2.0.0',
        status: 'ok',
      });
    });
  });

});
