import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Script = { src: string; async: boolean; crossOrigin: string; integrity: string; referrerPolicy: string;
  onload: (() => void) | null; onerror: (() => void) | null; remove: ReturnType<typeof vi.fn> };
let scripts: Script[];
const fakeApi = { Map: class {}, HtmlMarker: class {}, Polyline: class {} };
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); scripts = [];
  vi.stubGlobal('window', { setTimeout, mapgl: undefined });
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({ src: '', async: false, crossOrigin: '', integrity: '', referrerPolicy: '', onload: null, onerror: null, remove: vi.fn() })),
    head: { appendChild: (script: Script) => { scripts.push(script); } },
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('fixed MapGL loader lifecycle (synthetic DOM, no network or real credential)', () => {
  it('loads only the fixed pinned SDK, with published SRI and no credential URL', async () => {
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    const pending = loadDgisSdk();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ src: 'https://mapgl.2gis.com/api/js/v1.78.0', async: true,
      crossOrigin: 'anonymous', integrity: 'sha512-metdG0w/fyK9oN0o5ErTJjVUIWw/yltMT0m4LAX81KbSVulXGL31TG6fM8nmjVfLt+HzMf7khAdKBbVdsCN81A==' });
    Object.assign(window, { mapgl: fakeApi }); scripts[0].onload?.();
    expect(await pending).toBe(fakeApi);
  });
  it('deduplicates concurrent SDK loads without retaining a browser key', async () => {
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    const first = loadDgisSdk(), second = loadDgisSdk();
    expect(first).toBe(second); expect(scripts).toHaveLength(1);
    Object.assign(window, { mapgl: fakeApi }); scripts[0].onload?.(); await first;
  });
  it('fails safely if onload does not expose the documented API', async () => {
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    const pending = loadDgisSdk(), rejection = expect(pending).rejects.toThrow('MAP_SDK_UNAVAILABLE');
    scripts[0].onload?.(); await rejection;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
  });
  it('fails on CDN/SRI errors and permits one future explicit remount attempt', async () => {
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    const first = loadDgisSdk(), firstError = expect(first).rejects.toThrow('MAP_SDK_UNAVAILABLE');
    scripts[0].onerror?.(); await firstError;
    const second = loadDgisSdk(), secondError = expect(second).rejects.toThrow('MAP_SDK_UNAVAILABLE');
    expect(scripts).toHaveLength(2); scripts[1].onerror?.(); await secondError;
  });
  it('times out without an automatic request retry or a credential-bearing error', async () => {
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    const pending = loadDgisSdk(), rejection = expect(pending).rejects.toThrow('MAP_SDK_UNAVAILABLE');
    await vi.advanceTimersByTimeAsync(10_000); await rejection;
    expect(scripts).toHaveLength(1); expect(scripts[0].remove).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000); expect(scripts).toHaveLength(1);
  });
  it('reuses an already loaded SDK without an additional CDN request', async () => {
    Object.assign(window, { mapgl: fakeApi });
    const { loadDgisSdk } = await import('../../src/client/dgis-mapgl');
    expect(await loadDgisSdk()).toBe(fakeApi); expect(scripts).toHaveLength(0);
  });
});
