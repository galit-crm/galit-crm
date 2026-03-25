/**
 * Remaps hardcoded http://localhost:3001 API calls to NEXT_PUBLIC_API_URL in production.
 * Must run at module load (before any React useEffect) so child components' effects
 * still hit the deployed API — React 18 runs child useEffects before parent useEffects.
 */
'use client';

function install() {
  if (typeof window === 'undefined') return;

  const w = window as Window & { __galitCrmOriginalFetch__?: typeof fetch };
  if (!w.__galitCrmOriginalFetch__) {
    w.__galitCrmOriginalFetch__ = w.fetch.bind(w);
  }
  const originalFetch = w.__galitCrmOriginalFetch__;

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  w.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.toString()
            : typeof input === 'string'
              ? input
              : (input as { url?: string })?.url;

      if (typeof url === 'string' && url.startsWith('http://localhost:3001')) {
        const path = url.replace('http://localhost:3001', '');
        const nextUrl = `${apiBaseUrl}${path}`;

        if (input instanceof Request) {
          const nextReq = new Request(nextUrl, input);
          return originalFetch(nextReq, init);
        }

        return originalFetch(nextUrl, init);
      }
    } catch {
      // best-effort: fall through to original fetch
    }

    return originalFetch(input as RequestInfo | URL, init);
  };
}

install();
