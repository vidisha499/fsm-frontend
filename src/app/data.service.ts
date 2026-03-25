import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  // Use the central URL from your environment file
  // e.g., 'https://fsm-backend-....vercel.app/api'
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;
  private selectedAttendance: any;

  constructor(private http: HttpClient) {}


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

// // Inside DataService class
// getPatrolsByCompany(companyId: number, date?: string) {
//   // If date is provided, we use it for both 'from' and 'to' to get a single day
//   const params = date ? `?companyId=${companyId}&from=${date}&to=${date}` : `?companyId=${companyId}`;
//   return this.http.get(`${this.baseApiUrl}/patrols/logs${params}`);
// }

getPatrolsByCompany(companyId: number, date?: string) {
  // Logic: if date is provided, it filters for that specific day
  const params = date ? `?companyId=${companyId}&from=${date}&to=${date}` : `?companyId=${companyId}`;
  return this.http.get(`${this.baseApiUrl}/patrols/logs${params}`);
}

getPatrolById(id: number) {
  // Try adding /logs if that's where your patrol data lives
  return this.http.get(`${this.baseApiUrl}/patrols/logs/${id}`);
}

postSOS(alertData: any) {
  // Ensure this is using baseApiUrl and NOT a hardcoded string or missing the /api prefix
  return this.http.post(`${this.baseApiUrl}/alerts/trigger-sos`, alertData);
}

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
  return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`);
}

getDashboardStats(companyId: number) {
  // Ensure karo apiUrl sahi hai (e.g., https://forest-backend-pi.vercel.app/api)
  return this.http.get(`${this.baseApiUrl}/incidents/stats/${companyId}`);
}

getIncidentTrend(companyId: number): Observable<any> {
  // Base URL check kar lena, agar incidents controller mein hai toh:
  return this.http.get(`${this.baseApiUrl}/incidents/trend/${companyId}`);
}

// Inside AdminDataService
// Inside DataService class
getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
  let params: any = { companyId: companyId.toString() };

  if (from) params.from = from;
  if (to) params.to = to;

  return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
}
}
