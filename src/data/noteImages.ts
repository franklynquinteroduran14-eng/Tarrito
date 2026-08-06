import type { ImageSourcePropType } from 'react-native';

export interface NoteImage {
  source: ImageSourcePropType;
  width: number;
  height: number;
}

export const NOTE_IMAGES: Record<string, NoteImage> = {
  'uranoxneptune.jpg': {
    source: require('../../assets/images/notes/uranoxneptune.jpg'),
    width: 736,
    height: 1182,
  },
  'ventana.png': {
    source: require('../../assets/images/notes/ventana.png'),
    width: 1366,
    height: 768,
  },
  'acuario.png': {
    source: require('../../assets/images/notes/acuario.png'),
    width: 1366,
    height: 768,
  },
};
