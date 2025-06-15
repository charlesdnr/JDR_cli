import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { UserHttpService } from '../services/https/user-http.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const privatePageGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const userService = inject(UserHttpService);
  const router = inject(Router);

  // Vérifier l'état d'authentification Firebase
  return authState(auth).pipe(
    take(1),
    map(firebaseUser => {
      // Vérifier aussi l'utilisateur JDR dans le service
      const jdrUser = userService.currentJdrUser();
      
      // L'utilisateur doit être connecté sur Firebase ET avoir un profil JDR
      if (firebaseUser && jdrUser) {
        console.log('PrivatePageGuard: Utilisateur authentifié, accès autorisé');
        return true;
      } else {
        console.log('PrivatePageGuard: Utilisateur non authentifié, redirection vers /auth/login');
        console.log('Firebase User:', firebaseUser ? 'connecté' : 'non connecté');
        console.log('JDR User:', jdrUser ? 'présent' : 'absent');
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
      }
    })
  );
};