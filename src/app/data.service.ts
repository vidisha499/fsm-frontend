import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;
  private selectedAttendance: any;

  constructor(private http: HttpClient,
    
  ) {}


  // Attendance set karne ke liye
  setSelectedAttendance(data: any) {
    this.selectedAttendance = data;
  }

  // Attendance get karne ke liye (Detail page par use hoga)
  getSelectedAttendance() {
    return this.selectedAttendance;
  }

  setSelectedIncident(incident: any) {
  this.selectedIncident = incident;
}

getSelectedIncident() {
  return this.selectedIncident;
}

  // --- HELPER FOR STORAGE ---
  saveRangerId(id: string) {
    localStorage.setItem('ranger_id', id);
  }

  getRangerId() {
    return localStorage.getItem('ranger_id');
  }

  // --- AUTH & RANGERS ---
  login(data: any) {
    return this.http.post(`${this.baseApiUrl}/users/login`, data);
  }

  updateRanger(data: any) {
    return this.http.post(`${this.baseApiUrl}/rangers/update`, data);
  }

  getRangerProfile(id: string) {
    return this.http.get(`${this.baseApiUrl}/rangers/${id}`);
  }

  // --- INCIDENTS ---
  getIncidentsByRanger() {
    const id = this.getRangerId();
    return this.http.get(`${this.baseApiUrl}/incidents/my-reports/${id}`);
  }

  reportNewIncident(incidentData: any) {
    return this.http.post(`${this.baseApiUrl}/incidents`, incidentData);
  }

  // --- PATROLS ---
  startActivePatrol(rangerId: number) {
    return this.http.post(`${this.baseApiUrl}/patrols/active`, { rangerId });
  }

  getOngoingPatrols() {
    return this.http.get(`${this.baseApiUrl}/patrols/active`);
  }

  updatePatrolStats(patrolId: number, data: any) {
    return this.http.patch(`${this.baseApiUrl}/patrols/active/${patrolId}`, data);
  }

  getCompletedPatrolLogs() {
    return this.http.get(`${this.baseApiUrl}/patrols/logs`);
  }

  // --- PASSWORD RESET & OTP ---
  requestPasswordReset(phoneNo: string) {
    return this.http.post(`${this.baseApiUrl}/rangers/forgot-password`, { phoneNo });
  }

  verifyOtp(phoneNo: string, otp: string) {
    return this.http.post(`${this.baseApiUrl}/rangers/verify-otp`, { phoneNo, otp });
  }

  resetPassword(phoneNo: string, otp: string, newPass: string) {
    return this.http.post(`${this.baseApiUrl}/rangers/reset-password`, { 
      phoneNo, 
      otp, 
      newPass 
    });
  }

  saveSighting(payload: any) {
  return this.http.post(`${this.baseApiUrl}/patrols/sightings`, payload);
}

// DataService ke andar ye function add karein
verifyCompanyUser(phone: string) {
  // Isse URL banega: https://forest-backend-pi.vercel.app/api/company-user/verify-mobile
  return this.http.post(`${this.baseApiUrl}/company-user/verify-mobile`, { phone });
}

checkUserExists(mobile: string) {
  // This calls your backend to see if the ranger already exists
  return this.http.get(`${this.baseApiUrl}/rangers/check/${mobile}`);
}

// Backend endpoint: /attendance/beat-attendance/ranger/:id
  getAttendanceLogsByRanger(rangerId: string) {
    return this.http.get(`${this.baseApiUrl}/attendance/beat-attendance/ranger/${rangerId}`);
  }

  // Nayi attendance mark karne ke liye (Aapke form page ke liye)
  markAttendance(payload: any) {
    return this.http.post(`${this.baseApiUrl}/attendance/beat-attendance`, payload);
  }



getPatrolsByCompany(companyId: number, date?: string) {
  // Logic: if date is provided, it filters for that specific day
  const params = date ? `?companyId=${companyId}&from=${date}&to=${date}` : `?companyId=${companyId}`;
  return this.http.get(`${this.baseApiUrl}/patrols/logs${params}`);
}

getPatrolById(id: number) {
  // Try adding /logs if that's where your patrol data lives
  return this.http.get(`${this.baseApiUrl}/patrols/logs/${id}`);
}

