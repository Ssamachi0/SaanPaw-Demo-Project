import { looksLikeImage } from '../src/services/storage.service';

describe('looksLikeImage', () => {
  it('accepts a JPEG', () => {
    expect(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true);
  });

  it('accepts a PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(looksLikeImage(png)).toBe(true);
  });

  it('accepts a WebP', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
    expect(looksLikeImage(webp)).toBe(true);
  });

  it('rejects a script renamed to look like an image', () => {
    expect(looksLikeImage(Buffer.from('<script>alert(1)</script>'))).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(looksLikeImage(Buffer.alloc(0))).toBe(false);
  });
});
