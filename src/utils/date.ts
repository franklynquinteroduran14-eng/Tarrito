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
