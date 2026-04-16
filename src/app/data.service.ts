// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { environment } from '../environments/environment';
// import { Observable } from 'rxjs';

// @Injectable({ providedIn: 'root' })
// export class DataService {
//   private baseApiUrl = environment.apiUrl;
//   private selectedIncident: any;
//   private selectedAttendance: any;
//   private selectedAsset: any;

//   constructor(private http: HttpClient,
    
//   ) {}

//   getSelectedAsset() {
//     return this.selectedAsset;
//   }

//   // List page se data set karna
//   setSelectedAsset(asset: any) {
//     this.selectedAsset = asset;
//   }


//   // Attendance set karne ke liye
//   setSelectedAttendance(data: any) {
//     this.selectedAttendance = data;
//   }

//   // Attendance get karne ke liye (Detail page par use hoga)
//   getSelectedAttendance() {
//     return this.selectedAttendance;
//   }

//   setSelectedIncident(incident: any) {
//   this.selectedIncident = incident;
// }

// getSelectedIncident() {
//   return this.selectedIncident;
// }

//   // --- HELPER FOR STORAGE ---
//   saveRangerId(id: string) {
//     localStorage.setItem('ranger_id', id);
//   }

//   getRangerId() {
//     return localStorage.getItem('ranger_id');
//   }

//   // // --- AUTH & RANGERS ---
//   // login(data: any) {
//   //   return this.http.post(`${this.baseApiUrl}/users/login`, data);
//   // }

//   // --- AUTH & RANGERS ---
// login(data: any) {
//   // Purana path: /users/login -> Naya path: /login
//   return this.http.post(`${this.baseApiUrl}/login`, data);
// }

// private getAuthParams() {
//   const token = localStorage.getItem('api_token');
//   return { params: { api_token: token || '' } };
// }

// getForestAdminDashboard(companyId: number) {
//   const token = localStorage.getItem('api_token');
  
//   // TypeScript ko batana padta hai ki params mein kuch bhi keys ho sakti hain
//   const options = {
//     params: {
//       'api_token': token || '',
//       'company_id': companyId.toString()
//     } as any // 'as any' lagane se error chala jayega
//   };

//   return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data`, options);
// }

// // data.service.ts
// getDashboardStats(companyId: number, from?: string, to?: string) {
//   const token = localStorage.getItem('api_token');
  
//   // 'any' use karne se indexing error (TS7053) nahi aayega
//   const options: any = {
//     params: {
//       'api_token': token || '',
//       'company_id': companyId.toString()
//     }
//   };

//   if (from) options.params['from_date'] = from;
//   if (to) options.params['to_date'] = to;

//   return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data`, options);
// }

//   updateRanger(data: any) {
//     return this.http.post(`${this.baseApiUrl}/rangers/update`, data);
//   }

//   getRangerProfile(id: string) {
//     return this.http.get(`${this.baseApiUrl}/rangers/${id}`);
//   }

//   // --- INCIDENTS ---
//   getIncidentsByRanger() {
//     const id = this.getRangerId();
//     return this.http.get(`${this.baseApiUrl}/incidents/my-reports/${id}`);
//   }

//   reportNewIncident(incidentData: any) {
//     return this.http.post(`${this.baseApiUrl}/incidents`, incidentData);
//   }

//   // --- PATROLS ---
//   startActivePatrol(rangerId: number) {
//     return this.http.post(`${this.baseApiUrl}/patrols/active`, { rangerId });
//   }

//   getOngoingPatrols() {
//     return this.http.get(`${this.baseApiUrl}/patrols/active`);
//   }

//   updatePatrolStats(patrolId: number, data: any) {
//     return this.http.patch(`${this.baseApiUrl}/patrols/active/${patrolId}`, data);
//   }

//   getCompletedPatrolLogs() {
//     return this.http.get(`${this.baseApiUrl}/patrols/logs`);
//   }

//   // --- PASSWORD RESET & OTP ---
//   requestPasswordReset(phoneNo: string) {
//     return this.http.post(`${this.baseApiUrl}/rangers/forgot-password`, { phoneNo });
//   }

//   verifyOtp(phoneNo: string, otp: string) {
//     return this.http.post(`${this.baseApiUrl}/rangers/verify-otp`, { phoneNo, otp });
//   }

//   resetPassword(phoneNo: string, otp: string, newPass: string) {
//     return this.http.post(`${this.baseApiUrl}/rangers/reset-password`, { 
//       phoneNo, 
//       otp, 
//       newPass 
//     });
//   }

//   saveSighting(payload: any) {
//   return this.http.post(`${this.baseApiUrl}/patrols/sightings`, payload);
// }

// // DataService ke andar ye function add karein
// verifyCompanyUser(phone: string) {
//   // Isse URL banega: https://forest-backend-pi.vercel.app/api/company-user/verify-mobile
//   return this.http.post(`${this.baseApiUrl}/company-user/verify-mobile`, { phone });
// }

// checkUserExists(mobile: string) {
//   // This calls your backend to see if the ranger already exists
//   return this.http.get(`${this.baseApiUrl}/rangers/check/${mobile}`);
// }

// // Backend endpoint: /attendance/beat-attendance/ranger/:id
//   getAttendanceLogsByRanger(rangerId: string) {
//     return this.http.get(`${this.baseApiUrl}/attendance/beat-attendance/ranger/${rangerId}`);
//   }

