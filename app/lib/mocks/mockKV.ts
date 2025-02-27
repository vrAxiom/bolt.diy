/**
 * Mock KV implementation for local development
 * This provides a simple in-memory KV store that mimics the Cloudflare KV namespace
 */

// Simple in-memory storage
const memoryStore = new Map<string, string>();

export class MockKV implements KVNamespace {
  constructor(public readonly id: string = 'boltKV') {}

  // Basic KV operations
  async get(key: string, options?: KVNamespaceGetOptions<any>): Promise<any> {
    const value = memoryStore.get(key);
    if (value === undefined) return null;
    
    if (options?.type === 'json' && value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(`Failed to parse JSON for key ${key}`, e);
        return null;
      }
    }
    
    return value;
  }

  async put(key: string, value: string | ReadableStream | ArrayBuffer, options?: KVNamespacePutOptions): Promise<void> {
    let valueToStore: string;
    
    if (typeof value === 'string') {
      valueToStore = value;
    } else if (value instanceof ArrayBuffer) {
      valueToStore = new TextDecoder().decode(value);
    } else if (value instanceof ReadableStream) {
      // Convert ReadableStream to text
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      
      let done = false;
      while (!done) {
        const { value: chunk, done: doneReading } = await reader.read();
        done = doneReading;
        if (chunk) chunks.push(chunk);
      }
      
      const allBytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        allBytes.set(chunk, offset);
        offset += chunk.length;
      }
      
      valueToStore = new TextDecoder().decode(allBytes);
    } else {
      // Fallback for any other type
      try {
        valueToStore = JSON.stringify(value);
      } catch (e) {
        console.error('Failed to stringify value', e);
        throw new Error('Unsupported value type');
      }
    }
    
    memoryStore.set(key, valueToStore);
  }

  async delete(key: string): Promise<void> {
    memoryStore.delete(key);
  }

  // Additional methods required by KVNamespace interface
  async list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown>> {
    const keys = Array.from(memoryStore.keys())
      .filter(key => options?.prefix ? key.startsWith(options.prefix) : true)
      .map(name => ({ name }));
      
    return {
      keys: keys.slice(0, options?.limit ?? 1000),
      list_complete: true,
      cursor: '',
    };
  }

  // Additional methods to match CF KV
  async getWithMetadata(key: string, options?: KVNamespaceGetWithMetadataOptions<any>): Promise<KVNamespaceGetWithMetadataResult<any>> {
    const value = await this.get(key, options);
    return { value, metadata: null };
  }
}

// Create and export a default instance
const mockKV = new MockKV();
export default mockKV;
