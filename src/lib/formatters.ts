// Brazilian Real (BRL) formatting utilities

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} bi`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')} mil`;
  }
  return formatCurrency(value);
}

export function getAmountLabel(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `${billions.toFixed(billions % 1 === 0 ? 0 : 1).replace('.', ',')} bilhões`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions % 1 === 0 ? 0 : 1).replace('.', ',')} milhões`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1).replace('.', ',')} mil`;
  }
  return '';
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
