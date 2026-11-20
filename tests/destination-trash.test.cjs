const assert = require('node:assert/strict');
const test = require('node:test');
const loadTypeScript = require('./load-typescript.cjs');

function setup({ row = { id: 'id', name: 'Example', deleted_at: '2026-01-01T00:00:00Z' }, rpcRows = [], rpcError = null } = {}) {
  const calls = { rpc: [], audit: [], updates: 0 };
  const db = {
    from(table) {
      assert.equal(table, 'destinations');
      return {
        select: () => ({ eq: () => ({ limit: async () => ({ data: row ? [row] : [] }) }) }),
        update: () => { calls.updates++; throw new Error('Unexpected update'); },
      };
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { data: rpcRows, error: rpcError };
    },
  };
  const handler = loadTypeScript('pages/api/admin/destinations/[id].ts', {
    '../../../../lib/supabaseAdmin': { __esModule: true, default: () => db },
    '../../../../lib/auth': { verifyAdmin: async () => ({ id: null, email: 'admin@example.test' }) },
    '../../../../lib/audit': { logAudit: async (entry) => calls.audit.push(entry) },
    '../../../../lib/destinationCoordinates': { isDestinationCoordinates: () => true },
    '../../../../lib/destinations': { enrichDestination: (destination) => destination },
    '../../../../lib/destinationEnrichment': {},
  }).default;
  const invoke = async (method, body = {}, extraQuery = {}) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
    };
    await handler({ method, body, query: { id: 'id', ...extraQuery } }, response);
    return response;
  };
  return { calls, invoke };
}

test('delete moves a destination to trash instead of permanently deleting it', async () => {
  const { calls, invoke } = setup({ rpcRows: [{ id: 'id', name: 'Example' }] });
  const response = await invoke('DELETE');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls.rpc, [{ name: 'trash_destination', args: { destination_id: 'id' } }]);
  assert.equal(calls.audit[0].action, 'trash');
});

test('restore uses the database deadline and reports expired or missing destinations', async () => {
  const success = setup({ rpcRows: [{ id: 'id', name: 'Example', published: true }] });
  assert.equal((await success.invoke('PATCH', { action: 'restore' })).statusCode, 200);
  assert.equal(success.calls.rpc[0].name, 'restore_destination');
  assert.equal(success.calls.audit[0].action, 'restore');

  const expired = setup();
  assert.equal((await expired.invoke('PATCH', { action: 'restore' })).statusCode, 409);
  assert.equal(expired.calls.audit.length, 0);
});

test('trash database failures are returned rather than reported as success', async () => {
  const { invoke } = setup({ rpcError: { message: 'Migration required' } });
  const response = await invoke('DELETE');
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error, 'Migration required');
});

test('trashed destinations cannot be edited, published, or archived', async () => {
  const { calls, invoke } = setup();
  assert.equal((await invoke('GET')).statusCode, 404);
  assert.equal((await invoke('PUT', { published: true })).statusCode, 404);
  assert.equal((await invoke('DELETE', {}, { archive: 'true' })).statusCode, 404);
  assert.equal(calls.updates, 0);
});

test('remote destinations do not fall back to local seed data after deletion', async () => {
  const db = {
    from(table) {
      assert.equal(table, 'destinations');
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        in: () => query,
        limit: async () => ({ data: [], error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return query;
    },
  };
  const destinations = loadTypeScript('lib/destinations.ts', {
    './supabaseAdmin': { __esModule: true, default: () => db },
  });
  assert.equal(await destinations.getDestinationBySlug('boracay'), null);
  assert.deepEqual(await destinations.getPublishedDestinations(), []);
  assert.deepEqual(await destinations.getRelatedDestinations(['boracay']), []);
});
