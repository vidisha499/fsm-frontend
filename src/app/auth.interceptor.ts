import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const apiToken = localStorage.getItem('api_token');

    // Skip interception if custom header is present
    if (request.headers.has('Bypass-Token')) {
      return this.handleResponse(next.handle(request.clone({ headers: request.headers.delete('Bypass-Token') })));
    }

    if (apiToken && !request.headers.has('Authorization')) {
      const skipUrlToken = request.params.has('skip_url_token') || request.url.includes('skip_url_token');
      
      // 1. Add api_token to URL Parameters (Standard for legacy PHP/Sir's APIs)
      // SKIP if skip_url_token is present to avoid backend SQL bugs
      let clonedRequest = request;
      if (!skipUrlToken) {
        clonedRequest = request.clone({
          params: request.params.set('api_token', apiToken)
        });
      } else {
        // Remove the helper param so it doesn't reach the server
        clonedRequest = request.clone({
          params: request.params.delete('skip_url_token')
        });
      }

      // 3. Add to Body for POST/PUT/PATCH (Fallback for Sir's legacy APIs)
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
      return this.handleResponse(next.handle(clonedRequest));
    }

    return this.handleResponse(next.handle(request));
  }

  private handleResponse(nextObs: Observable<HttpEvent<any>>): Observable<HttpEvent<any>> {
    return nextObs.pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error("🔴 Step 5 (Auth Trap): 401 Unauthorized received! Token is expired or invalid.");
          console.error("🔴 Step 6 (Logout): Clearing localStorage and forcing redirect to /login...");
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
