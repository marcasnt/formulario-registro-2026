/**
 * Origen público del sitio (para armar URL del logo en /public/logo.png).
 * En Vercel: usa Host / X-Forwarded-* o la variable VERCEL_URL.
 */
export function getRequestOrigin(req) {
  const explicit = (process.env.LOGO_BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const proto = String(req.headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (host) return `${proto}://${host}`;

  if (process.env.VERCEL_URL) {
    return `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, '')}`;
  }

  return '';
}
