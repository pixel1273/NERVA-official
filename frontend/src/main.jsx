import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { syncPendingReports } from './data/offlineQueue'
import { createIncidentWithAI } from './data/api'

// Auto-sync pending reports when connectivity restores
window.addEventListener('online', async () => {
  try {
    const result = await syncPendingReports(createIncidentWithAI);
    if (result.synced > 0) {
      console.log(`[NERVA] Synced ${result.synced} offline report(s)`);
    }
  } catch (err) {
    console.error('[NERVA] Background sync failed:', err);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

