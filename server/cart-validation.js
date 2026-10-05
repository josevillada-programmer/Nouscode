export const MAX_ITEM_QUANTITY = 10;

export function validateCartUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'El cuerpo de la solicitud no es válido.' };
  }

  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > MAX_ITEM_QUANTITY) {
    return { valid: false, message: 'La cantidad debe ser un número entero entre 1 y 10.' };
  }

  if (!Number.isSafeInteger(body.nivel_servicio_id) || body.nivel_servicio_id < 1) {
    return { valid: false, message: 'Selecciona un nivel de servicio válido.' };
  }

  return {
    valid: true,
    quantity: body.quantity,
    nivelServicioId: body.nivel_servicio_id
  };
}