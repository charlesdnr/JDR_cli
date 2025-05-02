import { Injectable, signal, WritableSignal, computed, effect, DestroyRef, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal pour le mode de thème (follow, light, dark)
  public themeMode: WritableSignal<string> = signal('follow');

  // Signal pour tracker les préférences système (initialisé dans le constructeur)
  private systemPreference: WritableSignal<string>;

  // Signal calculé pour le thème effectif (ce qui est réellement appliqué)
  public effectiveTheme: ReturnType<typeof computed<string>>;

  private htmlElement: HTMLElement;
  private destroyRef = inject(DestroyRef);
  private mediaQueryList: MediaQueryList;

  constructor() {
    // Initialiser les éléments DOM d'abord
    this.htmlElement = document.querySelector('html')!;
    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    // Maintenant on peut initialiser les signals qui dépendent de mediaQueryList
    this.systemPreference = signal(this.getSystemPreference());

    // Initialiser le computed signal
    this.effectiveTheme = computed(() => {
      const mode = this.themeMode();
      return mode === 'follow' ? this.systemPreference() : mode;
    });

    // Configurer le listener pour les changements de préférences système
    const handleColorSchemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const newColorScheme = event.matches ? 'dark' : 'light';
      this.systemPreference.set(newColorScheme);
    };

    // Ajouter le listener au MediaQueryList
    this.mediaQueryList.addEventListener('change', handleColorSchemeChange);

    // S'assurer que le listener est supprimé quand le service est détruit
    this.destroyRef.onDestroy(() => {
      this.mediaQueryList.removeEventListener('change', handleColorSchemeChange);
    });

    // effet qui réagit aux changements du thème effectif
    effect(() => {
      const theme = this.effectiveTheme();
      this.setTheme(theme);
      console.log('Thème appliqué:', theme);
    });
  }

  public getCurrentTheme(): string {
    return this.themeMode();
  }

  public getEffectiveTheme(): string {
    return this.effectiveTheme();
  }

  public changeTheme(theme: string): void {
    if (['light', 'dark', 'follow'].includes(theme)) {
      this.themeMode.set(theme);
    } else {
      console.warn(`Thème non supporté: ${theme}. Utilisation de 'follow' par défaut.`);
      this.themeMode.set('follow');
    }
  }

  public getColorScheme(): string {
    return this.systemPreference();
  }

  private getSystemPreference(): string {
    return this.mediaQueryList.matches ? 'dark' : 'light';
  }

  private setTheme(theme: string): void {
    this.htmlElement.setAttribute('data-theme', theme);
  }
}
