import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export const dateFormatInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  // Only process PUT and POST requests, but skip FormData
  if ((req.method === 'PUT' || req.method === 'POST') && req.body && !(req.body instanceof FormData)) {
    const processedBody = processDateFields(req.body);

    // Clone the request with the processed body
    const clonedReq = req.clone({
      body: processedBody
    });

    return next(clonedReq);
  }

  // For other methods or no body, pass through
  return next(req);
};

function processDateFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processDateFields(item));
  }

  if (typeof obj === 'object') {
    const result = { ...obj };

    Object.keys(result).forEach(key => {
      // Remove createdAt and updatedAt dates from User objects
      if ((key === 'createdAt' || key === 'updatedAt') &&
           // Only remove date fields from User objects to avoid removing dates that should be updated
           (result['username'] !== undefined || (result['user'] && result['user']['username'] !== undefined))) {
        delete result[key];
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = processDateFields(result[key]);
      }
    });

    return result;
  }

  return obj;
}