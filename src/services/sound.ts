import { Audio } from 'expo-av';
import Storage from 'expo-sqlite/kv-store';

const SOUNDS_ENABLED_KEY = 'sound_effects_enabled';

let soundsEnabled = true;
let popSound: Audio.Sound | null = null;
let chimeSound: Audio.Sound | null = null;

export async function isSoundEffectsEnabled(): Promise<boolean> {
  const stored = await Storage.getItem(SOUNDS_ENABLED_KEY);
  return stored !== 'false';
}

export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  soundsEnabled = enabled;
  await Storage.setItem(SOUNDS_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function loadSoundEffects(): Promise<void> {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  soundsEnabled = await isSoundEffectsEnabled();

  const { sound: pop } = await Audio.Sound.createAsync(require('../../assets/sounds/pop.wav'));
  const { sound: chime } = await Audio.Sound.createAsync(require('../../assets/sounds/chime.wav'));
  popSound = pop;
  chimeSound = chime;
}

async function play(sound: Audio.Sound | null): Promise<void> {
  if (!sound || !soundsEnabled) {
    return;
  }
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // El audio nunca debe interrumpir la experiencia del tarro.
  }
}

export function playPop(): void {
  void play(popSound);
}

export function playChime(): void {
  void play(chimeSound);
}
