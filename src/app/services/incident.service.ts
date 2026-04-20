// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class IncidentService {
//   private apiUrl = `${environment.apiUrl}/incidents`;

//   constructor(private http: HttpClient) { }

//   getCompanyIncidents(companyId: number): Observable<any[]> {
//     return this.http.get<any[]>(`${this.apiUrl}/company/${companyId}`);
//   }

//   getOne(id: number): Observable<any> {
//     return this.http.get<any>(`${this.apiUrl}/${id}`);
//   }
//   updateStatus(id: number, status: string): Observable<any> {
//     // We send an object with the new status to the backend
//     return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
//   }

//   // src/services/incident.service.ts

// getStats(companyId: number): Observable<any> {
//   return this.http.get(`${this.apiUrl}/stats/${companyId}`);
// }
// }


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; // Environment import karna mat bhoolna
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  // Hardcoded URL hata kar environment se connect kiya
  private apiUrl = `${environment.apiUrl}/incidents`;

  constructor(private http: HttpClient) { }

  // 1. Get All Incidents for a Company
  getCompanyIncidents(companyId: number): Observable<any[]> {
    const finalUrl = `${this.apiUrl}/company/${companyId}`;
    console.log('Fetching Incidents:', finalUrl);
    return this.http.get<any[]>(finalUrl);
  }

  // 2. Get Single Incident Detail
  getOne(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // 3. Update Incident Status (Open/In Progress/Closed)
  updateStatus(id: number, status: string): Observable<any> {
    // PATCH request for status update
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status }).pipe(
      catchError(err => {
        console.error(`Status update failed for Incident ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  // 4. Get Incident Statistics (for Charts/Dashboard)
  getStats(companyId: number): Observable<any> {
    const finalUrl = `${this.apiUrl}/stats/${companyId}`;
    console.log('Fetching Incident Stats:', finalUrl);
    return this.http.get<any>(finalUrl);
  }
}