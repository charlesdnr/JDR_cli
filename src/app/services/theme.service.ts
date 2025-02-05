import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkThemeSubject = new BehaviorSubject<boolean>(this.loadThemePreference());

  toggleTheme(): void {
    const newValue = !this.isDarkThemeSubject.value;
    this.isDarkThemeSubject.next(newValue);
    localStorage.setItem('darkTheme', JSON.stringify(newValue));
  }

  private loadThemePreference(): boolean {
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme) {
      return JSON.parse(savedTheme);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
