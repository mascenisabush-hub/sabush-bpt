import { CurrencyOption } from '../types';

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'MZN', symbol: 'MT', label: 'MZN (MT)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$)' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR (R)' },
];

export function formatCurrency(amount: number, symbol: string = 'MT'): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  const parts = absVal.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];

  const formattedNumber = `${integerPart},${decimalPart}`;
  const currSymbol = symbol || 'MT';

  return isNegative ? `-${formattedNumber} ${currSymbol}` : `${formattedNumber} ${currSymbol}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(dateString).toLocaleDateString('pt-PT');
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

