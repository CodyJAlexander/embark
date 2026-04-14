import { useEffect } from 'react';
import { isTauri } from '../lib/platform';

/**
 * Listens for Tauri deep link events (embark://view/...) and dispatches
 * the existing embark:navigate custom event so App.tsx picks it up.
 *
 * URL format: embark://<view>  e.g. embark://clients, embark://dashboard
 */
export function useDeepLinks() {
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;

    async function setup() {
      try {
        const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
        unlisten = await onOpenUrl((urls) => {
          for (const url of urls) {
            try {
              // Parse embark://view or embark://view/extra
              const parsed = new URL(url);
              const view = parsed.hostname || parsed.pathname.replace(/^\/+/, '');
              if (view) {
                window.dispatchEvent(
                  new CustomEvent('embark:navigate', { detail: { view } })
                );
              }
            } catch {
              // Ignore malformed URLs
            }
          }
        });
      } catch {
        // Plugin not available — running in browser
      }
    }

    setup();

    return () => {
      unlisten?.();
    };
  }, []);
}
