/**
 * QR Pay: schema e validação para bankgame://pay e fallback HTTPS.
 */

export const QR_PAY_SCHEME = 'bankgame://pay';
export const QR_PAY_VERSION = 1;

export interface QrPayPayload {
  v: number;
  room: string;
  to: string;
  amount?: number;
  note?: string;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Valida e parseia URL de pagamento (bankgame:// ou https). Retorna payload ou null se inválido. */
export function parsePayUrl(url: string): QrPayPayload | null {
  try {
    const u = new URL(url);
    const isBankGame = u.protocol === 'bankgame:' && (u.hostname === 'pay' || u.pathname === '/pay');
    const isHttps = u.protocol === 'https:' && (u.pathname === '/pay' || u.pathname.endsWith('/pay'));
    if (!isBankGame && !isHttps) return null;

    const v = parseInt(u.searchParams.get('v') ?? '0', 10);
    const room = (u.searchParams.get('room') ?? '').trim().toUpperCase().slice(0, 6);
    const to = (u.searchParams.get('to') ?? '').trim();
    const amountStr = u.searchParams.get('amount');
    const amount = amountStr ? parseInt(amountStr, 10) : undefined;
    const note = u.searchParams.get('note')?.trim() || undefined;

    if (v !== QR_PAY_VERSION || !room || room.length !== 6 || !to || !isUuid(to)) return null;
    if (amount !== undefined && (Number.isNaN(amount) || amount < 0)) return null;

    return { v, room, to, amount, note };
  } catch {
    return null;
  }
}

/** Gera URL de pagamento (deep link + HTTPS fallback). */
export function buildPayUrl(params: {
  roomCode: string;
  toProfileId: string;
  amount?: number;
  note?: string;
}): { deepLink: string; httpsFallback: string } {
  const room = params.roomCode.trim().toUpperCase().slice(0, 6);
  const search = new URLSearchParams();
  search.set('v', String(QR_PAY_VERSION));
  search.set('room', room);
  search.set('to', params.toProfileId);
  if (params.amount != null && params.amount > 0) search.set('amount', String(params.amount));
  if (params.note) search.set('note', params.note);
  const qs = search.toString();
  const deepLink = `${QR_PAY_SCHEME}?${qs}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const httpsFallback = origin ? `${origin}/pay?${qs}` : deepLink;
  return { deepLink, httpsFallback };
}