//   // Nayi attendance mark karne ke liye (Aapke form page ke liye)
//   markAttendance(payload: any) {
//     return this.http.post(`${this.baseApiUrl}/attendance/beat-attendance`, payload);
//   }



// getPatrolsByCompany(companyId: number, date?: string) {
//   // Logic: if date is provided, it filters for that specific day
//   const params = date ? `?companyId=${companyId}&from=${date}&to=${date}` : `?companyId=${companyId}`;
//   return this.http.get(`${this.baseApiUrl}/patrols/logs${params}`);
// }

// getPatrolById(id: number) {
//   // Try adding /logs if that's where your patrol data lives
//   return this.http.get(`${this.baseApiUrl}/patrols/logs/${id}`);
// }


// // --- ADMIN DASHBOARD FUNCTIONS ---

// // Admin ke liye: Puri company ki attendance nikalne ke liye
// getAttendanceByCompany(companyId: string) {
//   // Backend URL: /attendance/beat-attendance/company/:id
//   return this.http.get(`${this.baseApiUrl}/attendance/beat-attendance/company/${companyId}`);
// }

// // Admin ke liye: Puri company ke incidents nikalne ke liye (Future use)
// getIncidentsByCompany(companyId: string) {
//   return this.http.get(`${this.baseApiUrl}/incidents/company/${companyId}`);
// }


// // data.service.ts

// getRangersByCompany(companyId: string) {
//   // Ye aapke backend ke rangers wale endpoint ko call karega
//   return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`);
// }

// // --- ONSITE ATTENDANCE (NEW) ---

// // 1. Ranger ke liye: Nayi onsite attendance submit karne ke liye
// markOnsiteAttendance(payload: any) {
//   return this.http.post(`${this.baseApiUrl}/onsite-attendance`, payload);
// }

// // 2. Admin ke liye: Pending requests fetch karne ke liye (Ye missing tha!)
// getPendingOnsiteRequests(companyId: string) {
//   return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}/pending`);
// }

// // 3. Admin ke liye: Status update karne ke liye (Approve/Reject)
// updateOnsiteStatus(id: number, status: 'approved' | 'rejected') {
//   return this.http.patch(`${this.baseApiUrl}/onsite-attendance/${id}/status`, { status });
// }

// // 4. Ranger ke liye: Apne khud ke logs dekhne ke liye
// getOnsiteLogsByRanger(rangerId: string) {
//   return this.http.get(`${this.baseApiUrl}/onsite-attendance/ranger/${rangerId}`);
// }
// getApprovedOnsiteByCompany(companyId: string) {
//   return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}`);
// }


// getUsersByCompany(companyId: any) {
//   // Correct: baseApiUrl has /api, so we just add /users/...
//   return this.http.get(`${this.baseApiUrl}/users/company/${companyId}`);
// }

// getWeeklyAttendanceStats(companyId: any, rangerId?: any) {
//   // Ensure we don't send "undefined" as a string in the URL
//   let url = `${this.baseApiUrl}/attendance/stats/weekly?companyId=${companyId}`;
  
//   if (rangerId) {
//     url += `&rangerId=${rangerId}`;
//   }
  
//   return this.http.get<number[]>(url);
// }

// // data.service.ts
// getLatestAlerts(companyId: number): Observable<any[]> {
//   // Query param (?) ki jagah path param (/) use karein
//   // Isse URL banega: .../api/alerts/123
//   return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`);
// }



// // // data.service.ts
// // getDashboardStats(companyId: number, from?: string, to?: string) {
// //   // Base URL: /incidents/stats/1
// //   let url = `${this.baseApiUrl}/incidents/stats/${companyId}`;
  
// //   // Query Params add karne ka sahi tarika
// //   if (from && to) {
// //     url += `?from=${from}&to=${to}`;
// //   }
  
// //   return this.http.get(url);
// // }

// getIncidentTrend(companyId: number): Observable<any> {
//   // Base URL check kar lena, agar incidents controller mein hai toh:
//   return this.http.get(`${this.baseApiUrl}/incidents/trend/${companyId}`);
// }

// getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
//   let params: any = { companyId: companyId.toString() };

//   if (from) params.from = from;
//   if (to) params.to = to;

//   return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
// }


// // In DataService
// updateNotificationPrefs(companyId: number, prefs: any[]) {
//   // If you create a 'notification_settings' table later, use this:
//   return this.http.post(`${this.baseApiUrl}/users/settings/${companyId}`, { prefs });
// } 

// // --- ANALYTICS FUNCTIONS ---

//   getCriminalAnalytics(companyId: any, timeframe: string, range: string, beat: string): Observable<any> {
//     // URL prepare ho raha hai environment.apiUrl ka use karke
//     const url = `${this.baseApiUrl}/incidents/analytics/criminal`;

//     // Query parameters set kar rahe hain
//     const params = {
//       companyId: companyId.toString(),
//       timeframe: timeframe || 'month',
//       range: range || 'all',
//       beat: beat || 'all'
//     };

//     return this.http.get(url, { params });
//   }
//   getFireAnalytics(companyId: any, timeframe: string, range: string, beat: string) {
//   const params = {
//     companyId: companyId.toString(),
//     timeframe,
//     range,
//     beat
//   };
//   return this.http.get(`${this.baseApiUrl}/incidents/analytics/fire`, { params });

