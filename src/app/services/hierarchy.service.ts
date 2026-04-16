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
import { Observable, catchError, throwError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  // NestJS backend on Vercel - has proper CORS and hierarchy endpoints
  // Laravel API (fms.pugarch.in) doesn't support /hierarchy routes and blocks CORS on /getAssignedBeat
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

  // 6. Get Assigned Beat (Migrated to Sir's Production API: POST /api/getGuardGeofence)
  getAssignedBeat(rangerId: number): Observable<any> {
    const productionUrl = 'https://fms.pugarch.in/public/api/getGuardGeofence';
    const apiToken = localStorage.getItem('api_token') || '';
    
    console.log('Fetching Beat from Production API for Ranger ID:', rangerId); 
    
    // We'll use FormData as Sir's backend is PHP based and might expect multipart/form-data.
    // We use 'Bypass-Token' to prevent the interceptor from adding the token to the URL 
    // simultaneously, which was likely causing the 500 Internal Server Error.
    const fd = new FormData();
    fd.append('api_token', apiToken);

    return this.http.post<any>(productionUrl, fd, {
      headers: new HttpHeaders().set('Bypass-Token', 'true')
    }).pipe(
      catchError(err => {
        console.error('Production Beat check failed (Fallback to General):', err);
        // Fallback to avoid breaking UI while Sir's API is being fixed
        const cached = localStorage.getItem('assigned_beat_name') || 'General';
        return of({ data: { name: cached, beat_name: cached } });
      })
    );
  }

  // 7. Get Coverage Stats
  getCoverageStats(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coverage/${companyId}`);
  }
}