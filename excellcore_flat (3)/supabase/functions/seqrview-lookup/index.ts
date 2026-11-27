// ExcellCore: live SeQRView lookup by mobile number (read only, nothing is stored).
// The MIS login stays here as function secrets, never in the browser.
// Secrets to set: MIS_USERNAME, MIS_PASSWORD   (optional: SEQRVIEW_BASE_URL)
const BASE = Deno.env.get('SEQRVIEW_BASE_URL') ?? 'https://dashboard.seqrview.com';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

let token = '', tokenAt = 0, pending: Promise<string> | null = null;
async function doLogin(): Promise<string> {
  const username = Deno.env.get('MIS_USERNAME'), password = Deno.env.get('MIS_PASSWORD');
  if (!username || !password) throw new Error('MIS_USERNAME / MIS_PASSWORD secrets are not set');
  const r = await fetch(`${BASE}/api/auth/token/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(`SeQRView login failed (${r.status})`);
  token = (await r.json()).access; tokenAt = Date.now();
  return token;
}
// One login at a time, token reused for 4 minutes
function login(force = false): Promise<string> {
  if (!force && token && Date.now() - tokenAt < 240000) return Promise.resolve(token);
  if (!pending) pending = doLogin().finally(() => { pending = null; });
  return pending;
}

const last10 = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(-10);
const STATUS: Record<string, string> = { ONBOARDED: 'Onboarded', NOT_ONBOARDED: 'Not Onboarded' };
const appStatus = (v: unknown) => {
  const k = String(v ?? '').trim().toUpperCase().replace(/[^A-Z]+/g, '_').replace(/^_+|_+$/g, '');
  return STATUS[k] ?? String(v ?? '');
};

// The portal's "q" parameter searches by number. Keep only the record whose mobile matches exactly.
async function find(mobile: string, retry = true): Promise<{ hit: any; keys: string[] }> {
  const t = await login();
  const r = await fetch(`${BASE}/api/operators/management/?q=${encodeURIComponent(mobile)}&page=1&page_size=10`,
    { headers: { Authorization: `Bearer ${t}` } });
  if (r.status === 401 && retry) { await login(true); return find(mobile, false); }
  if (!r.ok) throw new Error(`SeQRView search failed (${r.status})`);
  const j = await r.json(), rows: any[] = j.results ?? [];
  return { hit: rows.find((o) => last10(o.mobile) === mobile) ?? null, keys: rows[0] ? Object.keys(rows[0]) : [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { mobiles, debug } = await req.json();
    const list = [...new Set((mobiles ?? []).map(last10).filter((m: string) => m.length === 10))].slice(0, 50) as string[];
    const results: Record<string, unknown> = {};
    let keys: string[] = [];
    const queue = [...list];
    await Promise.all(Array.from({ length: 5 }, async () => {   // at most 5 searches at a time
      while (queue.length) {
        const m = queue.shift()!;
        try {
          const { hit, keys: k } = await find(m);
          if (k.length && !keys.length) keys = k;
          results[m] = hit ? {
            name: String(hit.name ?? ''), app_status: appStatus(hit.app_status), stage: String(hit.onboarding_stage ?? ''),
            age: String(hit.age ?? ''), onboarded_on: String(hit.onboarded_on ?? '').slice(0, 10),
          } : null;
        } catch (e) { results[m] = { error: String((e as Error).message) }; }
      }
    }));
    return reply({ results, ...(debug ? { keys } : {}) });
  } catch (e) { return reply({ error: String((e as Error).message) }, 400); }
});
