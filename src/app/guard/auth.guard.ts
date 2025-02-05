import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  // Utilisation de inject() pour obtenir le Router
  const router = inject(Router);
  
  // Vérifie si le token existe dans le sessionStorage
  const token = localStorage.getItem('token');
  
  if (token) {
    // Si le token existe, on autorise l'accès à la route
    return true;
  }
  
  // Si pas de token, on redirige vers la page de login
  // et on retourne false pour bloquer l'accès à la route demandée
  router.navigate(['/auth/login']);
  return false;
};