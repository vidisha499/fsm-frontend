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
          if (this.isGenuineAuthError(error)) {
            console.error("🔴 Step 5 (Auth Trap): Genuine 401 Unauthorized received! Token is expired or invalid.");
            console.error("🔴 Step 6 (Logout): Clearing auth session and forcing redirect to /login...");
            this.clearUserSession();
            this.router.navigate(['/login']);
          } else {
            console.warn("🟡 401 received but identified as a business logic error or public URL. Ignoring logout trap.");
          }
        }
        return throwError(() => error);
      })
    );
  }

  private isGenuineAuthError(error: HttpErrorResponse): boolean {
    const url = error.url || '';
    
    // 1. Skip if it is a public signup or entity loading URL
    const isPublicUrl = url.includes('verifyUser') || 
                        url.includes('addUser') || 
                        url.includes('ranges') || 
                        url.includes('beats') || 
                        url.includes('getSites') ||
                        url.includes('org/layers') ||
                        url.includes('org/entities') ||
                        url.includes('assignable-users') ||
                        url.includes('hierarchy') ||
                        url.includes('roles') ||
                        url.includes('subordinates') ||
                        url.includes('profile');
    if (isPublicUrl) return false;

    // 2. Skip if it's a patrol workflow API call (business logic returns 401 e.g. "Another patrol is in progress")
    if (url.includes('patrol') || url.includes('patrols')) return false;

    // 3. Extract and check error messages
    const errMsg = (
      error.error?.message || 
      error.error?.error || 
      error.message || 
      ''
    ).toLowerCase();

    // 4. Skip if the message implies a business constraint, not auth expiration
    if (errMsg.includes('patrol') || errMsg.includes('in progress') || errMsg.includes('already')) {
      return false;
    }

    // 5. Must explicitly target token/session expiry or authentication failure
    const isAuthRelated = 
      errMsg.includes('unauthenticated') || 
      errMsg.includes('unauthorized') || 
      errMsg.includes('token') || 
      errMsg.includes('session') || 
      errMsg.includes('jwt') || 
      errMsg.includes('expired') || 
      errMsg.includes('signature');

    return isAuthRelated;
  }

  private clearUserSession() {
    console.warn("⚠️ Performing safe session clearance. Keeping offline drafts and user configurations.");
    const sessionKeys = [
      'api_token',
      'user_data',
      'user_role',
      'company_id',
      'ranger_id',
      'ranger_username',
      'ranger_phone',
      'user_photo',
      'active_patrol_id',
      'active_patrol_session_id',
      'temp_patrol_name',
      'patrol_session_start_time'
    ];
    sessionKeys.forEach(k => localStorage.removeItem(k));
  }
}
