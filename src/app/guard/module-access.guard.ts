import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { UserHttpService } from '../services/https/user-http.service';
import { ModuleHttpService } from '../services/https/module-http.service';
import { Observable, of, from } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

export const moduleAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot): Observable<boolean> => {
  const auth = inject(Auth);
  const userService = inject(UserHttpService);
  const moduleService = inject(ModuleHttpService);
  const router = inject(Router);

  const moduleId = route.paramMap.get('moduleId');
  
  if (!moduleId) {
    return of(false);
  }

  // Vérifier l'état d'authentification
  return authState(auth).pipe(
    take(1),
    switchMap(firebaseUser => {
      const jdrUser = userService.currentJdrUser();
      
      // Si l'utilisateur est authentifié, accès complet
      if (firebaseUser && jdrUser) {
        return of(true);
      }
      
      // Si pas authentifié, vérifier si le module est publié
      return from(moduleService.getModuleById(parseInt(moduleId))).pipe(
        map(module => {
          // Vérifier si le module a une version publiée
          const hasPublishedVersion = module.versions?.some(version => version.published);
          
          if (hasPublishedVersion) {
            return true;
          } else {
            router.navigate(['/auth/login'], { 
              queryParams: { returnUrl: route.url.join('/') }
            });
            return false;
          }
        }),
        catchError(() => {
          router.navigate(['/home']);
          return of(false);
        })
      );
    }),
    catchError(error => {
      console.error('ModuleAccessGuard: Erreur d\'authentification', error);
      return of(false);
    })
  );
};