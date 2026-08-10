import assert from 'node:assert/strict';
import test from 'node:test';
import { SerialSession } from '../src/infrastructure/hingmed/serial-session.js';

test('serial session reuses the only previously permitted port', async () => {
    const port = fakePort();
    let chooserCalls = 0;
    const session = new SerialSession({
        navigatorRef: {
            serial: {
                getPorts: async () => [port],
                requestPort: async () => {
                    chooserCalls += 1;
                    return port;
                }
            }
        }
    });

    await session.open();
    assert.equal(chooserCalls, 0);
    assert.deepEqual(port.openOptions, {
        baudRate: 19200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
    });
    await session.close();
});

test('serial session opens the chooser when the permitted port is ambiguous', async () => {
    const selectedPort = fakePort();
    let chooserCalls = 0;
    const session = new SerialSession({
        navigatorRef: {
            serial: {
                getPorts: async () => [fakePort(), fakePort()],
                requestPort: async () => {
                    chooserCalls += 1;
                    return selectedPort;
                }
            }
        }
    });

    await session.open();
    assert.equal(chooserCalls, 1);
    await session.close();
});

function fakePort() {
    const reader = {
        async read() { return { done: true }; },
        async cancel() {},
        releaseLock() {}
    };
    const writer = {
        async write() {},
        releaseLock() {}
    };
    return {
        openOptions: null,
        readable: { getReader: () => reader },
        writable: { getWriter: () => writer },
        async open(options) { this.openOptions = options; },
        async close() {},
        async setSignals() {}
    };
}
