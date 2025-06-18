import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  const authService = inject(AuthenticationService);

  // Skip authentication for static assets
  if (req.url.includes('/assets/') || req.url.startsWith('assets/')) {
    return next(req);
  }

  // Wait for authentication to be ready and add token if available
  const requestHandlerPromise = async (): Promise<HttpRequest<unknown>> => {
    try {
      // Always wait for auth to be ready first
      const currentUser = await authService.waitForAuthReady();
      
      // If no user is logged in after waiting, proceed with original request
      if (!currentUser) {
        return req;
      }

      // Get the token for authenticated user
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