// }


// // Naya asset save karne ke liye function
//   addAsset(assetData: any): Observable<any> {
//     return this.http.post(`${this.baseApiUrl}/assets/add`, assetData);
//   }

//   // Assets ki list mangwane ke liye
//   getAssets(companyId: number): Observable<any> {
//     return this.http.get(`${this.baseApiUrl}/list?company_id=${companyId}`);
//   }
//   getMyAssets(companyId: number, userId: number): Observable<any> {
//   // Isse URL banega: .../api/assets/my-list?company_id=1&created_by=3
//   return this.http.get(`${this.baseApiUrl}/assets/my-list?company_id=${companyId}&created_by=${userId}`);
// }

// getAssetsTrend(companyId: number): Observable<any> {
//   return this.http.get(`${this.baseApiUrl}/assets/assets-trend?company_id=${companyId}`);
// }


// // src/app/data.service.ts mein ye add karo (agar nahi hai toh)
// getAssetStats(companyId: number): Observable<any> {
//   return this.http.get(`${this.baseApiUrl}/admin/assets/stats/${companyId}`);
// }


// // data.service.ts
// getIncidentsForMap(companyId: number) {
//   // Mapping to your NestJS: @Get('company/:cid')
//   return this.http.get<any[]>(`${this.baseApiUrl}/incidents/company/${companyId}`);
// }



// // Isse badal kar...
// // data.service.ts
// getAssetCategories(companyId: any): Observable<any[]> { // <--- Yahan <any[]> add kar
//   return this.http.get<any[]>(`${this.baseApiUrl}/assets/categories/${companyId}`);
// }

// getAssetStatuses(companyId: number) {
//   return this.http.get(`${this.baseApiUrl}/assets/statuses/company/${companyId}`);
// }

// // categories fetch karne ke liye
// getCategories(companyId: any) {
//   return this.http.get(`${this.baseApiUrl}/assets/categories/${companyId}`);
// }

// // statuses fetch karne ke liye
// getStatuses(companyId: any) {
//   return this.http.get(`${this.baseApiUrl}/assets/statuses/${companyId}`);
// }

// // Pehle ye sirf (companyId: number) le raha hoga
// getAdminStats(companyId: number, timeframe?: string, from?: string, to?: string) {
//   // Query parameters banaiye
//   let params = `?timeframe=${timeframe || 'today'}`;
//   if (from) params += `&startDate=${from}`;
//   if (to) params += `&endDate=${to}`;

//   return this.http.get(`${this.baseApiUrl}/assets/stats/${companyId}${params}`);
// }

// // data.service.ts [cite: 1108]
// sendSOSAlert(payload: any) {
//   // Ensure this uses your baseApiUrl and exactly 'alerts/sos'
//   return this.http.post(`${this.baseApiUrl}/alerts/sos`, payload);
// }

// // data.service.ts mein is function ko replace kar
// // DataService ke andar isko replace karo
// getAssetsAnalytics(companyId: number, startDate?: string, endDate?: string) {
//   let url = `${this.baseApiUrl}/admin/analytics/assets?companyId=${companyId}`;
//   if (startDate && endDate) {
//     url += `&startDate=${startDate}&endDate=${endDate}`;
//   }
//   return this.http.get(url);
// }

// getCompanyDynamicAssets(companyId: number) {
//   return this.http.get(`${this.baseApiUrl}/assets/analytics/dynamic-stats/${companyId}`);
// }

// // data.service.ts mein existing constructor ke niche ye add karo:

// get(endpoint: string) {
//   // baseUrl pehle se environment se aa raha hai
//   return this.http.get(`${this.baseApiUrl}/${endpoint}`);
// }


// getAllMapSightings(companyId: number) {
//   return this.http.get(`${this.baseApiUrl}/patrols/all-sightings?companyId=${companyId}`);
// }

// // Add this inside your DataService class
// getAlertsByCompany(companyId: number): Observable<any[]> {
//   // This will call your NestJS: @Get('company/:companyId') inside AlertsController
//   return this.http.get<any[]>(`${this.baseApiUrl}/alerts/company/${companyId}`);
// }
// // data.service.ts
// // Purana: getEventsAnalytics(companyId: number, timeframe: string)
// // Naya (Isse replace karo):
// getEventsAnalytics(companyId: number, timeframe: string, startDate?: string, endDate?: string) {
//   // Naya endpoint jo humne backend mein banaya hai
//   let url = `${this.baseApiUrl}/admin/analytics/events?companyId=${companyId}&timeframe=${timeframe}`;
  
//   if (startDate && endDate) {
//     url += `&startDate=${startDate}&endDate=${endDate}`;
//   }
//   return this.http.get(url);
// }

// // Sub-category wise detailed analytics from forest_reports
// getSubCategoryAnalytics(
//   companyId: number, 
//   category: string, 
//   subCategory: string, 
//   timeframe: string, 
//   startDate?: string, 
//   endDate?: string
// ): Observable<any> {
//   let url = `${this.baseApiUrl}/admin/analytics/subcategory-details?companyId=${companyId}&category=${category}&subCategory=${encodeURIComponent(subCategory)}&timeframe=${timeframe}`;
  
//   if (startDate && endDate) {
//     url += `&startDate=${startDate}&endDate=${endDate}`;
//   }
//   return this.http.get(url);
// }

