/**
 * Persistência local (localStorage) para último código de sala e profile_id.
 */

const KEY_LAST_ROOM_CODE = 'banco_divertido_last_room_code';
const KEY_PROFILE_ID = 'banco_divertido_profile_id';

export function getStoredRoomCode(): string | null {
  try {
    return localStorage.getItem(KEY_LAST_ROOM_CODE);
  } catch {
    return null;
  }
}

export function setStoredRoomCode(code: string): void {
  try {
    localStorage.setItem(KEY_LAST_ROOM_CODE, code);
  } catch {
    // ignore
  }
}

export function clearStoredRoomCode(): void {
  try {
    localStorage.removeItem(KEY_LAST_ROOM_CODE);
  } catch {
    // ignore
  }
}

export function setStoredProfileId(profileId: string): void {
  try {
    localStorage.setItem(KEY_PROFILE_ID, profileId);
  } catch {
    // ignore
  }
}

export function getStoredProfileId(): string | null {
  try {
    return localStorage.getItem(KEY_PROFILE_ID);
  } catch {
    return null;
  }
}

// Settings (sound, animations, haptics)
const KEY_SETTINGS_SOUND = 'banco_divertido_sound';
const KEY_SETTINGS_ANIMATIONS = 'banco_divertido_animations';
const KEY_SETTINGS_HAPTICS = 'banco_divertido_haptics';

export function getSettingsSound(): boolean {
  try {
    const v = localStorage.getItem(KEY_SETTINGS_SOUND);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setSettingsSound(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_SETTINGS_SOUND, enabled ? '1' : '0');
  } catch {}
}

export function getSettingsAnimations(): boolean {
  try {
    const v = localStorage.getItem(KEY_SETTINGS_ANIMATIONS);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setSettingsAnimations(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_SETTINGS_ANIMATIONS, enabled ? '1' : '0');
  } catch {}
}

export function getSettingsHaptics(): boolean {
  try {
    const v = localStorage.getItem(KEY_SETTINGS_HAPTICS);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setSettingsHaptics(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_SETTINGS_HAPTICS, enabled ? '1' : '0');
  } catch {}
}
