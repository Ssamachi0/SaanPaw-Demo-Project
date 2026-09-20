import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'saanpaw-upload-test');
// eslint-disable-next-line import/first
import { looksLikeImage } from '../src/middleware/upload';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saanpaw-magic-'));
const write = (name: string, bytes: Buffer) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, bytes);
  return file;
};

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true });
});

describe('looksLikeImage', () => {
  it('accepts a JPEG', async () => {
    expect(await looksLikeImage(write('a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])))).toBe(true);
  });

  it('accepts a PNG', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(await looksLikeImage(write('a.png', png))).toBe(true);
  });

  it('accepts a WebP', async () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
    expect(await looksLikeImage(write('a.webp', webp))).toBe(true);
  });

  it('rejects a script renamed to look like an image', async () => {
    expect(await looksLikeImage(write('evil.png', Buffer.from('<script>alert(1)</script>')))).toBe(false);
  });

  it('rejects an empty file', async () => {
    expect(await looksLikeImage(write('empty.jpg', Buffer.alloc(0)))).toBe(false);
  });
});