// // data.service.ts mein add karein
// getActivePatrols(companyId: number) {
//   return this.http.get(`${this.baseApiUrl}/patrols/active?companyId=${companyId}`);
// }

// submitForestEvent(payload: any) {
//   // Isse URL banega: YOUR_URL/api/forest-events/submit
//   return this.http.post(`${this.baseApiUrl}/forest-events/submit`, payload);
// }

// // data.service.ts mein niche ye function dalo

// getUserCompanyId() {
//   const user = JSON.parse(localStorage.getItem('user') || '{}');
//   // Agar user object mein company_id hai toh wo return karo, nahi toh null
//   return user.company_id || user.companyId || null;
// }

// // data.service.ts
// // data.service.ts
// getForestKPIs(companyId: number, timeframe: string, category: string) {
//   // Dono keys bhej do taaki backend jo bhi dhoond raha ho use mil jaye
//   let params = { 
//     companyId: companyId,
//     timeframe: timeframe, 
//     range: timeframe,    // Kuch backend 'range' mangte hain
//     category: category 
//   };

//   return this.http.get(`${this.baseApiUrl}/forest-events/analytics/kpi`, { params });
// }

// getForestMapData(companyId: number, range?: string): Observable<any[]> {
//   const params = range ? `?range=${range}` : '';
//   return this.http.get<any[]>(`${this.baseApiUrl}/forest-events/map-data/${companyId}${params}`);
// }

// downloadReport(payload: any) {
//     return this.http.post(`${this.baseApiUrl}/reports/generate`, payload, {
//       responseType: 'blob', // Important: File ke liye blob chahiye
//       observe: 'response'   // Response headers check karne ke liye
//     });
//   }

// }



