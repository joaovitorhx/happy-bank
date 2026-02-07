/**
 * Autenticação anônima (guest) no Supabase e persistência de profile_id.
 */
import { supabase } from '@/lib/supabase';
import { setStoredProfileId } from '@/lib/storage';

/** Garante sessão anônima. Se já houver sessão, não faz nada. */
export async function initAnonymousSession(): Promise<void> {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    setStoredProfileId(session.user.id);
    return;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message || 'Falha ao iniciar sessão');
  if (data?.user?.id) setStoredProfileId(data.user.id);
}
