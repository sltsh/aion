import { inflateRawSync } from 'node:zlib';

// A single-entry reader, because this machine has no unzip and the archive holds one file
// the lab needs. It reads the central directory rather than scanning local headers.
export function extractEntry(buffer, name) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('no end-of-central-directory record');
  let offset = buffer.readUInt32LE(eocd + 16);
  const count = buffer.readUInt16LE(eocd + 10);

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('bad central directory entry');
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const entry = buffer.subarray(offset + 46, offset + 46 + nameLength).toString();

    if (entry === name) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const raw = buffer.subarray(start, start + compressed);
      return method === 0 ? raw : inflateRawSync(raw);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`entry not found: ${name}`);
}
