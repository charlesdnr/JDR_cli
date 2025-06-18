import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private router = inject(Router);

  constructor() {
    this.initializeScrollReset();
  }

  private initializeScrollReset() {
    // Écouter les événements de navigation réussie
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.scrollToTop();
      });
  }

  /**
   * Fait défiler la page vers le haut avec une animation fluide
   */
  scrollToTop(smooth = true) {
    const options: ScrollToOptions = {
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    };

    // Essayer de faire défiler le body ou l'élément racine
    if (window.scrollTo) {
      window.scrollTo(options);
    }

    // Fallback pour les anciens navigateurs
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }

  /**
   * Fait défiler vers un élément spécifique
   */
  scrollToElement(elementId: string, smooth = true) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start'
      });
    }
  }

  /**
   * Sauvegarde la position de scroll actuelle
   */
  saveScrollPosition(key: string) {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    sessionStorage.setItem(`scroll_${key}`, scrollPosition.toString());
  }

  /**
   * Restaure une position de scroll sauvegardée
   */
  restoreScrollPosition(key: string, smooth = false) {
    const savedPosition = sessionStorage.getItem(`scroll_${key}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      setTimeout(() => {
        if (smooth) {
          window.scrollTo({
            top: position,
            behavior: 'smooth'
          });
        } else {
          window.scrollTo(0, position);
        }
      }, 0);
    }
  }

  /**
   * Supprime une position de scroll sauvegardée
   */
  clearScrollPosition(key: string) {
    sessionStorage.removeItem(`scroll_${key}`);
  }
}