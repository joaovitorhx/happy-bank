/**
 * Sons e haptics. Respeita configuração do usuário e autoplay (só toca após primeira interação).
 * coin.mp3 e whoosh.mp3 em public/sounds/.
 * Compatível com iOS/Safari e Android (incl. Samsung): unlock no primeiro toque e uso de
 * new Audio() por reprodução para evitar falhas em dispositivos que reutilizam elementos.
 */

import { getSettingsSound, getSettingsHaptics } from '@/lib/storage';

let userHasInteracted = false;
let audioUnlocked = false;

const COIN_SRC = '/sounds/coin.mp3';
const WHOOSH_SRC = '/sounds/whoosh.mp3';

/** Garante que um Audio toque. Em Android/Samsung, new Audio() por play é mais confiável que reutilizar elemento. Espera canplay quando necessário. */
function playAudioOnce(src: string, volume = 0.8): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };
    try {
      const a = new Audio(src);
      a.volume = volume;
      a.preload = 'auto';
      a.load();

      const tryPlay = () => {
        if (settled) return;
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => finish()).catch((e) => finish(e));
        } else {
          finish();
        }
      };

      if (a.readyState >= 3) {
        tryPlay();
      } else {
        const onReady = () => {
          a.removeEventListener('canplaythrough', onReady);
          a.removeEventListener('canplay', onReady);
          a.removeEventListener('error', onErr);
          tryPlay();
        };
        const onErr = () => {
          a.removeEventListener('canplaythrough', onReady);
          a.removeEventListener('canplay', onReady);
          a.removeEventListener('error', onErr);
          finish(new Error('audio load error'));
        };
        a.addEventListener('canplaythrough', onReady);
        a.addEventListener('canplay', onReady);
        a.addEventListener('error', onErr);
        setTimeout(() => {
          if (!settled && a.readyState > 0) tryPlay();
        }, 500);
      }
    } catch (err) {
      finish(err);
    }
  });
}

/** Desbloqueia os áudios no primeiro toque (obrigatório em iOS/Android). Toca em volume 0 para não ouvir na entrada. */
function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const noSound = 0;
  Promise.all([
    playAudioOnce(COIN_SRC, noSound),
    playAudioOnce(WHOOSH_SRC, noSound),
  ]).catch(() => {});
  try {
    const coin = document.getElementById('sound-coin') as HTMLAudioElement | null;
    const whoosh = document.getElementById('sound-whoosh') as HTMLAudioElement | null;
    [coin, whoosh].forEach((el) => {
      if (!el?.src) return;
      const prev = el.volume;
      el.volume = 0;
      el.play().then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = prev;
      }).catch(() => { el.volume = prev; });
    });
  } catch {
    // Ignore unlock errors (e.g. DOM elements missing)
  }
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

/** Toca som de envio (whoosh). Usa new Audio() por play para máxima compatibilidade com Android/Samsung. */
export function playSendSound(): void {
  if (!canPlaySound()) return;
  playAudioOnce(WHOOSH_SRC).catch(() => {
    try {
      const ctx = getResumedAudioContext();
      if (!ctx) return;
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
    } catch {
      // Fallback whoosh falhou; ignorar
    }
  });
}

/** Toca som de recebimento (coin). Usa new Audio() por play para máxima compatibilidade com Android/Samsung. */
export function playReceiveSound(): void {
  if (!canPlaySound()) return;
  playAudioOnce(COIN_SRC).catch(() => {
    try {
      const ctx = getResumedAudioContext();
      if (!ctx) return;
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
    } catch {
      // Fallback coin falhou; ignorar
    }
  });
}

/** Retorna AudioContext resumido (em Android pode iniciar suspended). */
function getResumedAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch {
    // AudioContext não suportado ou bloqueado
    return null;
  }
}

/** Vibração curta no confirmar (se permitido). */
export function triggerConfirmHaptic(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(15);
  } catch {
    // Vibrate não suportado ou bloqueado
  }
}