import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;
  private selectedAttendance: any;
  private selectedAsset: any;

  constructor(private http: HttpClient) {}

  // --- 1. SELECTION HELPERS ---
  getSelectedAsset() { return this.selectedAsset; }
  setSelectedAsset(asset: any) { this.selectedAsset = asset; }
  setSelectedAttendance(data: any) { this.selectedAttendance = data; }
  getSelectedAttendance() { return this.selectedAttendance; }
  setSelectedIncident(incident: any) { this.selectedIncident = incident; }
  getSelectedIncident() { return this.selectedIncident; }

  // --- 2. STORAGE & USER HELPERS ---
  saveRangerId(id: string) { localStorage.setItem('ranger_id', id); }
  getRangerId() { return localStorage.getItem('ranger_id'); }
  getUserCompanyId() {
    const data = localStorage.getItem('user_data');
    if (data) {
      const user = JSON.parse(data);
      return user.company_id || null;
    }
    return localStorage.getItem('company_id') || null;
  }

  // --- 3. AUTHENTICATION & PROFILE ---
  login(data: any) { return this.http.post(`${this.baseApiUrl}/login`, data); }
  verifyUser() { return this.http.post(`${this.baseApiUrl}/verifyUser`, {}); }
  updateProfilePic(photoBase64: string) { return this.http.post(`${this.baseApiUrl}/updateProfilePic`, { photo: photoBase64 }); }
  checkUserExists(mobile: string) { return this.http.get(`${this.baseApiUrl}/rangers/check/${mobile}`); }
  verifyCompanyUser(phone: string) { return this.http.post(`${this.baseApiUrl}/company-user/verify-mobile`, { phone }); }
  
  // NEW AUTH ENDPOINTS
  resetPasswordAuto(payload: any) { return this.http.post(`${this.baseApiUrl}/resetPassword`, payload); }
  addRegistration(payload: any) { return this.http.post(`${this.baseApiUrl}/addRegistration`, payload); }
  addUser(payload: any) { return this.http.post(`${this.baseApiUrl}/addUser`, payload); }
  zilllogin(payload: any) { return this.http.post(`${this.baseApiUrl}/zilllogin`, payload); }
  addAdmin(payload: any) { return this.http.post(`${this.baseApiUrl}/addAdmin`, payload); }
  addSupervisor(payload: any) { return this.http.post(`${this.baseApiUrl}/addSupervisor`, payload); }
  addGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/addGuard`, payload); }

  // --- 4. DASHBOARD & ADMIN STATS ---
  // Replaced explicit api_token with interceptor
  getDashboardStats(companyId: number, from?: string, to?: string) {
    let params: any = {};
    if (from) params['date_from'] = from;
    if (to) params['date_to'] = to;
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data`, { params });
  }
  getAdminStats(companyId: number, timeframe?: string, from?: string, to?: string) {
    let params = `?timeframe=${timeframe || 'today'}`;
    if (from) params += `&startDate=${from}`;
    if (to) params += `&endDate=${to}`;
    return this.http.get(`${this.baseApiUrl}/assets/stats/${companyId}${params}`);
  }
  getForestAdminDashboard(companyId: number) { return this.getDashboardStats(companyId); }

  // --- 5. RANGER/PROFILE MANAGEMENT ---
  updateRanger(data: any) { return this.http.post(`${this.baseApiUrl}/rangers/update`, data); }
  getRangerProfile(id: string) { return this.http.get(`${this.baseApiUrl}/rangers/${id}`); }
  getRangersByCompany(companyId: string) { return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`); }
  getUsersByCompany(companyId: any) { return this.http.get(`${this.baseApiUrl}/users/company/${companyId}`); }

  // --- 6. INCIDENTS ---
  getIncidentsByRanger() {
    const id = this.getRangerId();
    return this.http.get(`${this.baseApiUrl}/incidents/my-reports/${id}`);
  }
  reportNewIncident(incidentData: any) { return this.http.post(`${this.baseApiUrl}/reportIncidence`, incidentData); }
  getIncidentsByCompany(companyId: string) { return this.http.post(`${this.baseApiUrl}/getIncidence`, { company_id: companyId }); }
  getIncidentsForMap(companyId: number) { return this.http.get<any[]>(`${this.baseApiUrl}/incidents/company/${companyId}`); }
  getIncidentTrend(companyId: number): Observable<any> { return this.http.get(`${this.baseApiUrl}/incidents/trend/${companyId}`); }

  // --- 7. PATROLS & SIGHTINGS ---
  startActivePatrol(payload: any) { return this.http.post(`${this.baseApiUrl}/patrol/start`, payload); }
  getOngoingPatrols() { return this.http.post(`${this.baseApiUrl}/patrol-list`, {}); }
  getActivePatrols(companyId: number) { return this.http.post(`${this.baseApiUrl}/patrol-list`, { company_id: companyId }); }
  updatePatrolStats(patrolId: string, data: any) { return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/end`, data); }
  uploadPatrolPhoto(patrolId: string, photoData: any) { return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/photos`, photoData); }
  getCompletedPatrolLogs() { return this.http.post(`${this.baseApiUrl}/patrol-logs`, {}); }
  getPatrolsByCompany(companyId: number, dateFrom?: string, dateTo?: string) {
    let payload: any = { company_id: companyId };
    if (dateFrom) payload.date_from = dateFrom;
    if (dateTo) payload.date_to = dateTo;
    return this.http.post(`${this.baseApiUrl}/patrol-list`, payload);
  }
  getPatrolById(id: number | string) { return this.http.post(`${this.baseApiUrl}/patrol-logs`, { id: id }); }
  savePatrolLogs(payload: any) { return this.http.post(`${this.baseApiUrl}/save-patrol-logs`, payload); }
  updatePatrolLog(id: string | number, payload: any) { return this.http.put(`${this.baseApiUrl}/patrol-logs/${id}`, payload); }
  deletePatrolLog(id: string | number) { return this.http.delete(`${this.baseApiUrl}/patrol-logs/${id}`); }
  getPatrolPhotos(sessionId: string) { return this.http.post(`${this.baseApiUrl}/patrol/${sessionId}/getphotos`, {}); }
  saveSighting(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); }
  getAllMapSightings(companyId: number) { return this.http.get(`${this.baseApiUrl}/patrols/all-sightings?companyId=${companyId}`); }
  getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
    let params: any = { companyId: companyId.toString() };
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
  }

  // --- 8. ATTENDANCE (BEAT & ONSITE) ---
  notify() { return this.http.post(`${this.baseApiUrl}/notify`, {}); }
  markAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markAttendance`, payload); }
  markAttendanceExit(payload: any) { return this.http.post(`${this.baseApiUrl}/markAttendanceExit`, payload); }
  testGroupBy() { return this.http.post(`${this.baseApiUrl}/testGroupBy`, {}); }
  
  markSupervisorAttendance() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendance`, {}); }
  markSupervisorAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendanceExit`, {}); }
  markGuardAttendance() { return this.http.post(`${this.baseApiUrl}/markGuardAttendance`, {}); }
  markGuardAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markGuardAttendanceExit`, {}); }
  
  requestEntryAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestEntryAttendance`, payload); }
  updateAttendanceRequestStatus(payload: any) { return this.http.post(`${this.baseApiUrl}/updateAttendanceRequestStatus`, payload); }
  requestExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestExitAttendance`, payload); }
  
  getAttendanceRequests(companyId: string) { return this.http.post(`${this.baseApiUrl}/getAttendanceRequests`, { company_id: companyId }); }
  getAttendanceRequestDetails(id: string) { return this.http.post(`${this.baseApiUrl}/getAttendanceRequestDetails`, { id: id }); }
  
  attendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/attendanceGroupByGeoname`, {}); }
  allAttendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/allAttendanceGroupByGeoname`, {}); }
  getAttendanceFlag() { return this.http.post(`${this.baseApiUrl}/getAttendanceFlag`, {}); }
  
  getGuardsOnSite() { return this.http.post(`${this.baseApiUrl}/getGuardsOnSite`, {}); }
  getGuardAttendance() { return this.http.post(`${this.baseApiUrl}/getGuardAttendance`, {}); }
  
  markOfflineEntryAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEntryAttendance`, payload); }
  markOfflineExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineExitAttendance`, payload); }
  markOfflineEmergencyAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEmergencyAttendance`, payload); }
  
  applyWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/applyWeekoff`, payload); }
  getWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/getWeekoff`, payload); }
  getUserMonthlyAttendance(companyId: string) { return this.http.post(`${this.baseApiUrl}/getUserMonthlyAttendance`, { company_id: companyId }); }

  getAttendanceLogsByRanger(companyId: string) { return this.getUserMonthlyAttendance(companyId); }
  getAttendanceByCompany(companyId: string) { return this.getAttendanceRequests(companyId); }
  markOnsiteAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/onsite-attendance`, payload); }
  getPendingOnsiteRequests(companyId: string) { return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}/pending`); }
  updateOnsiteStatus(id: number, status: 'approved' | 'rejected') { return this.http.patch(`${this.baseApiUrl}/onsite-attendance/${id}/status`, { status }); }
  getOnsiteLogsByRanger(rangerId: string) { return this.http.get(`${this.baseApiUrl}/onsite-attendance/ranger/${rangerId}`); }
  getApprovedOnsiteByCompany(companyId: string) { return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}`); }
  getWeeklyAttendanceStats(companyId: any, rangerId?: any) {
    let url = `${this.baseApiUrl}/attendance/stats/weekly?companyId=${companyId}`;
    if (rangerId) url += `&rangerId=${rangerId}`;
    return this.http.get<number[]>(url);
  }

  // --- 9. ASSETS MANAGEMENT ---
  addAsset(assetData: any): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset/create`, assetData); }
  updateAsset(id: string | number, assetData: any): Observable<any> { return this.http.put(`${this.baseApiUrl}/asset/${id}/update`, assetData); }
  deleteAsset(id: string | number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset/${id}/delete`, {}); }
  getAssets(companyId: number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset-list`, { company_id: companyId }); }
  getMyAssets(companyId: number, userId: number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset-list`, { company_id: companyId, created_by: userId }); }
  getAssetDetail(id: string | number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset/detail`, { id: id }); }
  downloadAssetReport(payload: any) { 
    return this.http.post(`${this.baseApiUrl}/asset-report`, payload, { responseType: 'blob', observe: 'response' }); 
  }

  getAssetStats(companyId: number): Observable<any> { return this.http.get(`${this.baseApiUrl}/admin/assets/stats/${companyId}`); }
  getAssetTrend(companyId: number): Observable<any> { return this.http.get(`${this.baseApiUrl}/assets/assets-trend?company_id=${companyId}`); }
  getAssetsTrend(companyId: number): Observable<any> { return this.getAssetTrend(companyId); }
  getAssetCategories(companyId: any): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/assets/categories/${companyId}`); }
  getAssetStatuses(companyId: number) { return this.http.get(`${this.baseApiUrl}/assets/statuses/company/${companyId}`); }
  getCategories(companyId: any) { return this.http.get(`${this.baseApiUrl}/assets/categories/${companyId}`); }
  getStatuses(companyId: any) { return this.http.get(`${this.baseApiUrl}/assets/statuses/${companyId}`); }

  // --- 10. ANALYTICS ---
  getAssetsAnalytics(companyId: number, startDate?: string, endDate?: string) {
    let url = `${this.baseApiUrl}/admin/analytics/assets?companyId=${companyId}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    return this.http.get(url);
  }
  getEventsAnalytics(companyId: number, timeframe: string, startDate?: string, endDate?: string) {
    let url = `${this.baseApiUrl}/admin/analytics/events?companyId=${companyId}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    return this.http.get(url);
  }
  
  // FIX: Admin Analytics Missing Function
  getSubCategoryAnalytics(companyId: number, category: string, subCategory: string, timeframe: string, startDate?: string, endDate?: string): Observable<any> {
    let url = `${this.baseApiUrl}/admin/analytics/subcategory-details?companyId=${companyId}&category=${category}&subCategory=${encodeURIComponent(subCategory)}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    return this.http.get(url);
  }

  getForestKPIs(companyId: number, timeframe: string, category: string) {
    let params = { companyId: companyId, timeframe: timeframe, range: timeframe, category: category };
    return this.http.get(`${this.baseApiUrl}/forest-events/analytics/kpi`, { params });
  }

  // FIX: Admin Map Missing Function
  getForestMapData(companyId: number, range?: string): Observable<any[]> {
    const params = range ? `?range=${range}` : '';
    return this.http.get<any[]>(`${this.baseApiUrl}/forest-events/map-data/${companyId}${params}`);
  }

  getCriminalAnalytics(companyId: any, timeframe: string, range: string, beat: string): Observable<any> {
    const url = `${this.baseApiUrl}/incidents/analytics/criminal`;
    const params = { companyId: companyId.toString(), timeframe: timeframe || 'month', range: range || 'all', beat: beat || 'all' };
    return this.http.get(url, { params });
  }
  getFireAnalytics(companyId: any, timeframe: string, range: string, beat: string) {
    const params = { companyId: companyId.toString(), timeframe, range, beat };
    return this.http.get(`${this.baseApiUrl}/incidents/analytics/fire`, { params });
  }

  // --- 11. ALERTS & SOS ---
  sendSOSAlert(payload: any) { return this.http.post(`${this.baseApiUrl}/alerts/sos`, payload); }
  getLatestAlerts(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`); }
  getAlertsByCompany(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/company/${companyId}`); }

  // --- 12. PASSWORD & OTP ---
  requestPasswordReset(phoneNo: string) { return this.http.post(`${this.baseApiUrl}/rangers/forgot-password`, { phoneNo }); }
  verifyOtp(phoneNo: string, otp: string) { return this.http.post(`${this.baseApiUrl}/rangers/verify-otp`, { phoneNo, otp }); }
  resetPassword(phoneNo: string, otp: string, newPass: string) { return this.http.post(`${this.baseApiUrl}/rangers/reset-password`, { phoneNo, otp, newPass }); }

  // --- 13. FOREST EVENTS & UTILS ---
  submitForestEvent(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); }
  downloadReport(endpoint: string, payload: any) { 
    return this.http.post(`${this.baseApiUrl}/${endpoint}`, payload, { responseType: 'blob', observe: 'response' }); 
  }
  get(endpoint: string) { return this.http.get(`${this.baseApiUrl}/${endpoint}`); }

  // --- 14. NEW ENDPOINTS FROM FMS COLLECTION ---
  getForestReportConfigs() { return this.http.get(`${this.baseApiUrl}/forest-report-configs`); }
  
  getForestReports(params?: any) { return this.http.get(`${this.baseApiUrl}/forest-reports`, { params }); }
  showForestReport(id: string | number, params?: any) { return this.http.get(`${this.baseApiUrl}/forest-reports/${id}`, { params }); }
  createForestReport(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); }
  updateForestReport(id: string | number, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports/${id}/update`, payload); }
  deleteForestReport(id: string | number, payload?: any) { return this.http.request('delete', `${this.baseApiUrl}/forest-reports/${id}`, { body: payload }); }
  takeActionOnReport(reportId: string | number, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports/${reportId}/action`, payload); }
  
  // --- 17. GEOFENCING & SITES ---
  addSite(payload: any) { return this.http.post(`${this.baseApiUrl}/addSite`, payload); }
  updateSite(payload: any) { return this.http.post(`${this.baseApiUrl}/updateSite`, payload); }
  getGuardSite(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardSite`, payload); }
  getGuardSiteLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardSiteLocation`, payload); }
  addGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/addGeofence`, payload); }
  updateGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/updateGeofence`, payload); }
  deleteGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteGeofence`, payload); }
  getGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getGeofences`, payload); }
  getSiteGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getSiteGeofences`, payload); }
  getGeofenceDetails(payload: any) { return this.http.post(`${this.baseApiUrl}/getGeofenceDetails`, payload); }
  addGeofenceMultiGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/addGeofenceMultiGuard`, payload); }
  getSupervisorSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getSupervisorSites`, payload); }
  getSupervisorPrimaryGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/getSupervisorPrimaryGeofence`, payload); }
  getGuardsAssociatedWithGeo(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardsAssociatedWithGeo`, payload); }
  getGuardGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardGeofence`, payload); }
  getAllGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getAllGeofences`, payload); }
  deleteGeofenceMultiGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteGeofenceMultiGuard`, payload); }
  getClientSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getClientSites`, payload); }
  getSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getSites`, payload); }
  getTrackSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getTrackSites`, payload); }
  assignSupervisorsToSites(payload: any) { return this.http.post(`${this.baseApiUrl}/assignSupervisorsToSites`, payload); }
  deleteSiteFromSupervisor(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteSiteFromSupervisor`, payload); }
  deleteSite(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteSite`, payload); }
  getNearByGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getNearByGeofences`, payload); }

  // --- LOCATION / GPS APIs ---
  getLocations(payload: any) { return this.http.post(`${this.baseApiUrl}/locations`, payload); }
  getGuardLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardLiveLocation`, payload); }
  getLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getLiveLocation`, payload); }
  getLiveLocationSiteWise(payload: any) { return this.http.post(`${this.baseApiUrl}/getLiveLocationSiteWise`, payload); }
  getAllGuardLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getAllGuardLiveLocation`, payload); }
  getPlayback(payload: any) { return this.http.post(`${this.baseApiUrl}/getPlayback`, payload); }
  storeLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/storeLocation`, payload); }
  storeLocationBG(payload: any) { return this.http.post(`${this.baseApiUrl}/storeLocationBG`, payload); }
  
  getBeatBoundaries() { return this.http.post(`${this.baseApiUrl}/boundary/beats`, {}); }
  // --- 15. HIERARCHY & MAP DATA ---
  getBeatMapData() { return this.http.get(`${this.baseApiUrl}/beat-map-data`); }
  getBoundaryData() { return this.http.get(`${this.baseApiUrl}/data`); }
  getLayers() { return this.http.get(`${this.baseApiUrl}/layers`); }
  getYears() { return this.http.get(`${this.baseApiUrl}/years`); }
  getRanges() { return this.http.get(`${this.baseApiUrl}/ranges`); }
  getSections(rangeId: string | number) { return this.http.get(`${this.baseApiUrl}/sections/${rangeId}`); }
  getBeats(sectionId?: string | number) { return this.http.get(`${this.baseApiUrl}/beats${sectionId ? '/' + sectionId : ''}`); }

  // --- 15.1 PLANTATIONS ---
  getPlantations() { return this.http.get(`${this.baseApiUrl}/plantations`); }
  createPlantation(payload: any) { return this.http.post(`${this.baseApiUrl}/plantations`, payload); }
  getPlantationById(id: string | number) { return this.http.get(`${this.baseApiUrl}/plantations/${id}`); }
  addPlantationObservation(id: string | number, payload: any) { return this.http.post(`${this.baseApiUrl}/plantations/${id}/observations`, payload); }

  // --- 16. COMMUNICATION (CHAT/NOTIFY) ---
  postUpdate(payload: any) { return this.http.post(`${this.baseApiUrl}/postUpdate`, payload); }
  getUpdates() { return this.http.post(`${this.baseApiUrl}/getUpdates`, {}); }
  getChatUsers() { return this.http.post(`${this.baseApiUrl}/getChatUsers`, {}); }
  getConversations() { return this.http.post(`${this.baseApiUrl}/getConversations`, {}); }
  getChatHistory(payload: any) { return this.http.post(`${this.baseApiUrl}/getChatHistory`, payload); }
  getGroupChatHistory(payload: any) { return this.http.post(`${this.baseApiUrl}/getGroupChatHistory`, payload); }
  createGroup(payload: any) { return this.http.post(`${this.baseApiUrl}/createGroup`, payload); }
  uploadChatFile(payload: any) { return this.http.post(`${this.baseApiUrl}/uploadFile`, payload); }

  // --- 17. FIELD VISITS / CLIENT VISITS ---
  addClientVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/addClientVisit`, payload); }
  updateClientVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/updateClientVisit`, payload); }
  getClientVisits() { return this.http.post(`${this.baseApiUrl}/getClientVisits`, {}); }
  getClientFollowUps() { return this.http.post(`${this.baseApiUrl}/getClientFollowUps`, {}); }
  getFieldVisitList() { return this.http.post(`${this.baseApiUrl}/list`, {}); }
  getFieldVisitDetail(payload: any) { return this.http.post(`${this.baseApiUrl}/detail`, payload); }
  createFieldVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/create`, payload); }
  updateFieldVisit(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/${id}/update`, payload); }
  deleteFieldVisit(id: string) { return this.http.post(`${this.baseApiUrl}/${id}/delete`, {}); }
  syncFieldVisits() { return this.http.post(`${this.baseApiUrl}/sync`, {}); }

  // --- 18. INCIDENCE REPORTING ---
  reportIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/reportIncidence`, payload); }
  incidenceAction(payload: any) { return this.http.post(`${this.baseApiUrl}/incidenceAction`, payload); }
  actionTakenOnIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/actionTakenOnIncidence`, payload); }
  getIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidence`, payload); }
  getIncidenceDetails(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceDetails`, payload); }
  getReportIncidenceCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getReportIncidenceCheckList`, payload); }
  getIncidenceActionCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceActionCheckList`, payload); }
  getIncidenceTypeCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceTypeCheckList`, payload); }
  getIncidenceSiteList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceSiteList`, payload); }
  getIncidenceTypeList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceTypeList`, payload); }
  addIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/addIncidenceType`, payload); }
  updateIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/updateIncidenceType`, payload); }
  deleteIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteIncidenceType`, payload); }
  getIncidenceSubTypeList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceSubTypeList`, payload); }
  addIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/addIncidenceSubType`, payload); }
  updateIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/updateIncidenceSubType`, payload); }
  deleteIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteIncidenceSubType`, payload); }

