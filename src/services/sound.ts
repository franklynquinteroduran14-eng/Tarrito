import { Audio } from 'expo-av';
import Storage from 'expo-sqlite/kv-store';

const SOUNDS_ENABLED_KEY = 'sound_effects_enabled';
const DRAW_SOUND_KEY = 'sound_fx_draw';
const OPEN_SOUND_KEY = 'sound_fx_open';
const VOLUME_KEY = 'sound_fx_volume';

export const SOUND_OPTIONS = [
  { id: 'chime', name: 'Campanita', icon: '🔔' },
  { id: 'pop', name: 'Pop fino', icon: '🫧' },
  { id: 'bell', name: 'Campana', icon: '🔕' },
  { id: 'musicbox', name: 'Cajita musical', icon: '🎵' },
  { id: 'bubble', name: 'Burbujas', icon: '🫧' },
  { id: 'drop', name: 'Gota de agua', icon: '💧' },
  { id: 'sparkle', name: 'Destellitos', icon: '✨' },
  { id: 'pluck', name: 'Punteo suave', icon: '🎸' },
  { id: 'tap', name: 'Toque fino', icon: '🤏' },
  { id: 'harp', name: 'Arpa', icon: '🎼' },
] as const;

export type SoundId = (typeof SOUND_OPTIONS)[number]['id'];

export interface SoundSettings {
  enabled: boolean;
  drawSound: SoundId;
  openSound: SoundId;
  volume: number;
}

const SOUND_FILES: Record<SoundId, number> = {
  chime: require('../../assets/sounds/chime.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  musicbox: require('../../assets/sounds/musicbox.wav'),
  bubble: require('../../assets/sounds/bubble.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  sparkle: require('../../assets/sounds/sparkle.wav'),
  pluck: require('../../assets/sounds/pluck.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  harp: require('../../assets/sounds/harp.wav'),
};

const DEFAULT_VOLUME = 1;

let settings: SoundSettings = {
  enabled: true,
  drawSound: 'bell',
  openSound: 'sparkle',
  volume: DEFAULT_VOLUME,
};

const soundCache = new Map<SoundId, Audio.Sound>();

async function loadSettings(): Promise<void> {
  const [enabled, drawSound, openSound, volume] = await Promise.all([
    Storage.getItem(SOUNDS_ENABLED_KEY),
    Storage.getItem(DRAW_SOUND_KEY),
    Storage.getItem(OPEN_SOUND_KEY),
    Storage.getItem(VOLUME_KEY),
  ]);
  settings.enabled = enabled !== 'false';
  if (drawSound && isSoundId(drawSound)) {
    settings.drawSound = drawSound;
  }
  if (openSound && isSoundId(openSound)) {
    settings.openSound = openSound;
  }
  const parsedVolume = Number(volume);
  if (Number.isFinite(parsedVolume) && parsedVolume > 0) {
    settings.volume = Math.min(1, parsedVolume);
  }
}

function isSoundId(value: string): value is SoundId {
  return SOUND_OPTIONS.some((option) => option.id === value);
}

async function getSound(id: SoundId): Promise<Audio.Sound | null> {
  const cached = soundCache.get(id);
  if (cached) {
    return cached;
  }
  try {
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[id]);
    await sound.setVolumeAsync(settings.volume);
    soundCache.set(id, sound);
    return sound;
  } catch {
    return null;
  }
}

async function playEffect(id: SoundId, force = false): Promise<void> {
  if (!settings.enabled && !force) {
    return;
  }
  const sound = await getSound(id);
  if (!sound) {
    return;
  }
  try {
    await sound.setStatusAsync({
      positionMillis: 0,
      shouldPlay: true,
      volume: settings.volume,
    });
  } catch {
    // El audio nunca debe interrumpir la experiencia del tarro.
  }
}

export async function loadSoundEffects(): Promise<void> {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  await loadSettings();
}

export async function getSoundSettings(): Promise<SoundSettings> {
  return { ...settings };
}

export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  settings.enabled = enabled;
  await Storage.setItem(SOUNDS_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function setDrawSound(id: SoundId): Promise<void> {
  settings.drawSound = id;
  await Storage.setItem(DRAW_SOUND_KEY, id);
}

export async function setOpenSound(id: SoundId): Promise<void> {
  settings.openSound = id;
  await Storage.setItem(OPEN_SOUND_KEY, id);
}

export async function setSoundVolume(volume: number): Promise<void> {
  settings.volume = volume;
  await Storage.setItem(VOLUME_KEY, String(volume));
}

export function playDraw(): void {
  void playEffect(settings.drawSound);
}

export function playOpen(): void {
  void playEffect(settings.openSound);
}

export function previewSound(id: SoundId): void {
  void playEffect(id, true);
}

const STARTUP_JINGLE = require('../../assets/sounds/inicio/NintendoDs_Sound.mp3');

export async function playStartupJingle(): Promise<number | null> {
  try {
    const { sound } = await Audio.Sound.createAsync(STARTUP_JINGLE);
    await sound.setVolumeAsync(1);
    await sound.playAsync();
    const status = await sound.getStatusAsync();
    sound.setOnPlaybackStatusUpdate((playbackStatus) => {
      if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
    return status.isLoaded && status.durationMillis != null ? status.durationMillis : null;
  } catch {
    return null;
  }
}
