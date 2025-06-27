
import { ref } from 'vue';

const DB_NAME = 'EchoLingoDB';
const DB_VERSION = 1;
const RECORDINGS_STORE_NAME = 'recordings';

let db = null;
const dbReady = ref(false);

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      dbReady.value = true;
      resolve(true);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(RECORDINGS_STORE_NAME)) {
        db.createObjectStore(RECORDINGS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      dbReady.value = true;
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

async function addRecording(targetBlob, userBlob) {
  await initDB();
  return new Promise((resolve, reject) => {
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

    request.onerror = (event) => {
      console.error('Error adding recording:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

async function getRecordings() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDINGS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error getting recordings:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

async function deleteRecording(id) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDINGS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Error deleting recording:', event.target.errorCode);
      reject(event.target.errorCode);
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
