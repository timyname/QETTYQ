import { describe, expect, it } from 'vitest';
import { appMediaUrl } from '../../src/client/media-url';

describe('reviewed media in bundled native UI', () => {
  const poster = `/api/media/events/${'a'.repeat(64)}`;
  it('uses the app HTTPS server for approved paths in Capacitor only', () => {
    expect(appMediaUrl(poster, 'capacitor://localhost/index.html')).toBe(`https://qettyqapp.anamai.kz${poster}`);
    expect(appMediaUrl('/assets/places/park-photo.jpg', 'capacitor://localhost')).toBe('https://qettyqapp.anamai.kz/assets/places/park-photo.jpg');
  });
  it('retains normal web paths and never rewrites arbitrary providers or private paths', () => {
    expect(appMediaUrl(poster, 'https://qettyqapp.anamai.kz')).toBe(poster);
    for (const path of ['https://evil.example/photo.jpg', '//evil.example/photo.jpg', '/api/memory', '/assets/places/../secret.jpg']) expect(appMediaUrl(path, 'capacitor://localhost')).toBe(path);
    expect(appMediaUrl(poster, 'capacitor://other')).toBe(poster);
  });
});
