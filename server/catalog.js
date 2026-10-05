export const products = {
  'plantilla-1': {
    name: 'Plantilla 1',
    image: 'plantilla1.jpeg',
    serviceLevels: [
      { id: 1, label: 'Básico', price: 2500 },
      { id: 2, label: 'Medio', price: 4000 },
      { id: 3, label: 'Avanzado', price: 6500 }
    ]
  },
  'plantilla-2': {
    name: 'Plantilla 2',
    image: 'plantilla2.jpeg',
    serviceLevels: [
      { id: 4, label: 'Básico', price: 2500 },
      { id: 5, label: 'Medio', price: 4000 },
      { id: 6, label: 'Avanzado', price: 6500 }
    ]
  },
  'plantilla-3': {
    name: 'Plantilla 3',
    image: 'plantilla3.jpeg',
    serviceLevels: [
      { id: 7, label: 'Básico', price: 5000 },
      { id: 8, label: 'Medio', price: 7500 },
      { id: 9, label: 'Avanzado', price: 11000 }
    ]
  },
  'plantilla-4': {
    name: 'Plantilla 4',
    image: 'plantilla4.jpeg',
    serviceLevels: [
      { id: 10, label: 'Básico', price: 7000 },
      { id: 11, label: 'Medio', price: 10500 },
      { id: 12, label: 'Avanzado', price: 15000 }
    ]
  },
  'plantilla-5': {
    name: 'Plantilla 5',
    image: 'plantilla5.jpeg',
    serviceLevels: [
      { id: 13, label: 'Básico', price: 1500 },
      { id: 14, label: 'Medio', price: 2500 },
      { id: 15, label: 'Avanzado', price: 4000 }
    ]
  },
  'plantilla-6': {
    name: 'Plantilla 6',
    image: 'plantilla6.jpeg',
    serviceLevels: [
      { id: 16, label: 'Básico', price: 4000 },
      { id: 17, label: 'Medio', price: 6500 },
      { id: 18, label: 'Avanzado', price: 10000 }
    ]
  }
};

function normalizeLevel(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function getServiceLevel(productId, value) {
  const levels = products[productId]?.serviceLevels || [];
  const numericId = Number(value);
  return levels.find((level) => level.id === numericId) || levels.find((level) => normalizeLevel(level.label) === normalizeLevel(value));
}