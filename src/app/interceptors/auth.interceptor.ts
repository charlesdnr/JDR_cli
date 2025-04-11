import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Intercepteur fonctionnel utilisant async/await pour getIdToken
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  const auth = inject(Auth);
  const currentUser = auth.currentUser;

  // Si pas d'utilisateur, passer directement la requête (retourne un Observable)
  if (!currentUser) {
    return next(req);
  }

  const requestHandlerPromise = async (): Promise<HttpRequest<unknown>> => {
    try {
      // Utilisation de await pour obtenir le token
      const token = await currentUser.getIdToken();

      if (token) {
        // Cloner la requête si le token est obtenu
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        // Retourner la requête clonée (résolution de la Promise)
        return clonedReq;
      } else {
        // Si pas de token (peu probable mais géré), retourner l'originale
        console.warn('Utilisateur connecté mais impossible de récupérer le token Firebase.');
        return req;
      }
    } catch (error) {
      // Gérer les erreurs potentielles lors de la récupération du token
      console.error('Erreur lors de la récupération du token Firebase via interceptor:', error);
      // En cas d'erreur, retourner la requête originale (résolution de la Promise)
      return req;
    }
  };

  return from(requestHandlerPromise()).pipe(
    switchMap(processedRequest => next(processedRequest))
  );
};