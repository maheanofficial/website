import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// localStorage.clear(); // Temporary fix for bad data

try {
  console.log("Mounting React Root...");
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  document.body.innerHTML = `<div style="color:red; padding:20px; font-size:20px;">
    <h1>Application Failed to Start</h1>
    <pre>${e instanceof Error ? e.message + '\n' + e.stack : JSON.stringify(e)}</pre>
  </div>`;
  console.error("Critical Main Error:", e);
}
