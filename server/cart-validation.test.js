import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCartUpdate } from './cart-validation.js';

test('accepts the inclusive quantity boundaries', () => {
  assert.deepEqual(validateCartUpdate({ quantity: 1, nivel_servicio_id: 1 }), {
    valid: true,
    quantity: 1,
    nivelServicioId: 1
  });
  assert.equal(validateCartUpdate({ quantity: 10, nivel_servicio_id: 18 }).valid, true);
});

test('rejects quantities outside 1 to 10 and non-integers', () => {
  for (const quantity of [0, -1, 11, 1.5, '10', '999999999999999999999']) {
    assert.equal(validateCartUpdate({ quantity, nivel_servicio_id: 1 }).valid, false);
  }
});

test('rejects missing or invalid service level identifiers', () => {
  for (const nivel_servicio_id of [undefined, 0, -1, 1.5, '1']) {
    assert.equal(validateCartUpdate({ quantity: 1, nivel_servicio_id }).valid, false);
  }
});