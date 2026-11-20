const assert = require('node:assert/strict');
const test = require('node:test');
const loadTypeScript = require('./load-typescript.cjs');

const head = { id: 'head', email: 'dot.admin@dotadmin.ph', emailConfirmed: true };
const sub = { id: 'sub', email: 'sub@example.test', app_metadata: { role: 'admin', extra: 'preserved' }, created_at: '2026-01-01T00:00:00Z' };
const disabled = (user) => user.app_metadata?.admin_access_disabled === true;

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
}

function setupAccounts({ admin = head, user = sub, updateError = null } = {}) {
  const updates = [];
  const audits = [];
  const db = { auth: { admin: {
    listUsers: async () => ({ data: { users: [user] }, error: null }),
    getUserById: async () => ({ data: { user }, error: null }),
    updateUserById: async (id, attributes) => { updates.push({ id, attributes }); return { error: updateError }; },
  } } };
  const handler = loadTypeScript('pages/api/admin/accounts.ts', {
    '../../../lib/supabaseAdmin': { __esModule: true, default: () => db },
    '../../../lib/auth': { verifyAdmin: async () => admin, isAdminAccountDisabled: disabled },
    '../../../lib/audit': { logAudit: async (event) => audits.push(event) },
  }).default;
  const invoke = async (method, body = {}) => {
    const res = response();
    await handler({ method, body }, res);
    return res;
  };
  return { invoke, updates, audits };
}

test('only the verified Supabase head account may delete or recover', async () => {
  for (const admin of [
    { id: null, email: head.email },
    { id: 'head', email: head.email, emailConfirmed: false },
    { id: 'sub', email: sub.email, emailConfirmed: true },
  ]) {
    const { invoke, updates } = setupAccounts({ admin });
    for (const action of ['delete', 'restore']) {
      assert.equal((await invoke('POST', { action, accountId: 'sub' })).statusCode, 403);
    }
    assert.equal(updates.length, 0);
  }
});

test('delete and recover preserve metadata and restore sign-in', async () => {
  const deleting = setupAccounts();
  assert.equal((await deleting.invoke('POST', { action: 'delete', accountId: 'sub' })).statusCode, 200);
  assert.deepEqual(deleting.updates[0], {
    id: 'sub',
    attributes: { app_metadata: { role: 'admin', extra: 'preserved', admin_access_disabled: true }, ban_duration: '876000h' },
  });
  assert.equal(deleting.audits[0].action, 'delete');
  const restoring = setupAccounts({ user: { ...sub, app_metadata: { ...sub.app_metadata, admin_access_disabled: true } } });
  assert.equal((await restoring.invoke('POST', { action: 'restore', accountId: 'sub' })).statusCode, 200);
  assert.equal(restoring.updates[0].attributes.ban_duration, 'none');
  assert.equal(restoring.updates[0].attributes.app_metadata.admin_access_disabled, false);
  assert.equal(restoring.audits[0].action, 'restore');
});

test('head, non-admin users, and separately banned accounts cannot be deleted', async () => {
  for (const user of [
    { ...sub, id: 'head', email: head.email },
    { ...sub, app_metadata: { role: 'customer' } },
    { ...sub, banned_until: '2999-01-01T00:00:00Z' },
  ]) {
    const { invoke, updates } = setupAccounts({ user });
    const res = await invoke('POST', { action: 'delete', accountId: user.id });
    assert.ok(res.statusCode === 403 || res.statusCode === 409);
    assert.equal(updates.length, 0);
  }
});

test('failed account updates are not reported as successful', async () => {
  const { invoke, audits } = setupAccounts({ updateError: { message: 'Update failed' } });
  const res = await invoke('POST', { action: 'delete', accountId: 'sub' });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Update failed');
  assert.equal(audits.length, 0);
});

test('an account also used for environment fallback cannot be disabled', async () => {
  const originalEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = sub.email;
  try {
    const { invoke, updates } = setupAccounts();
    assert.equal((await invoke('POST', { action: 'delete', accountId: 'sub' })).statusCode, 409);
    assert.equal(updates.length, 0);
  } finally {
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEmail;
  }
});

test('fallback cannot create the head account and cannot enable recovery controls', async () => {
  const { invoke } = setupAccounts({ admin: { id: null, email: head.email } });
  assert.equal((await invoke('GET')).body.canRecoverAccounts, false);
  assert.equal((await invoke('POST', { email: head.email, password: 'password123' })).statusCode, 400);
});

test('disabled and invalid Supabase sessions cannot fall back to a legacy cookie', async () => {
  const originalEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = head.email;
  try {
    for (const result of [
      { data: { user: { ...sub, app_metadata: { ...sub.app_metadata, admin_access_disabled: true } } }, error: null },
      { data: { user: null }, error: { message: 'Invalid token' } },
    ]) {
      const auth = loadTypeScript('lib/auth.ts', {
        './supabaseAdmin': { __esModule: true, default: () => ({ auth: { getUser: async () => result } }) },
      });
      assert.equal(await auth.verifyAdmin({ headers: { cookie: 'sb-access-token=token; admin_token=1' } }), null);
    }
  } finally {
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEmail;
  }
});

test('disabled accounts cannot log in or refresh even if Supabase returns a session', async () => {
  const session = { user: { ...sub, app_metadata: { ...sub.app_metadata, admin_access_disabled: true } }, access_token: 'access', refresh_token: 'refresh' };
  const db = { auth: {
    signInWithPassword: async () => ({ data: { session }, error: null }),
    refreshSession: async () => ({ data: { session }, error: null }),
  } };
  const auth = {
    isAdminAccountDisabled: disabled,
    setAdminSessionCookie: () => { throw new Error('Disabled account received a session'); },
    clearAdminSessionCookie: (res) => res.setHeader('cleared', true),
  };
  const mocks = {
    '../../../lib/supabaseAdmin': { __esModule: true, default: () => db },
    '../../../lib/auth': auth,
    '../../../lib/audit': { logAudit: async () => {} },
  };
  const login = loadTypeScript('pages/api/admin/login.ts', mocks).default;
  const refresh = loadTypeScript('pages/api/admin/refresh.ts', mocks).default;
  const loginRes = response();
  await login({ method: 'POST', body: { email: sub.email, password: 'password' } }, loginRes);
  assert.equal(loginRes.statusCode, 403);
  const refreshRes = response();
  await refresh({ method: 'POST', headers: { cookie: 'sb-refresh-token=refresh' } }, refreshRes);
  assert.equal(refreshRes.statusCode, 401);
  assert.equal(refreshRes.headers.cleared, true);
});
