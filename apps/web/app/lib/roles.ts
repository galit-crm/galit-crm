export function normalizeRole(role: string | null | undefined): string {
  const raw = String(role ?? '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .replace(/^ROLE[_\s-]*/i, '');
  return raw.toUpperCase();
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'ADMIN';
}