<<<<<<< Updated upstream
  // --- 19. TASK MANAGEMENT ---
  addTask(payload: any) { return this.http.post(`${this.baseApiUrl}/addTask`, payload); }
  getTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/getTasks`, payload); }
  updateTask(payload: any) { return this.http.post(`${this.baseApiUrl}/updateTask`, payload); }
  deleteTask(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteTask`, payload); }
  getForestTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks`, payload); }
  storeForestTask(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/store`, payload); }
  deleteForestTask(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${id}/delete`, payload); }
  updateForestTaskStatus(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${id}/status`, payload); }
  updateTaskUserStatus(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/user-status`, payload); }
  delegateForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/delegate`, payload); }
  rejectForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/reject-status`, payload); }
  updateForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/update`, payload); }
  getForestTaskReminders(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/reminders`, payload); }
  bulkDeleteForestTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/bulk-delete`, payload); }
  getAssignableUsers(payload: any) { return this.http.post(`${this.baseApiUrl}/assignable-users`, payload); }
=======
  return this.http.get(`${this.baseApiUrl}/forest-events/analytics/kpi`, { params });
}

getForestMapData(companyId: number, range?: string): Observable<any[]> {
  const params = range ? `?range=${range}` : '';
  return this.http.get<any[]>(`${this.baseApiUrl}/forest-events/map-data/${companyId}${params}`);
}

downloadReport(payload: any) {
  return this.http.post(`${this.baseApiUrl}/reports/generate`, payload, {
    responseType: 'blob', // Important: File ke liye blob chahiye
    observe: 'response'   // Response headers check karne ke liye
  });
}

getForestEventById(id: number): Observable<any> {
  return this.http.get(`${this.baseApiUrl}/forest-events/${id}`);
}

  // --- DYNAMIC FORM CONFIGURATION ---

  saveFormConfig(config: any) {
    return this.http.post(`${this.baseApiUrl}/forest-events/configs`, config);
  }

  getFormConfig(category: string, type: string) {
    const companyId = this.getUserCompanyId() || 0;
    return this.http.get(`${this.baseApiUrl}/forest-events/configs/fetch`, {
      params: { category, type, companyId: companyId.toString() }
    });
  }
>>>>>>> Stashed changes

  getAllConfigs() {
    const companyId = this.getUserCompanyId() || 0;
    return this.http.get(`${this.baseApiUrl}/forest-events/configs/all`, {
      params: { companyId: companyId.toString() }
    });
  }
}
