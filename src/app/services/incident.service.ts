// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Incident {
  
// }



import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private apiUrl = 'https://forest-backend-pi.vercel.app/api/incidents';

  constructor(private http: HttpClient) { }

  getCompanyIncidents(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/company/${companyId}`);
  }

  getOne(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  updateStatus(id: number, status: string): Observable<any> {
    // We send an object with the new status to the backend
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }
}