// postSOS(alertData: any) {
//   // Ensure this is using baseApiUrl and NOT a hardcoded string or missing the /api prefix
//   return this.http.post(`${this.baseApiUrl}/alerts/trigger-sos`, alertData);
// }

// --- ADMIN DASHBOARD FUNCTIONS ---

// Admin ke liye: Puri company ki attendance nikalne ke liye
getAttendanceByCompany(companyId: string) {
  // Backend URL: /attendance/beat-attendance/company/:id
  return this.http.get(`${this.baseApiUrl}/attendance/beat-attendance/company/${companyId}`);
}

// Admin ke liye: Puri company ke incidents nikalne ke liye (Future use)
getIncidentsByCompany(companyId: string) {
  return this.http.get(`${this.baseApiUrl}/incidents/company/${companyId}`);
}


// data.service.ts

getRangersByCompany(companyId: string) {
  // Ye aapke backend ke rangers wale endpoint ko call karega
  return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`);
}

// --- ONSITE ATTENDANCE (NEW) ---

// 1. Ranger ke liye: Nayi onsite attendance submit karne ke liye
markOnsiteAttendance(payload: any) {
  return this.http.post(`${this.baseApiUrl}/onsite-attendance`, payload);
}

// 2. Admin ke liye: Pending requests fetch karne ke liye (Ye missing tha!)
getPendingOnsiteRequests(companyId: string) {
  return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}/pending`);
}

// 3. Admin ke liye: Status update karne ke liye (Approve/Reject)
updateOnsiteStatus(id: number, status: 'approved' | 'rejected') {
  return this.http.patch(`${this.baseApiUrl}/onsite-attendance/${id}/status`, { status });
}

// 4. Ranger ke liye: Apne khud ke logs dekhne ke liye
getOnsiteLogsByRanger(rangerId: string) {
  return this.http.get(`${this.baseApiUrl}/onsite-attendance/ranger/${rangerId}`);
}
getApprovedOnsiteByCompany(companyId: string) {
  return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}`);
}


getUsersByCompany(companyId: any) {
  // Correct: baseApiUrl has /api, so we just add /users/...
  return this.http.get(`${this.baseApiUrl}/users/company/${companyId}`);
}

getWeeklyAttendanceStats(companyId: any, rangerId?: any) {
  // Ensure we don't send "undefined" as a string in the URL
  let url = `${this.baseApiUrl}/attendance/stats/weekly?companyId=${companyId}`;
  
  if (rangerId) {
    url += `&rangerId=${rangerId}`;
  }
  
  return this.http.get<number[]>(url);
}

// data.service.ts
getLatestAlerts(companyId: number): Observable<any[]> {
  // Query param (?) ki jagah path param (/) use karein
  // Isse URL banega: .../api/alerts/123
  return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`);
}



// data.service.ts
getDashboardStats(companyId: number, from?: string, to?: string) {
  // Base URL: /incidents/stats/1
  let url = `${this.baseApiUrl}/incidents/stats/${companyId}`;
  
  // Query Params add karne ka sahi tarika
  if (from && to) {
    url += `?from=${from}&to=${to}`;
  }
  
  return this.http.get(url);
}

getIncidentTrend(companyId: number): Observable<any> {
  // Base URL check kar lena, agar incidents controller mein hai toh:
  return this.http.get(`${this.baseApiUrl}/incidents/trend/${companyId}`);
}

getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
  let params: any = { companyId: companyId.toString() };

  if (from) params.from = from;
  if (to) params.to = to;

  return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
}


// In DataService
updateNotificationPrefs(companyId: number, prefs: any[]) {
  // If you create a 'notification_settings' table later, use this:
  return this.http.post(`${this.baseApiUrl}/users/settings/${companyId}`, { prefs });
} 

// --- ANALYTICS FUNCTIONS ---

  getCriminalAnalytics(companyId: any, timeframe: string, range: string, beat: string): Observable<any> {
    // URL prepare ho raha hai environment.apiUrl ka use karke
    const url = `${this.baseApiUrl}/incidents/analytics/criminal`;

    // Query parameters set kar rahe hain
    const params = {
      companyId: companyId.toString(),
      timeframe: timeframe || 'month',
      range: range || 'all',
      beat: beat || 'all'
    };

    return this.http.get(url, { params });
  }
  getFireAnalytics(companyId: any, timeframe: string, range: string, beat: string) {
  const params = {
    companyId: companyId.toString(),
    timeframe,
    range,
    beat
  };
  return this.http.get(`${this.baseApiUrl}/incidents/analytics/fire`, { params });

}


