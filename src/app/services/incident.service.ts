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
}