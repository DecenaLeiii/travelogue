const assert = require('node:assert/strict');
const test = require('node:test');
const loadTypeScript = require('./load-typescript.cjs');

const coordinates = loadTypeScript('lib/destinationCoordinates.ts');

function setupHandler(file, before = { name: 'Destination', location: 'Old location', latitude: 10, longitude: 120, translations: { en: {} } }) {
  const calls = { geocode: 0, row: null };
  const db = {
    from(table) {
      assert.equal(table, 'destinations');
      return {
        select() { return { eq: () => ({ limit: async () => ({ data: [before] }) }) }; },
        insert(rows) {
          calls.row = rows[0];
          return { select: () => ({ limit: async () => ({ data: [rows[0]] }) }) };
        },
        update(row) {
          calls.row = row;
          return { eq: () => ({ select: () => ({ limit: async () => ({ data: [row] }) }) }) };
        },
      };
    },
  };
  const mocks = {
    '../../../../lib/supabaseAdmin': { __esModule: true, default: () => db },
    '../../../../lib/auth': { verifyAdmin: async () => ({ id: null, email: 'admin@example.test' }) },
    '../../../../lib/audit': { logAudit: async () => {} },
    '../../../../lib/destinationCoordinates': coordinates,
    '../../../../lib/destinations': { enrichDestination: (destination) => destination },
    '../../../../lib/destinationEnrichment': {
      TRANSLATION_TRIGGER_FIELDS: ['name', 'location'],
      geocodeDestination: async () => { calls.geocode++; return { latitude: 11, longitude: 121 }; },
      translateDestinationFields: async () => ({}),
    },
  };
  const handler = loadTypeScript(file, mocks).default;
  const invoke = async (method, body) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
    };
    await handler({ method, body, query: { id: 'destination-id' } }, response);
    return response;
  };
  return { calls, invoke };
}

test('coordinates require finite numbers within geographic bounds', () => {
  assert.equal(coordinates.isDestinationCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(coordinates.isDestinationCoordinates({ latitude: -90, longitude: 180 }), true);
  for (const value of [
    null, {}, { latitude: '14', longitude: 120 }, { latitude: 14 },
    { latitude: 91, longitude: 120 }, { latitude: 14, longitude: -181 },
    { latitude: NaN, longitude: Infinity },
  ]) {
    assert.equal(coordinates.isDestinationCoordinates(value), false);
  }
});

for (const [file, method] of [
  ['pages/api/admin/destinations/index.ts', 'POST'],
  ['pages/api/admin/destinations/[id].ts', 'PUT'],
]) {
  test(`${method} saves the selected pin without geocoding`, async () => {
    const { calls, invoke } = setupHandler(file);
    const response = await invoke(method, {
      name: 'Destination',
      location: 'New location',
      coordinates: { latitude: 20.45, longitude: 121.97 },
    });
    assert.equal(response.statusCode, method === 'POST' ? 201 : 200);
    assert.equal(calls.geocode, 0);
    assert.equal(calls.row.latitude, 20.45);
    assert.equal(calls.row.longitude, 121.97);
  });

  test(`${method} rejects incomplete or invalid pins`, async () => {
    const { calls, invoke } = setupHandler(file);
    const response = await invoke(method, { name: 'Destination', coordinates: { latitude: 14 } });
    assert.equal(response.statusCode, 400);
    assert.equal(calls.row, null);
    assert.equal(calls.geocode, 0);
  });

  test(`${method} retains automatic geocoding when no pin is supplied`, async () => {
    const { calls, invoke } = setupHandler(file);
    const response = await invoke(method, { name: 'Destination', location: 'New location' });
    assert.equal(response.statusCode, method === 'POST' ? 201 : 200);
    assert.equal(calls.geocode, 1);
    assert.equal(calls.row.latitude, 11);
    assert.equal(calls.row.longitude, 121);
  });
}
