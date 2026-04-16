// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from 'src/environments/environment';

// @Injectable({
//   providedIn: 'root' // Iska matlab ye service pure app mein kahi bhi use ho sakti hai
// })
// export class AdminDataService {
//   // private baseApiUrl = environment.apiUrl;
//   private baseApiUrl = `${environment.apiUrl}/admin`;

//   // Apne backend ka base URL yahan rakhein
//   // private readonly API_URL = 'http://localhost:3000/admin'; 
//   // private readonly API_URL = 'http://localhost:3000/api/admin';
  
//   // localhost ki jagah IP daalein
// // private readonly API_URL = 'http://192.168.1.15:3000/api/admin';

//   constructor(private http: HttpClient) { }

// // admin.service.ts
// // getOnDutyCount(companyId: any, date: string) {
// //   // Ensure karo ki URL mein /api/admin... sahi hai
// //   return this.http.get(`${environment.apiUrl}/admin/on-duty-count`, {
// //     params: { companyId, date }
// //   });
// // }

// // // admin-data.service.ts ke andar
// // getFireAlertsCount(companyId: any, date: string) {
// //   return this.http.get(`${environment.apiUrl}/admin/fire-alerts-count`, {
// //     params: { companyId, date }
// //   });
// // }
// // // Inactive count fetch karne ke liye
// // getInactiveCount(companyId: number, date: string) {
// //   return this.http.get(`${this.API_URL}/admin/stats/inactive/${companyId}?date=${date}`);
// // }

// // getOnLeaveCount(companyId: number) {
// //   return this.http.get(`${this.API_URL}/admin/stats/on-leave/${companyId}`);
// // }

// // --- PURANA CODE (FIXED) ---
//   getOnDutyCount(companyId: any, date: string) {
//     // Yahan environment use kar rahe ho toh check karna padega environment.apiUrl kya hai
//     return this.http.get(`${this.baseApiUrl}/on-duty-count`, {
//       params: { companyId, date }
//     });
//   }

// // admin-data.service.ts ya admin.service.ts (Frontend wali file)

// // ISSE REPLACE KARO (Arguments add karo)
// getFireAlertsCount(companyId: any, date: string, start?: string, end?: string) {
//   // Params create karo
//   let params: any = { companyId, date };
  
//   if (start && end) {
//     params.start = start;
//     params.end = end;
//   }

//   // baseApiUrl pehle se environment.apiUrl + '/admin' hai
//   return this.http.get(`${this.baseApiUrl}/fire-alerts-count`, { params });
// }
//   // --- NAYA DYNAMIC STATS CODE (FIXED) ---

//   getInactiveCount(companyId: number, date: string) {
//     // 💡 Yahan se extra '/admin' hata diya hai
//     return this.http.get(`${this.baseApiUrl}/stats/inactive/${companyId}?date=${date}`);
//   }

//   getOnLeaveCount(companyId: number) {
//     // 💡 Yahan se bhi extra '/admin' hata diya hai
//     return this.http.get(`${this.baseApiUrl}/stats/on-leave/${companyId}`);
//   }
//   getRangersWithAttendance(companyId: number): Observable<any> {
//   // Is URL ko apne backend endpoint se match karein
//   return this.http.get(`${this.baseApiUrl}/rangers-status/${companyId}`);
// }

// // admin-data.service.ts mein add karo
// // Isse strictly aaj ka fresh data milega
// getEventsAnalytics(companyId: number, timeframe: string = 'today', start?: string, end?: string) {
//   // baseUrl pehle se environment.apiUrl + '/admin' hai
//   let url = `${this.baseApiUrl}/analytics/events?companyId=${companyId}&timeframe=${timeframe}`;
  
//   if (start && end) {
//     url += `&startDate=${start}&endDate=${end}`;
//   }
  
//   return this.http.get(url);
// }
// }


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  // Base: https://fms.pugarch.in/public/api/admin
  private baseApiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  /**
   * On Duty Count
   * API: /public/api/admin/on-duty-count
   */
  getOnDutyCount(companyId: any, date: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/on-duty-count`, {
      params: { companyId, date }
    });
  }

  /**
   * Fire Alerts Count
   * API: /public/api/admin/fire-alerts-count
   */
  getFireAlertsCount(companyId: any, date: string, start?: string, end?: string): Observable<any> {
    let params: any = { companyId, date };
    if (start && end) {
      params.start = start;
      params.end = end;
    }
    return this.http.get(`${this.baseApiUrl}/fire-alerts-count`, { params });
  }

  /**
   * Inactive Count
   * API: /public/api/admin/stats/inactive/{id}
   */
  getInactiveCount(companyId: number, date: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/stats/inactive/${companyId}`, {
      params: { date }
    });
  }

  /**
   * On Leave Count
   * API: /public/api/admin/stats/on-leave/{id}
   */
  getOnLeaveCount(companyId: number): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/stats/on-leave/${companyId}`);
  }

  /**
   * Rangers Status
   * API: /public/api/admin/rangers-status/{id}
   */
  getRangersWithAttendance(companyId: number): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/rangers-status/${companyId}`);
  }

  /**
   * Events Analytics
   * API: /public/api/admin/analytics/events
   */
  getEventsAnalytics(companyId: number, timeframe: string = 'today', start?: string, end?: string): Observable<any> {
    let url = `${this.baseApiUrl}/analytics/events?companyId=${companyId}&timeframe=${timeframe}`;
    if (start && end) {
      url += `&startDate=${start}&endDate=${end}`;
    }
    return this.http.get(url);
  }

  /**
   * Generic GET helper
   */
  get(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/${endpoint}`);
  }
}