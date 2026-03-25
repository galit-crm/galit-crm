/**
 * Single source of truth for API base URL.
 * NEXT_PUBLIC_API_URL is inlined at build time; fallback keeps local dev working without .env.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const base =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : 'http://localhost:3001';
  return base.replace(/\/$/, '');
}

/** Absolute URL for an API path (must start with `/`, may include query string). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${p}`;
}

/** מינימום לזיהוי משתמש מחובר ב-headers */
export type ApiAuthUser = {
  id: string;
  role: string;
};

export type ApiFetchOptions = RequestInit & {
  /**
   * משתמש מחובר — יישלחו x-user-id ו-x-user-role.
   * בלי authUser (או null) — לא נשלחים (למשל login ציבורי).
   */
  authUser?: ApiAuthUser | null;
};

function resolveApiUrl(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }
  return apiUrl(input.startsWith('/') ? input : `/${input}`);
}

function headersInitToObject(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h);
  }
  return { ...h };
}

/**
 * קריאת API אחידה: תמיד מוסיף Content-Type (JSON) כשאין FormData,
 * ו-x-user-role / x-user-id כשמועבר authUser.
 */
export function apiFetch(url: string, options?: ApiFetchOptions): Promise<Response> {
  const { authUser, headers: inputHeaders, body, ...rest } = options ?? {};

  const merged = headersInitToObject(inputHeaders);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (authUser?.id && authUser?.role) {
    merged['x-user-role'] = String(authUser.role).toUpperCase();
    merged['x-user-id'] = authUser.id;
  }

  if (!isFormData && merged['Content-Type'] === undefined && merged['content-type'] === undefined) {
    merged['Content-Type'] = 'application/json';
  }

  return fetch(resolveApiUrl(url), {
    ...rest,
    body,
    headers: merged,
  });
}
