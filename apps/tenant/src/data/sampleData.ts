import { Product, StockBatch, Quebra, Expense } from '../types';
import { getTodayDateString } from '../utils/formatters';

const today = getTodayDateString();
// Generate dates 14 days ago, 7 days ago, 3 days ago, today
const d = new Date();

const daysAgo = (n: number) => {
  const past = new Date(d);
  past.setDate(past.getDate() - n);
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, '0');
  const day = String(past.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Leite Gordo 1L', createdAt: daysAgo(20) },
  { id: 'prod-2', name: 'Pão de Forma Artesanal', createdAt: daysAgo(18) },
  { id: 'prod-3', name: 'Café em Grão 500g', createdAt: daysAgo(15) },
  { id: 'prod-4', name: 'Sumo de Laranja 500ml', createdAt: daysAgo(10) },
];

export const INITIAL_BATCHES: StockBatch[] = [
  // Product 1: Leite Gordo 1L
  {
    id: 'batch-1a',
    productId: 'prod-1',
    dateEntered: daysAgo(18),
    quantity: 50,
    costPrice: 65,
    sellingPrice: 100,
    status: 'closed',
    createdAt: daysAgo(18),
  },
  {
    id: 'batch-1b',
    productId: 'prod-1',
    dateEntered: daysAgo(4),
    quantity: 60,
    costPrice: 70,
    sellingPrice: 110,
    status: 'open',
    createdAt: daysAgo(4),
  },

  // Product 2: Pão de Forma Artesanal
  {
    id: 'batch-2a',
    productId: 'prod-2',
    dateEntered: daysAgo(14),
    quantity: 30,
    costPrice: 90,
    sellingPrice: 150,
    status: 'closed',
    createdAt: daysAgo(14),
  },
  {
    id: 'batch-2b',
    productId: 'prod-2',
    dateEntered: daysAgo(2),
    quantity: 40,
    costPrice: 95,
    sellingPrice: 160,
    status: 'open',
    createdAt: daysAgo(2),
  },

  // Product 3: Café em Grão 500g
  {
    id: 'batch-3a',
    productId: 'prod-3',
    dateEntered: daysAgo(15),
    quantity: 20,
    costPrice: 350,
    sellingPrice: 550,
    status: 'closed',
    createdAt: daysAgo(15),
  },
  {
    id: 'batch-3b',
    productId: 'prod-3',
    dateEntered: daysAgo(5),
    quantity: 25,
    costPrice: 380,
    sellingPrice: 600,
    status: 'open',
    createdAt: daysAgo(5),
  },

  // Product 4: Sumo de Laranja 500ml
  {
    id: 'batch-4a',
    productId: 'prod-4',
    dateEntered: daysAgo(6),
    quantity: 30,
    costPrice: 50,
    sellingPrice: 90,
    status: 'open',
    createdAt: daysAgo(6),
  },
];

export const INITIAL_QUEBRAS: Quebra[] = [
  // Milk Batch 1a loss
  {
    id: 'quebra-1',
    batchId: 'batch-1a',
    productId: 'prod-1',
    date: daysAgo(10),
    quantityLost: 2,
    reason: 'Fora do prazo de validade',
    createdAt: daysAgo(10),
  },
  // Milk Batch 1b loss
  {
    id: 'quebra-2',
    batchId: 'batch-1b',
    productId: 'prod-1',
    date: daysAgo(1),
    quantityLost: 1,
    reason: 'Embalagem danificada no transporte',
    createdAt: daysAgo(1),
  },
  // Sourdough Batch 2a loss
  {
    id: 'quebra-3',
    batchId: 'batch-2a',
    productId: 'prod-2',
    date: daysAgo(8),
    quantityLost: 3,
    reason: 'Queda / Produto amassado',
    createdAt: daysAgo(8),
  },
  // Orange juice loss
  {
    id: 'quebra-4',
    batchId: 'batch-4a',
    productId: 'prod-4',
    date: daysAgo(3),
    quantityLost: 2,
    reason: 'Fuga na vedação da garrafa',
    createdAt: daysAgo(3),
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: daysAgo(12),
    description: 'Fatura de Eletricidade e Água',
    amount: 3500.00,
    category: 'Eletricidade',
    createdAt: daysAgo(12),
  },
  {
    id: 'exp-2',
    date: daysAgo(10),
    description: 'Renda da Loja',
    amount: 15000.00,
    category: 'Renda',
    createdAt: daysAgo(10),
  },
  {
    id: 'exp-3',
    date: daysAgo(3),
    description: 'Sacos de Embalagem e Etiquetas',
    amount: 1200.00,
    category: 'Embalagem',
    createdAt: daysAgo(3),
  },
];
