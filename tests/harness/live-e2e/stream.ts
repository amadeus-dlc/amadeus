import { createHash } from "node:crypto";

export interface CollectedOutput {
  readonly digest: string;
  readonly bytes: Uint8Array;
  readonly overflowed: boolean;
}

export async function collectBounded(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<CollectedOutput> {
  const reader = stream.getReader();
  const hash = createHash("sha256");
  const chunks: Uint8Array[] = [];
  let buffered = 0;
  let total = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    hash.update(item.value);
    total += item.value.byteLength;
    if (buffered < limit) {
      const remaining = limit - buffered;
      const retained = item.value.byteLength <= remaining ? item.value : item.value.slice(0, remaining);
      chunks.push(retained);
      buffered += retained.byteLength;
    }
  }
  const bytes = new Uint8Array(buffered);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { digest: hash.digest("hex"), bytes, overflowed: total > limit };
}
