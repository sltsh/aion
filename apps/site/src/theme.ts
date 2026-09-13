export const THEME_STORAGE_KEY = 'aion-site-theme';

export type Theme = 'dark' | 'light';

export interface ThemeEnvironment {
  readonly root: HTMLElement;
  readonly control: HTMLFieldSetElement | null;
  readonly inputs: Iterable<HTMLInputElement>;
  readonly media: MediaQueryList;
  readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly updateAssets: (theme: Theme) => void;
}

export const syncFavicons = (icons: Iterable<HTMLLinkElement>, theme: Theme): void => {
  for (const icon of icons) icon.media = icon.dataset['themeFavicon'] === theme ? 'all' : 'not all';
};

const isTheme = (value: string | null): value is Theme => value === 'dark' || value === 'light';

export const readTheme = (storage: Pick<Storage, 'getItem'> | null): Theme | undefined => {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isTheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

export const resolveTheme = (saved: Theme | undefined, systemIsLight: boolean): Theme =>
  saved ?? (systemIsLight ? 'light' : 'dark');

export const themeBootstrap = (): string => `<script>(function(){function set(theme){document.documentElement.dataset.theme=theme;document.querySelectorAll('link[data-theme-favicon]').forEach(function(link){link.media=link.getAttribute('data-theme-favicon')===theme?'all':'not all'})}try{var key='${THEME_STORAGE_KEY}',saved;try{saved=localStorage.getItem(key)}catch(e){}set(saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){set(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}})();</script>`;

export function initializeTheme(environment: ThemeEnvironment): () => void {
  let explicit = readTheme(environment.storage);
  const inputs = [...environment.inputs];

  const apply = (theme: Theme): void => {
    environment.root.dataset.theme = theme;
    environment.updateAssets(theme);
    for (const input of inputs) input.checked = input.value === theme;
    if (environment.control) environment.control.hidden = false;
  };

  const setExplicitTheme = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input || !isTheme(input.value)) return;
    const next = input.value;
    explicit = next;
    try {
      environment.storage?.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Switching remains local to the current document when storage is unavailable.
    }
    apply(next);
  };

  const onSystemChange = (event: MediaQueryListEvent): void => {
    if (explicit === undefined) apply(event.matches ? 'light' : 'dark');
  };

  apply(resolveTheme(explicit, environment.media.matches));
  for (const input of inputs) input.addEventListener('click', setExplicitTheme);
  environment.media.addEventListener('change', onSystemChange);

  return () => {
    for (const input of inputs) input.removeEventListener('click', setExplicitTheme);
    environment.media.removeEventListener('change', onSystemChange);
  };
}
