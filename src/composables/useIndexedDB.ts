
import { ref } from 'vue';

const DB_NAME = 'AccentShadowDB';
const DB_VERSION = 1;
const SETTINGS_STORE_NAME = 'settings';
const STATISTICS_STORE_NAME = 'statistics';

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
      
      // Create settings store for app preferences
      if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        database.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'id' });
      }
      
      // Create statistics store for user analytics
      if (!database.objectStoreNames.contains(STATISTICS_STORE_NAME)) {
        database.createObjectStore(STATISTICS_STORE_NAME, { keyPath: 'id' });
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

// Settings management
async function saveSetting(key: string, value: any): Promise<void> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([SETTINGS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const setting = {
      id: key,
      value: value,
      updatedAt: new Date().toISOString(),
    };
    const request = store.put(setting);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error saving setting:', target.error);
      reject(target.error);
    };
  });
}

async function getSetting(key: string): Promise<any> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([SETTINGS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error getting setting:', target.error);
      reject(target.error);
    };
  });
}

// Statistics management
async function saveStatistic(key: string, value: any): Promise<void> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([STATISTICS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STATISTICS_STORE_NAME);
    const statistic = {
      id: key,
      value: value,
      updatedAt: new Date().toISOString(),
    };
    const request = store.put(statistic);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error saving statistic:', target.error);
      reject(target.error);
    };
  });
}

async function getStatistic(key: string): Promise<any> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([STATISTICS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(STATISTICS_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      console.error('Error getting statistic:', target.error);
      reject(target.error);
    };
  });
}

export function useIndexedDB() {
  return {
    initDB,
    saveSetting,
    getSetting,
    saveStatistic,
    getStatistic,
    dbReady,
  };
}
