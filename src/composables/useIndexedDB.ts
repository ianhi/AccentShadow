
import { ref } from 'vue';

const DB_NAME = 'AccentShadowDB';
const DB_VERSION = 1;
const RECORDINGS_STORE_NAME = 'recordings';

let db: IDBDatabase | null = null;
const dbReady = ref(false);

function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (db) {
      dbReady.value = true;
      resolve(true);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      const database = target.result;
      if (!database.objectStoreNames.contains(RECORDINGS_STORE_NAME)) {
        database.createObjectStore(RECORDINGS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      db = target.result;
      dbReady.value = true;
      resolve(true);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('IndexedDB error:', target.error);
      reject(target.error);
    };
  });
}

async function addRecording(targetBlob: Blob, userBlob: Blob): Promise<any> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([RECORDINGS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE_NAME);
    const recording = {
      targetAudio: targetBlob,
      userAudio: userBlob,
      timestamp: new Date().toISOString(),
    };
    const request = store.add(recording);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error adding recording:', target.error);
      reject(target.error);
    };
  });
}

async function getRecordings(): Promise<any[]> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([RECORDINGS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error getting recordings:', target.error);
      reject(target.error);
    };
  });
}

async function deleteRecording(id: string | number): Promise<boolean> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([RECORDINGS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error deleting recording:', target.error);
      reject(target.error);
    };
  });
}

export function useIndexedDB() {
  return {
    initDB,
    addRecording,
    getRecordings,
    deleteRecording,
    dbReady,
  };
}
