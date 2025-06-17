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
        return true;
      } else {
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
      }
    })
  );
};