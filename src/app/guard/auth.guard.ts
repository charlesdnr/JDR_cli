// src/app/guard/auth.guard.ts - Version corrigée
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth'; // Importez Auth et authState
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators'; // Importez map et take

export const authGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const auth = inject(Auth); // Injectez le service Auth
  const router = inject(Router);

  // Utilisez authState pour obtenir l'état d'authentification actuel
  return authState(auth).pipe(
    take(1), // Prenez la première valeur émise (l'état actuel au chargement)
    map(user => {
      if (user) {
        // Si un utilisateur Firebase existe, autorisez l'accès
        return true;
      } else {
        // Si aucun utilisateur n'est connecté, redirigez vers la page de login
        console.log('AuthGuard: Utilisateur non connecté, redirection vers /auth/login');
        // Retournez un UrlTree pour la redirection
        return router.createUrlTree(['/auth/login']);
      }
    })
  );
};