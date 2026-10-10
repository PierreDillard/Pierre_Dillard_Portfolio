import { NextRequest } from 'next/server';

export function localAdminAllowed(request: NextRequest, write = false) {
  const requestHost = request.headers.get('host') || '';
  const host = requestHost.split(':')[0];
  if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1'].includes(host)) return false;
  if (write && request.headers.get('origin') !== `http://${requestHost}`) return false;
  return true;
}
