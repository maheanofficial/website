import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

try {
  console.log("Mounting React Root...");
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* Show Maintenance Page ONLY in Production, otherwise show App */}
      <App />
    </StrictMode>,
  )
  // App-wide debug overlay to help diagnose blank screens in dev
  if (import.meta.env.DEV) {
    try {
      const dbg = document.createElement('div');
      dbg.id = 'app-debug-overlay';
      dbg.style.position = 'fixed';
      dbg.style.left = '10px';
      dbg.style.bottom = '10px';
      dbg.style.zIndex = '99999';
      dbg.style.background = 'rgba(0,0,0,0.7)';
      dbg.style.color = '#fff';
      dbg.style.padding = '8px 10px';
      dbg.style.borderRadius = '8px';
      dbg.style.fontSize = '12px';
      dbg.style.fontFamily = 'sans-serif';
      dbg.innerText = 'App mounted — fetching session...';
      document.body.appendChild(dbg);

      const update = async () => {
        const pathname = location.pathname + location.search + location.hash;
        let sessionText = 'no-session';
        try {
          const { data: { session } } = await supabase.auth.getSession();
          sessionText = session?.user?.email || session?.user?.id || (session ? 'signed-in' : 'no-session');
        } catch (e) {
          sessionText = 'err';
        }
        dbg.innerText = `Mounted | path: ${pathname} | session: ${sessionText}`;
      };

      update();
      const t = setInterval(update, 1500);

      // show global errors in overlay
      window.addEventListener('error', (ev) => {
        dbg.innerText = `ERROR: ${ev.message}`;
        console.error('Global error captured:', ev.error || ev.message);
      });

      // keep overlay while app alive
      (window as any).__appDebugInterval = t;
    } catch (e) {
      console.warn('Failed to add debug overlay', e);
    }
  }
} catch (e) {
  document.body.innerHTML = `<div style="color:red; padding:20px; font-size:20px;">
    <h1>Application Failed to Start</h1>
    <pre>${e instanceof Error ? e.message + '\n' + e.stack : JSON.stringify(e)}</pre>
  </div>`;
  console.error("Critical Main Error:", e);
}
