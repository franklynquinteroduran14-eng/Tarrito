import Storage from 'expo-sqlite/kv-store';

export interface SpecialEvent {
  date: string;
  title: string;
  homeBannerMessage: string;
  notificationMessage: string;
}

const SIMULATED_EVENT_KEY = 'simulated_event_date';

export const specialEvents: SpecialEvent[] = [
  {
    date: '02-14',
    title: 'Día de San Valentín',
    homeBannerMessage: '¡Feliz Día de San Valentín! 💖',
    notificationMessage: 'Hoy es un día especial para recordarte lo mucho que te amo 🌹',
  },
  {
    date: '29-02',
    title: 'Aniversario',
    homeBannerMessage: '¡Aniversario del Día que nos Conocimos! :3 🩷',
    notificationMessage: 'El día que un chico de informática, le habló a una chica linda de industrial 🌸',
  },
  {
    date: '04-13',
    title: 'Día Internacional del Beso',
    homeBannerMessage: '¡Feliz Día Internacional del Beso! 💋',
    notificationMessage: 'Hoy te debo un beso muy especial :3',
  },
  {
    date: '05-01',
    title: 'Día del Amor de Pareja',
    homeBannerMessage: '¡Feliz Día del Amor de Pareja! 💕',
    notificationMessage: 'Gracias por ser la mejor compañera de vida, Te amo ✨',
  },
  {
    date: '08-01',
    title: 'Día de la Novia',
    homeBannerMessage: '¡Feliz Día de la Novia! 🩷',
    notificationMessage: 'Un recordatorio especial para la novia más hermosa del mundo mundial 🌸',
  },
  {
    date: '09-20',
    title: 'Día del Novio',
    homeBannerMessage: '¡Feliz Día del Novio! 💙',
    notificationMessage: 'Hoy me toca celebrar que soy muy afortunado a tu lado :3',
  },
  {
    date: '09-21',
    title: 'Día de las Flores Amarillas',
    homeBannerMessage: '¡Hoy es Día de Flores Amarillas! 💛🌻',
    notificationMessage: 'Un detalle amarillo para alegrarte el día 🌼',
  },
  {
    date: '10-03',
    title: 'Día Nacional del Novio',
    homeBannerMessage: '¡Feliz Día Nacional del Novio! ✨',
    notificationMessage: 'Un día más para celebrar nuestro amor ❤️',
  },
  {
    date: '10-16',
    title: 'Cumpleaños de Salomé',
    homeBannerMessage: '¡Feliz Cumpleaños Mi Vida :D!',
    notificationMessage: '¡Feliz Cumpleaños Mi Salomé Guzmán! 🌹',
  },
  {
    date: '12-31',
    title: 'Fin de Año',
    homeBannerMessage: '¡Gracias por otro año juntos! ✨',
    notificationMessage: 'Un año más a tu lado y los que nos faltan mi amor 🥂',
  },
  {
    date: '01-01',
    title: 'Año Nuevo',
    homeBannerMessage: '✨ ¡Feliz año nuevo! ✨',
    notificationMessage: 'Espero este año podamos seguir creciendo juntos mi amor, siempre juntos ❤️',
  },
  {
    date: '00-00',
    title: 'Nuestro Aniversario',
    homeBannerMessage: '¡Feliz Aniversario Mi Amor! 🥂',
    notificationMessage: 'Hoy celebramos otro año de nosotros, te amo ❤️',
  },
];

export function getTodayEvent(date: Date = new Date()): SpecialEvent | null {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  const directMatch = specialEvents.find((event) => event.date === key);
  if (directMatch) {
    return directMatch;
  }
  const year = date.getFullYear();
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (!isLeapYear && key === '03-01') {
    return specialEvents.find((event) => event.date === '29-02') ?? null;
  }
  return null;
}

export async function getSimulatedEventDate(): Promise<string | null> {
  return Storage.getItem(SIMULATED_EVENT_KEY);
}

export async function setSimulatedEventDate(date: string | null): Promise<void> {
  if (date === null) {
    await Storage.removeItem(SIMULATED_EVENT_KEY);
  } else {
    await Storage.setItem(SIMULATED_EVENT_KEY, date);
  }
}

export async function getSimulatedEvent(date: Date = new Date()): Promise<SpecialEvent | null> {
  const simulated = await Storage.getItem(SIMULATED_EVENT_KEY);
  if (simulated) {
    return specialEvents.find((event) => event.date === simulated) ?? null;
  }
  return getTodayEvent(date);
}
