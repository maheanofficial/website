import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import MaintenancePage from './components/MaintenancePage.tsx';

// Check if we are in production (Netlify) or simply NOT on localhost
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

try {
  console.log("Mounting React Root...");
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* Show Maintenance Page ONLY in Production, otherwise show App */}
      {isProduction ? <MaintenancePage /> : <App />}
    </StrictMode>,
  )
} catch (e) {
  document.body.innerHTML = `<div style="color:red; padding:20px; font-size:20px;">
    <h1>Application Failed to Start</h1>
    <pre>${e instanceof Error ? e.message + '\n' + e.stack : JSON.stringify(e)}</pre>
  </div>`;
  console.error("Critical Main Error:", e);
}