// data.service.ts ke andar

// getEventsAnalytics(companyId: number, timeframe: string) {
//   return this.http.get(`${this.baseApiUrl}/analytics/events?companyId=${companyId}&timeframe=${timeframe}`);
// }


getEventsAnalytics(companyId: number, timeframe: string) {
  // Yahan '/admin' add karo kyunki backend controller ka path 'admin' hai
  return this.http.get(`${this.baseApiUrl}/admin/analytics/events?companyId=${companyId}&timeframe=${timeframe}`);
}

// Naya asset save karne ke liye function
  addAsset(assetData: any): Observable<any> {
    return this.http.post(`${this.baseApiUrl}/assets/add`, assetData);
  }

  // Assets ki list mangwane ke liye
  getAssets(companyId: number): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/list?company_id=${companyId}`);
  }
  getMyAssets(companyId: number, userId: number): Observable<any> {
  // Isse URL banega: .../api/assets/my-list?company_id=1&created_by=3
  return this.http.get(`${this.baseApiUrl}/assets/my-list?company_id=${companyId}&created_by=${userId}`);
}

getAssetsTrend(companyId: number): Observable<any> {
  return this.http.get(`${this.baseApiUrl}/assets/assets-trend?company_id=${companyId}`);
}


// src/app/data.service.ts mein ye add karo (agar nahi hai toh)
getAssetStats(companyId: number): Observable<any> {
  return this.http.get(`${this.baseApiUrl}/admin/assets/stats/${companyId}`);
}


// data.service.ts
getIncidentsForMap(companyId: number) {
  // Mapping to your NestJS: @Get('company/:cid')
  return this.http.get<any[]>(`${this.baseApiUrl}/incidents/company/${companyId}`);
}



// Isse badal kar...
// data.service.ts
getAssetCategories(companyId: any): Observable<any[]> { // <--- Yahan <any[]> add kar
  return this.http.get<any[]>(`${this.baseApiUrl}/assets/categories/${companyId}`);
}

getAssetStatuses(companyId: number) {
  return this.http.get(`${this.baseApiUrl}/assets/statuses/company/${companyId}`);
}

// categories fetch karne ke liye
getCategories(companyId: any) {
  return this.http.get(`${this.baseApiUrl}/assets/categories/${companyId}`);
}

// statuses fetch karne ke liye
getStatuses(companyId: any) {
  return this.http.get(`${this.baseApiUrl}/assets/statuses/${companyId}`);
}

// Pehle ye sirf (companyId: number) le raha hoga
getAdminStats(companyId: number, timeframe?: string, from?: string, to?: string) {
  // Query parameters banaiye
  let params = `?timeframe=${timeframe || 'today'}`;
  if (from) params += `&startDate=${from}`;
  if (to) params += `&endDate=${to}`;

  return this.http.get(`${this.baseApiUrl}/assets/stats/${companyId}${params}`);
}

// data.service.ts [cite: 1108]
sendSOSAlert(payload: any) {
  // Ensure this uses your baseApiUrl and exactly 'alerts/sos'
  return this.http.post(`${this.baseApiUrl}/alerts/sos`, payload);
}

// data.service.ts mein is function ko replace kar
getAssetsAnalytics(companyId: number) {
  // Path controller ke @Controller('assets') aur @Get('analytics/stats') se match hona chahiye
  return this.http.get(`${this.baseApiUrl}/assets/analytics/stats?companyId=${companyId}`);
}

getCompanyDynamicAssets(companyId: number) {
  return this.http.get(`${this.baseApiUrl}/assets/analytics/dynamic-stats/${companyId}`);
}

// data.service.ts mein existing constructor ke niche ye add karo:

get(endpoint: string) {
  // baseUrl pehle se environment se aa raha hai
  return this.http.get(`${this.baseApiUrl}/${endpoint}`);
}

// Inside your PatrolService or SightingsService
getAllMapSightings(companyId: number) {
  return this.http.get(`${this.baseApiUrl}/patrols/all-sightings?companyId=${companyId}`);
}
}