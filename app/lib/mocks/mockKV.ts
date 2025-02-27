/**
 * Mock KV implementation for local development
 * This provides a simple in-memory KV store that mimics the Cloudflare KV namespace
 */

// Simple in-memory storage
const memoryStore = new Map<string, string>();

// Create a simpler implementation that doesn't try to match the exact interface
export class MockKV {
  constructor(private readonly _id: string = 'boltKV') {}

  // Basic KV operations
  async get(key: string, options?: any): Promise<any> {
    const value = memoryStore.get(key);

    if (value === undefined) {
      return null;
    }

    if (options?.type === 'json' && value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(`Failed to parse JSON for key ${key}`, e);
        return null;
      }
    } else if (options === 'json' && value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(`Failed to parse JSON for key ${key}`, e);
        return null;
      }
    } else if (options === 'arrayBuffer' && value) {
      // Mock implementation for arrayBuffer
      const encoder = new TextEncoder();
      return encoder.encode(value).buffer;
    } else if (options === 'stream' && value) {
      // Mock implementation for stream
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(value);

      return new ReadableStream({
        start(controller) {
          controller.enqueue(uint8Array);
          controller.close();
        },
      });
    }

    return value;
  }

  async put(key: string, value: string | ReadableStream | ArrayBuffer, _options?: any): Promise<void> {
    let valueToStore: string;

    if (value instanceof ReadableStream) {
      // Convert ReadableStream to string
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value: chunk } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(chunk);
      }

      const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;

      for (const chunk of chunks) {
        allChunks.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder();
      valueToStore = decoder.decode(allChunks);
    } else if (value instanceof ArrayBuffer) {
      // Convert ArrayBuffer to string
      const decoder = new TextDecoder();
      valueToStore = decoder.decode(new Uint8Array(value));
    } else {
      valueToStore = value;
    }

    memoryStore.set(key, valueToStore);
  }

  async delete(key: string): Promise<void> {
    memoryStore.delete(key);
  }

  // Additional methods required by KVNamespace interface
  async list(options?: any): Promise<any> {
    const keys = Array.from(memoryStore.keys())
      .filter((key) => (options?.prefix ? key.startsWith(options.prefix) : true))
      .map((name) => ({ name }));

    return {
      keys: keys.slice(0, options?.limit ?? 1000),
      list_complete: true,
      cacheStatus: null,
    };
  }

  // Additional methods to match CF KV
  async getWithMetadata(key: string, options?: any): Promise<any> {
    const value = await this.get(key, options);

    return {
      value,
      metadata: null,
      cacheStatus: null,
    };
  }
}

// Create and export a default instance
const mockKV = new MockKV();
export default mockKV;
