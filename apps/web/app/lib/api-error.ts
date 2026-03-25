/** Parse NestJS / typical JSON error bodies into a short Hebrew-friendly message. */
export function parseApiErrorBody(text: string, status?: number): string {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return status ? `שגיאת שרת (${status})` : 'שגיאת שרת';
  }
  try {
    const j = JSON.parse(trimmed) as { message?: string | string[]; error?: string };
    if (Array.isArray(j.message)) {
      const m = j.message.filter(Boolean).join(' — ');
      if (m) return m;
    }
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
    if (typeof j.error === 'string' && j.error.trim()) return j.error.trim();
  } catch {
    /* not JSON */
  }
  if (trimmed.length > 280) {
    return status ? `שגיאת שרת (${status})` : 'שגיאת שרת';
  }
  return trimmed;
}

export async function parseApiErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  return parseApiErrorBody(text, res.status);
}
