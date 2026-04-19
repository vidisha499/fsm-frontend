import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const apiToken = localStorage.getItem('api_token');

    // Skip interception if custom header is present
    if (request.headers.has('Bypass-Token')) {
      return next.handle(request.clone({ headers: request.headers.delete('Bypass-Token') }));
    }

    if (apiToken && !request.headers.has('Authorization')) {
      // Add api_token to query params for ALL methods (GET, POST, etc.)
      let clonedRequest = request.clone({
        params: request.params.set('api_token', apiToken)
      });

      // Also add to body for POST/PUT/PATCH if body is a plain object
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        if (clonedRequest.body && !(clonedRequest.body instanceof FormData)) {
          const body: any = clonedRequest.body;
          const newBody = { ...body, api_token: apiToken };
          clonedRequest = clonedRequest.clone({
            body: newBody
          });
        } else if (clonedRequest.body instanceof FormData) {
          if (!clonedRequest.body.has('api_token')) {
             clonedRequest.body.append('api_token', apiToken);
          }
        }
      }
      return next.handle(clonedRequest);
    }

    return next.handle(request);
  }
}
