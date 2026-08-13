export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function parseSqliteUtc(value: string): Date {
  const normalized = value.replace(' ', 'T');
  return normalized.endsWith('Z') ? new Date(normalized) : new Date(`${normalized}Z`);
}

export function formatDate(sqliteDate: string): string {
  const date = new Date(sqliteDate.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return sqliteDate;
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTime(sqliteDate: string): string {
  const date = new Date(sqliteDate.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return sqliteDate;
  }
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
