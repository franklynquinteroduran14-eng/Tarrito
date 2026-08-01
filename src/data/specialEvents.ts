export interface SpecialEvent {
  date: string;
  title: string;
  homeBannerMessage: string;
  notificationMessage: string;
}

export const specialEvents: SpecialEvent[] = [
  {
    date: '08-01',
    title: 'Día de la Novia',
    homeBannerMessage: 'Feliz Día a la Novia Más Hermosa 🩷',
    notificationMessage: 'Feliz Día de la Novia, mi amor 🩷',
  },
  {
    date: '10-16',
    title: 'Cumpleaños de Salomé',
    homeBannerMessage: 'Feliz Cumpleaños :D',
    notificationMessage: 'Feliz Cumpleaños Mi Salomé Guzmán 🌹',
  },
];

export function getTodayEvent(date: Date = new Date()): SpecialEvent | null {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  return specialEvents.find((event) => event.date === key) ?? null;
}
