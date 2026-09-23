const STATE_ID = 'global';

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function normalizeIp(value = '') {
  return String(value).split(',')[0].trim().replace(/^::ffff:/, '');
}

function ipToNumber(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((total, part) => total * 256 + Number(part), 0) >>> 0;
}

function cidrMatches(ip, cidr) {
  const [network, bitsText] = String(cidr).trim().split('/');
  const bits = bitsText === undefined ? 32 : Number(bitsText);
  const ipNumber = ipToNumber(ip);
  const networkNumber = ipToNumber(network);
  if (ipNumber === null || networkNumber === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

function allowedIp(request) {
  const cidrs = String(process.env.DASHBOARD_ALLOWED_CIDRS || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  if (!cidrs.length) return { ok: false, reason: 'DASHBOARD_ALLOWED_CIDRS is not configured' };
  const ip = normalizeIp(request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for'));
  return { ok: cidrs.some(cidr => cidrMatches(ip, cidr)), ip };
}

function validOrigin(request) {
  const configured = String(process.env.DASHBOARD_SITE_ORIGIN || '').replace(/\/$/, '');
  const origin = String(request.headers.get('origin') || '').replace(/\/$/, '');
  return !configured || !origin || configured === origin;
}

async function supabaseRequest(path, options = {}) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Supabase server credentials are not configured');
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      ...(options.headers || {})
    }
  });
}

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!validOrigin(request)) return json(403, { error: 'Invalid request origin' });
  const client = allowedIp(request);
  if (!client.ok) return json(403, { error: 'Company-network access only' });

  try {
    if (request.method === 'GET') {
      const response = await supabaseRequest(`dashboard_manual_state?id=eq.${STATE_ID}&select=payload,updated_at`);
      if (!response.ok) throw new Error(`Supabase GET ${response.status}`);
      const rows = await response.json();
      const row = rows[0];
      return json(200, { payload: row?.payload || null, updatedAt: row?.updated_at || null });
    }

    if (request.method === 'PUT') {
      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > 2_000_000) return json(413, { error: 'Manual state is too large' });
      const body = await request.json();
      if (!body?.payload || typeof body.payload !== 'object') return json(400, { error: 'payload is required' });
      const record = {
        id: STATE_ID,
        payload: body.payload,
        updated_by: String(body.payload.savedBy || 'Company Network User').slice(0, 160),
        updated_ip: client.ip || null,
        updated_at: new Date().toISOString()
      };
      const response = await supabaseRequest('dashboard_manual_state', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(record)
      });
      if (!response.ok) throw new Error(`Supabase PUT ${response.status}`);
      const rows = await response.json();
      return json(200, { updatedAt: rows[0]?.updated_at || record.updated_at });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('manual-state error', error);
    return json(503, { error: 'Manual state service is unavailable' });
  }
};
