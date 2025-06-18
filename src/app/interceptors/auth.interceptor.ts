import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  const auth = inject(Auth);
  const authService = inject(AuthenticationService);

  // For requests that don't need authentication, proceed immediately
  const currentUser = auth.currentUser;

  // If no user is logged in, proceed with the original request
  if (!currentUser) {
    return next(req);
  }

  // Wait for authentication to be ready and get token
  const requestHandlerPromise = async (): Promise<HttpRequest<unknown>> => {
    try {
      // Wait for auth to be ready and get token
      const token = await authService.waitForAuthToken();

      if (token) {
        // Clone the request with authorization header
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`
        };
        
        // For FormData/multipart, don't set Content-Type
        const isFormData = req.body instanceof FormData;
        if (!isFormData) {
          // Only for non-FormData requests, add Content-Type if necessary
          // headers['Content-Type'] = 'application/json'; // Only if necessary
        }
        
        const clonedReq = req.clone({
          setHeaders: headers
        });
        return clonedReq;
      } else {
        // If no token available, log warning and proceed with original request
        console.warn('User logged in but unable to retrieve Firebase token.');
        return req;
      }
    } catch (error) {
      // Handle potential errors when retrieving token
      console.error('Error retrieving Firebase token via interceptor:', error);
      // In case of error, return original request
      return req;
    }
  };

  return from(requestHandlerPromise()).pipe(
    switchMap(processedRequest => next(processedRequest)),
    catchError(error => {
      console.error('Auth interceptor error:', error);
      // In case of interceptor error, try with original request
      return next(req);
    })
  );
};