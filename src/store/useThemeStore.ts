import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'bibleland-theme';

interface ThemeState {
  mode: ThemeMode;
  /** Was tatsächlich auf dem Bildschirm zu sehen ist, `system` bereits aufgelöst. */
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  /** Schaltet zwischen hell und dunkel um und verlässt dabei `system`. */
  toggle: () => void;
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

function readStored(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function apply(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

const initialMode = readStored();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: resolve(initialMode),

  setMode: (mode) => {
    const resolved = resolve(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* Privater Modus o. Ä. — das Theme gilt dann nur für diese Sitzung. */
    }
    apply(resolved);
    set({ mode, resolved });
  },

  toggle: () => {
    get().setMode(get().resolved === 'dark' ? 'light' : 'dark');
  },
}));

/**
 * Folgt der Systemeinstellung, solange der Nutzer `system` gewählt hat.
 * Einmalig beim Start aufrufen.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().mode !== 'system') return;
    const resolved = prefersDark() ? 'dark' : 'light';
    apply(resolved);
    useThemeStore.setState({ resolved });
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
