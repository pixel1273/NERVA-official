/**
 * Offline Queue — IndexedDB helper for saving field reports when offline.
 * Reports are stored locally and automatically synced when connectivity restores.
 */

const DB_NAME = 'nerva-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reports';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a report to the offline queue.
 * @param {Object} report - The report data (same shape as the API payload)
 * @returns {Promise<number>} The auto-generated queue ID
 */
export async function saveToOfflineQueue(report) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({
      ...report,
      queued_at: new Date().toISOString(),
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending (unsynced) reports from the queue.
 * @returns {Promise<Array>}
 */
export async function getPendingReports() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a report from the queue after successful sync.
 * @param {number} id - The queue entry's ID
 */
export async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the count of pending reports.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Try to sync all pending reports to the backend.
 * Called when connectivity is restored.
 * @param {Function} submitFn - The API function to call (e.g., createIncidentWithAI)
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function syncPendingReports(submitFn) {
  const pending = await getPendingReports();
  let synced = 0;
  let failed = 0;

  for (const report of pending) {
    try {
      const { id, queued_at, ...payload } = report;
      await submitFn(payload);
      await removeFromQueue(id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
