import { ref, type Ref } from 'vue';

// Type definitions
interface Recording {
  id?: number;
  targetAudio: Blob;
  userAudio: Blob;
  timestamp: string;
}

interface UseIndexedDBReturn {
  initDB: () => Promise<boolean>;
  addRecording: (targetBlob: Blob, userBlob: Blob) => Promise<number>;
  getRecordings: () => Promise<Recording[]>;
  deleteRecording: (id: number) => Promise<boolean>;
  dbReady: Ref<boolean>;
}

const DB_NAME = 'EchoLingoDB';
const DB_VERSION = 1;
const RECORDINGS_STORE_NAME = 'recordings';

let db: IDBDatabase | null = null;
const dbReady: Ref<boolean> = ref(false);

function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (db) {
      dbReady.value = true;
      resolve(true);
      return;
    }

    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(RECORDINGS_STORE_NAME)) {
        database.createObjectStore(RECORDINGS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
      dbReady.value = true;
      resolve(true);
    };

    request.onerror = (event: Event) => {
      const errorCode = (event.target as IDBOpenDBRequest).error?.message || 'Unknown error';
      console.error('IndexedDB error:', errorCode);
      reject(errorCode);
    };
  });
}

async function addRecording(targetBlob: Blob, userBlob: Blob): Promise<number> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject('Database not initialized');
      return;
    }

    const transaction: IDBTransaction = db.transaction([RECORDINGS_STORE_NAME], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore(RECORDINGS_STORE_NAME);
    const recording: Omit<Recording, 'id'> = {
      targetAudio: targetBlob,
      userAudio: userBlob,
      timestamp: new Date().toISOString(),
    };
    const request: IDBRequest = store.add(recording);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = (event: Event) => {
      const errorCode = (event.target as IDBRequest).error?.message || 'Unknown error';
      console.error('Error adding recording:', errorCode);
      reject(errorCode);
    };
  });
}

async function getRecordings(): Promise<Recording[]> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject('Database not initialized');
      return;
    }

    const transaction: IDBTransaction = db.transaction([RECORDINGS_STORE_NAME], 'readonly');
    const store: IDBObjectStore = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request: IDBRequest = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Recording[]);
    };

    request.onerror = (event: Event) => {
      const errorCode = (event.target as IDBRequest).error?.message || 'Unknown error';
      console.error('Error getting recordings:', errorCode);
      reject(errorCode);
    };
  });
}

async function deleteRecording(id: number): Promise<boolean> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject('Database not initialized');
      return;
    }

    const transaction: IDBTransaction = db.transaction([RECORDINGS_STORE_NAME], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request: IDBRequest = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event: Event) => {
      const errorCode = (event.target as IDBRequest).error?.message || 'Unknown error';
      console.error('Error deleting recording:', errorCode);
      reject(errorCode);
    };
  });
}

export function useIndexedDB(): UseIndexedDBReturn {
  return {
    initDB,
    addRecording,
    getRecordings,
    deleteRecording,
    dbReady,
  };
}