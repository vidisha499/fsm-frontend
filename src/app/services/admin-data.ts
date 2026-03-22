import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

// admin.service.ts
getOnDutyCount(companyId: any, date: string) {
  // Ensure karo ki URL mein /api/admin... sahi hai
  return this.http.get(`${environment.apiUrl}/admin/on-duty-count`, {
    params: { companyId, date }
  });
}
}