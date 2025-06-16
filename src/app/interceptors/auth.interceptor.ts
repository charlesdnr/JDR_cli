import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
        // Pour FormData, ne pas modifier Content-Type
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`
        };
        
        // Pour FormData/multipart, ne pas définir Content-Type
        const isFormData = req.body instanceof FormData;
        if (!isFormData) {
          // Seulement pour les requêtes non-FormData, on peut ajouter Content-Type si nécessaire
          // headers['Content-Type'] = 'application/json'; // Ne le faites que si nécessaire
        }
        
        const clonedReq = req.clone({
          setHeaders: headers
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