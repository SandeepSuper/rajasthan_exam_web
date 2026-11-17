import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Google script load failed')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** "Continue with Google" button. Hidden when VITE_GOOGLE_CLIENT_ID is not set. */
export function GoogleButton({ onToken }: { onToken: (idToken: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let alive = true;
    loadScript().then(() => {
      if (!alive || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: r => cb.current(r.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline', size: 'large', width: ref.current.offsetWidth || 360, text: 'continue_with', shape: 'rectangular',
      });
    }).catch(() => setFailed(true));
    return () => { alive = false; };
  }, []);

  if (!CLIENT_ID || failed) return null;
  return (
    <>
      <div className="divider">ya</div>
      <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
    </>
  );
}

export const googleEnabled = !!CLIENT_ID;
