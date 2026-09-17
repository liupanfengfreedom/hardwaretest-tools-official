const DB_NAME = 'starryring-background-remover';
const STORE_NAME = 'recent-images';
const DB_VERSION = 1;
const MAX_ITEMS = 12;
const MAX_BYTES = 80 * 1024 * 1024;

const requestResult = request => new Promise((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), { once: true });
  request.addEventListener('error', () => reject(request.error), { once: true });
});

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      if (request.result.objectStoreNames.contains(STORE_NAME)) return;
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const completion = new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve, { once: true });
      transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
      transaction.addEventListener('error', () => reject(transaction.error), { once: true });
    });
    const result = await action(transaction.objectStore(STORE_NAME));
    await completion;
    return result;
  } finally {
    database.close();
  }
}

async function contentId(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest).subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function listRecentImages() {
  const records = await withStore('readonly', store => requestResult(store.getAll()));
  return records.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveRecentImage({ blob, thumbnail, name, width, height }) {
  const record = {
    id: await contentId(blob),
    name: name || '未命名图片.png',
    type: blob.type || 'image/png',
    width,
    height,
    blob,
    thumbnail: thumbnail || blob,
    byteSize: blob.size + (thumbnail?.size || 0),
    updatedAt: Date.now()
  };

  await withStore('readwrite', async store => {
    await requestResult(store.put(record));
    const records = (await requestResult(store.getAll())).sort((a, b) => b.updatedAt - a.updatedAt);
    let bytes = 0;
    for (let index = 0; index < records.length; index += 1) {
      const recordBytes = records[index].byteSize || records[index].blob?.size || 0;
      bytes += recordBytes;
      if (index >= MAX_ITEMS || (index > 0 && bytes > MAX_BYTES)) {
        store.delete(records[index].id);
        bytes -= recordBytes;
      }
    }
  });
  return record;
}

export async function deleteRecentImage(id) {
  await withStore('readwrite', store => requestResult(store.delete(id)));
}

export async function clearRecentImages() {
  await withStore('readwrite', store => requestResult(store.clear()));
}
