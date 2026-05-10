// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { environment } from '../../environments/environment';
// import { Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class HierarchyService {
//   // This combines your Vercel URL with the /hierarchy endpoint
//   // private apiUrl = 'https://forest-backend-pi.vercel.app/api/hierarchy';
//   private apiUrl = `${environment.apiUrl}/hierarchy`;

//   constructor(private http: HttpClient) {}

//   // Fetch the full tree (Circles > Divisions > Ranges > Beats)
//   // src/app/services/hierarchy.service.ts
// getHierarchy() { // Make sure this name matches exactly
//   return this.http.get<any[]>(this.apiUrl);
// }

//   // Save a new category (This ensures persistence in NeonDB)
//   saveCategory(name: string, layerId: number, parentId: number | null): Observable<any> {
//     const payload = { name, layerId, parentId };
//     return this.http.post(this.apiUrl, payload);
//   }

// deleteCategory(id: number): Observable<any> {
//   // Kyunki apiUrl pehle se hi '.../api/hierarchy' hai, 
//   // toh humein sirf '/' aur 'id' jodna hai.
//   return this.http.delete(`${this.apiUrl}/${id}`);
// }

// assignBeat(payload: any): Observable<any> {
//   return this.http.post(`${this.apiUrl}/assign`, payload);
// }

// getRangers(companyId: number): Observable<any[]> {
//   const finalUrl = `${this.apiUrl}/rangers/${companyId}`;
  
//   // LOG 3: Frontend URL verification
//   console.log('FRONTEND CALLING URL:', finalUrl);
  
//   if (!companyId) {
//     console.error('WARNING: companyId is missing in frontend call!');
//   }

//   return this.http.get<any[]>(finalUrl);
// }

//   getAssignedBeat(rangerId: number): Observable<any> {
//     return this.http.get(`${this.apiUrl}/assigned-beat/${rangerId}`);
//   }

//   getCoverageStats(companyId: number): Observable<any[]> {
//     return this.http.get<any[]>(`${this.apiUrl}/coverage/${companyId}`);
//   }
// }


import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, of, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  // NestJS backend on Vercel - has proper CORS and hierarchy endpoints
  // Laravel API (fms.pugarch.in) doesn't support generic /hierarchy tree routes
  private apiUrl = 'https://forest-backend-pi.vercel.app/api/hierarchy';

  constructor(private http: HttpClient) {}

  // 1. Get Full Tree
  getHierarchy(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // 2. Save Category
  saveCategory(name: string, layerId: number, parentId: number | null): Observable<any> {
    const payload = { name, layerId, parentId };
    return this.http.post(this.apiUrl, payload);
  }

  // 3. Delete Category
  deleteCategory(id: number): Observable<any> {
    // Backend controller @Delete(':id') ke hisab se
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // 4. Assign Beat (Post Payload)
  assignBeat(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/assign`, payload);
  }

  // 5. Get Rangers for Assignment
  getRangers(companyId: number): Observable<any[]> {
    const finalUrl = `${this.apiUrl}/rangers/${companyId}`;
    console.log('Rangers API Requesting:', finalUrl);
    return this.http.get<any[]>(finalUrl);
  }

  // 6. Get Assigned Site/Beat (Aligned with Sir's Production API: POST /api/getSites)
  getAssignedBeat(rangerId: number): Observable<any> {
    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '1';
    
    // 1. Check New Dynamic Assignments API first
    const dynamicUrl = `${environment.apiUrl}/assignments/user/${rangerId}?api_token=${apiToken}`;
    const productionUrl = `${environment.apiUrl}/getSites`;
    
    const payload = { 
      api_token: apiToken,
      company_id: companyId,
      user_id: rangerId
    };

    return new Observable(observer => {
      this.http.get<any>(dynamicUrl).pipe(
        timeout(10000),
        catchError((err) => {
          // Completely silent fallback
          return throwError(() => err);
        })
      ).subscribe({
        next: (res) => {
          const assignments = res?.data || res || [];
          if (Array.isArray(assignments) && assignments.length > 0) {
            const activeAssign = assignments[0];
            const entityName = activeAssign.entity?.name || activeAssign.entity_name || 'Unknown Entity';
            const roleName = activeAssign.role?.name || activeAssign.role_name || 'Unknown Role';
            
            observer.next({ status: 'SUCCESS', data: { beat_name: entityName, role_name: roleName } });
            observer.complete();
          } else {
            this.fetchOldSite(productionUrl, payload, observer);
          }
        },
        error: (err) => {
          this.fetchOldSite(productionUrl, payload, observer);
        }
      });
    });
  }

  private fetchOldSite(productionUrl: string, payload: any, observer: any) {
    // Postman collection mein getSites FormData se hai — plain JSON nahi
    const formData = new FormData();
    formData.append('api_token', payload.api_token || '');
    formData.append('company_id', String(payload.company_id || ''));
    formData.append('user_id', String(payload.user_id || ''));

    this.http.post<any>(productionUrl, formData).pipe(
      timeout(10000),
      catchError((err) => {
        console.warn('getSites failed (500), using cached beat name:', err.status);
        const cached = localStorage.getItem('assigned_beat_name') || 'General';
        return of({ status: 'CACHED', data: { beat_name: cached } });
      })
    ).subscribe({
      next: (res) => {
        observer.next(res);
        observer.complete();
      },
      error: (err) => {
        const cached = localStorage.getItem('assigned_beat_name') || 'General';
        observer.next({ status: 'SUCCESS', data: { beat_name: cached } });
        observer.complete();
      }
    });
  }

  // 7. Get Coverage Stats
  getCoverageStats(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coverage/${companyId}`);
  }
}