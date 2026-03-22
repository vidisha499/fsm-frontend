import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' // Iska matlab ye service pure app mein kahi bhi use ho sakti hai
})
export class AdminDataService {

  // Apne backend ka base URL yahan rakhein
  // private readonly API_URL = 'http://localhost:3000/admin'; 
  private readonly API_URL = 'http://localhost:3000/api/admin';
  // localhost ki jagah IP daalein
// private readonly API_URL = 'http://192.168.1.15:3000/api/admin';

  constructor(private http: HttpClient) { }

// src/app/services/admin-data.ts
// src/app/services/admin-data.ts
getOnDutyCount(companyId: number, date: string) {
  return this.http.get<any>(`${this.API_URL}/attendance/count`, {
    params: { companyId, date }
  });
}

  // Future mein aap yahan aur bhi functions add kar sakte hain
  // Jaise: getIncidents(), getMapPins(), etc.
}