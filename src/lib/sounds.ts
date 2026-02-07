/**
 * Sons e haptics. Respeita configuração do usuário e autoplay (só toca após primeira interação).
 * coin.mp3 e whoosh.mp3 em public/sounds/ — no mobile (iOS/Safari) o áudio precisa ser
 * "desbloqueado" com um play() dentro do primeiro toque do usuário.
 */

import { getSettingsSound, getSettingsHaptics } from '@/lib/storage';

let userHasInteracted = false;
let audioUnlocked = false;

const COIN_SRC = '/sounds/coin.mp3';
const WHOOSH_SRC = '/sounds/whoosh.mp3';

/** Desbloqueia os áudios no primeiro toque (obrigatório em iOS/mobile). */
function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const coin = document.getElementById('sound-coin') as HTMLAudioElement | null;
    const whoosh = document.getElementById('sound-whoosh') as HTMLAudioElement | null;
    const playThenPause = (el: HTMLAudioElement | null) => {
      if (!el?.src) return;
      const p = el.play();
      if (p?.then) {
        p.then(() => { el.pause(); el.currentTime = 0; }).catch(() => {});
      }
    };
    playThenPause(coin);
    playThenPause(whoosh);
  } catch {}
}

export function markUserInteracted(): void {
  userHasInteracted = true;
  unlockAudio();
}

function canPlaySound(): boolean {
  return userHasInteracted && getSettingsSound();
}

function canVibrate(): boolean {
  return userHasInteracted && getSettingsHaptics() && typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/** Toca som de envio (whoosh). */
export function playSendSound(): void {
  if (!canPlaySound()) return;
  try {
    const audio = document.getElementById('sound-whoosh') as HTMLAudioElement | null;
    if (audio?.src) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
  } catch {}
  try {
    const a = new Audio(WHOOSH_SRC);
    a.volume = 0.8;
    a.play().catch(() => {});
  } catch {}
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

/** Toca som de recebimento (coin) — usa public/sounds/coin.mp3. */
export function playReceiveSound(): void {
  if (!canPlaySound()) return;
  try {
    const audio = document.getElementById('sound-coin') as HTMLAudioElement | null;
    if (audio?.src) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
  } catch {}
  try {
    const a = new Audio(COIN_SRC);
    a.volume = 0.8;
    a.play().catch(() => {});
  } catch {}
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

/** Vibração curta no confirmar (se permitido). */
export function triggerConfirmHaptic(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(15);
  } catch {}
}
