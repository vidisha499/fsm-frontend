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

  // 6. Get Assigned Site/Beat (Aligned with Sir's Production API: POST /api/getGuardSite)
  getAssignedBeat(rangerId: number): Observable<any> {
    const productionUrl = 'https://fms.pugarch.in/public/api/getGuardSite';
    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '1';
    
    console.log('Fetching Guard-Specific Site from Production for User ID:', rangerId); 
    
    const payload = { 
      api_token: apiToken,
      user_id: rangerId,
      company_id: companyId 
    };

    return this.http.post<any>(productionUrl, payload, {
      headers: new HttpHeaders().set('Bypass-Token', 'true')
    }).pipe(
      catchError(err => {
        console.error('Production Sites check failed (Fallback to General):', err);
        const cached = localStorage.getItem('assigned_beat_name') || 'General';
        return of({ data: [{ site_name: cached }] });
      })
    );
  }

  // 7. Get Coverage Stats
  getCoverageStats(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coverage/${companyId}`);
  }
}