import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DataService {
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;
  private selectedAttendance: any;
  private selectedAsset: any;

  // Bridge for Sidebar Refresh
  public loginSuccess$ = new Subject<void>();
  public syncCompleted$ = new Subject<void>();

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
  getProfile() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getProfile`, formData);
  }
  // Fetch another user's profile by their ID (admin access)
  getProfileById(userId: string | number) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('user_id', String(userId));
    formData.append('guard_id', String(userId));
    formData.append('ranger_id', String(userId));
    return this.http.post(`${this.baseApiUrl}/getProfile`, formData);
  }
  // Try getUserDetails endpoint (Sir's API variant)
  getUserDetails(userId: string | number, companyId: string | number) {
    const formData = new FormData();
    formData.append('user_id', String(userId));
    formData.append('company_id', String(companyId));
    
    const token = localStorage.getItem('api_token');
    if (token) formData.append('api_token', token);
    
    return this.http.post(`${this.baseApiUrl}/getUserDetails`, formData);
  }
  verifyOtp(phone: string, otp: string) { return this.http.post(`${this.baseApiUrl}/verifyUser`, { phoneNo: phone, otp: otp }); }
  updateProfilePic(photoBase64: string) { return this.http.post(`${this.baseApiUrl}/updateProfilePic`, { photo: photoBase64 }); }
  
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
    const token = localStorage.getItem('api_token');
    let params: any = {};
    if (from) params['date_from'] = from;
    if (to) params['date_to'] = to;
    
    // Manually pass Authorization Header. 
    // This triggers our Interceptor to SKIP adding api_token to the URL, 
    // bypassing the server's SQL syntax bug.
    const headers = { 'Authorization': `Bearer ${token}` };
    
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data`, { params, headers });
  }
  getAdminStats(companyId: number, timeframe?: string, from?: string, to?: string) {
    let params = `?timeframe=${timeframe || 'today'}`;
    if (from) params += `&startDate=${from}`;
    if (to) params += `&endDate=${to}`;
    return this.http.get(`${this.baseApiUrl}/assets/stats/${companyId}${params}`);
  }
  getForestAdminDashboard(companyId: number) { return this.getDashboardStats(companyId); }

  // --- 5. RANGER/PROFILE MANAGEMENT ---
  updateRanger(data: any) {
    // Replaced deprecated /rangers/update with Sir's /updateUserDetails endpoint.
    // Conforming strictly to FormData API payload requirements.
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
        formData.append(key, String(data[key]));
      }
    }
    
    return this.http.post(`${this.baseApiUrl}/updateUserDetails`, formData);
  }

  changePassword(data: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
        formData.append(key, String(data[key]));
      }
    }
    
    return this.http.post(`${this.baseApiUrl}/changePassword`, formData);
  }

  getRangerProfile(id: string) { return this.http.get(`${this.baseApiUrl}/rangers/${id}`); }
  getRangersByCompany(companyId: string) { return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`); }
  getUsersByCompany(companyId: any) { return this.http.get(`${this.baseApiUrl}/users/company/${companyId}`); }

  // --- 6. INCIDENTS (Aligned with Postman) ---
  getIncidentsByRanger() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    const id = this.getRangerId();
    formData.append('api_token', token);
    formData.append('ranger_id', id || '');
    return this.http.post(`${this.baseApiUrl}/getIncidence`, formData);
  }
  reportNewIncident(incidentData: any) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in incidentData) {
      if (key === 'images' && Array.isArray(incidentData[key])) {
        incidentData[key].forEach((img: any) => formData.append('images[]', img));
      } else {
        formData.append(key, String(incidentData[key]));
      }
    }
    return this.http.post(`${this.baseApiUrl}/reportIncidence`, formData); 
  }
  getIncidentsByCompany(companyId: string) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId);
    return this.http.post(`${this.baseApiUrl}/getIncidence`, formData); 
  }
  getIncidentsForMap(companyId: number) { 
    return this.getIncidentsByCompany(String(companyId));
  }
  getIncidentTrend(companyId: number): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    return this.http.post(`${this.baseApiUrl}/incidents/trend/${companyId}`, formData); 
  }

  // --- 7. PATROLS & SIGHTINGS (Aligned with Postman) ---
  startActivePatrol(payload: any) { 
    const token = localStorage.getItem('api_token') || '';
    const finalPayload = {
      api_token: token,
      ...payload
    };
    return this.http.post(`${this.baseApiUrl}/patrol/start`, finalPayload); 
  }
  getOngoingPatrols() { 
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/patrol-list`, { api_token: token }); 
  }
  getActivePatrols(companyId: number) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    return this.http.post(`${this.baseApiUrl}/patrol-list`, formData); 
  }
  updatePatrolStats(patrolId: string, data: any) { 
    // Aligned with official Postman collection: POST /patrol/{{sessionId}}/end
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      ...data
    };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/end`, payload); 
  }
  uploadPatrolPhoto(patrolId: string, photoData: any) { 
    // Aligned with official Postman collection: POST /patrol/{{sessionId}}/photos
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      photo: photoData.photo
    };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/photos`, payload); 
  }
  getCompletedPatrolLogs() { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/patrol-logs`, formData); 
  }
  getPatrolsByCompany(companyId: number, dateFrom?: string, dateTo?: string) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    if (dateFrom) formData.append('date_from', dateFrom);
    if (dateTo) formData.append('date_to', dateTo);
    return this.http.post(`${this.baseApiUrl}/patrol-list`, formData);
  }
  getPatrolById(id: number | string) { 
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      id: String(id),
      patrol_id: String(id) // Fallback for different backend versions
    };
    return this.http.post(`${this.baseApiUrl}/patrol-logs`, payload); 
  }
  saveSighting(payload: any) { 
    return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); 
  }
  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  submitForestEvent(payload: any, headers?: any) {
    // Sir's precise API accepts Raw application/json mapping, NOT FormData!
    const finalPayload = { 
      ...payload, 
      site_id: payload.site_id || null 
    };

    return this.http.post(`${this.baseApiUrl}/forest-reports`, finalPayload, { headers });
  }
  savePatrolLogs(payload: any) { return this.http.post(`${this.baseApiUrl}/save-patrol-logs`, payload); }
  updatePatrolLog(id: string | number, payload: any) { return this.http.put(`${this.baseApiUrl}/patrol-logs/${id}`, payload); }
  deletePatrolLog(id: string | number) { return this.http.delete(`${this.baseApiUrl}/patrol-logs/${id}`); }
  getPatrolPhotos(sessionId: string) { 
    return this.http.post(`${this.baseApiUrl}/patrol/${sessionId}/getphotos`, {}); 
  }
  getAllMapSightings(companyId: number) { return this.http.get(`${this.baseApiUrl}/patrols/all-sightings?companyId=${companyId}`); }
  getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
    let params: any = { companyId: companyId.toString() };
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
  }

  // --- 8. ATTENDANCE (BEAT & ONSITE) ---
  notify() { return this.http.post(`${this.baseApiUrl}/notify`, {}); }
  
  markAttendance(payload: any, headers?: any) { 
    return this.http.post(`${this.baseApiUrl}/markAttendance`, payload, { headers }); 
  }
  
  markAttendanceExit(payload: any, headers?: any) { 
    return this.http.post(`${this.baseApiUrl}/markAttendanceExit`, payload, { headers }); 
  }

  testGroupBy() { return this.http.post(`${this.baseApiUrl}/testGroupBy`, {}); }
  
  markSupervisorAttendance() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendance`, {}); }
  markSupervisorAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendanceExit`, {}); }
  markGuardAttendance() { return this.http.post(`${this.baseApiUrl}/markGuardAttendance`, {}); }
  markGuardAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markGuardAttendanceExit`, {}); }
  
  requestEntryAttendance(payload: any, headers: any = {}) { 
    const token = localStorage.getItem('api_token');
    const finalHeaders = { 
      ...headers, 
      'Bypass-Token': 'true',
      'Authorization': `Bearer ${token}` 
    };
    return this.http.post(`${this.baseApiUrl}/requestEntryAttendance`, payload, { headers: finalHeaders }); 
  }
  updateAttendanceRequestStatus(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    const id = payload.id || payload.attendance_id || payload.request_id || payload.recordId;
    const companyId = payload.company_id || localStorage.getItem('company_id');

    // Aligned with Postman collection: Uses 'recordId' and 'formdata' mode
    const formData = new FormData();
    formData.append('recordId', String(id));
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    
    // Logic fields
    formData.append('status', payload.status || 'approved');
    formData.append('remark', payload.remark || 'Onsite Attendance');
    
    // Contextual fields for safety
    if (payload.guard_id) formData.append('guard_id', String(payload.guard_id));
    if (payload.role_id) formData.append('role_id', String(payload.role_id));

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };

    return this.http.post(`${this.baseApiUrl}/updateAttendanceRequestStatus`, formData, { headers }); 
  }
  requestExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestExitAttendance`, payload); }
  
  getAttendanceRequests(companyId: string) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId);
    return this.http.post(`${this.baseApiUrl}/getAttendanceRequests`, formData); 
  }

  // --- Aliases for compatibility ---
  getPendingOnsiteRequests(companyId: string) { return this.getAttendanceRequests(companyId); }
  updateOnsiteStatus(id: number, status: string) { 
    return this.updateAttendanceRequestStatus({ id: id, status: status }); 
  }
  getAttendanceRequestDetails(id: string) { 
    const token = localStorage.getItem('api_token');
    const payload = { api_token: token, id: id };
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/getAttendanceRequestDetails`, payload, { headers }); 
  }
  
  attendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/attendanceGroupByGeoname`, {}); }
  allAttendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/allAttendanceGroupByGeoname`, {}); }
  getAttendanceFlag() { return this.http.post(`${this.baseApiUrl}/getAttendanceFlag`, {}); }
  
  getGuardsOnSite() { return this.http.post(`${this.baseApiUrl}/getGuardsOnSite`, {}); }
  getGuardAttendance() { return this.http.post(`${this.baseApiUrl}/getGuardAttendance`, {}); }
  
  markOfflineEntryAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEntryAttendance`, payload, { headers }); }
  markOfflineExitAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/markOfflineExitAttendance`, payload, { headers }); }
  markOfflineEmergencyAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/uploadOfflineAttendanceRequest`, payload, { headers }); }
  
  applyWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/applyWeekoff`, payload); }
  getWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/getWeekoff`, payload); }
  getUserMonthlyAttendance(payload: any, headers?: any) { 
    // Usually history needs token in body too to match Sir's API style
    return this.http.post(`${this.baseApiUrl}/getUserMonthlyAttendance`, payload, { headers }); 
  }

  getAttendanceLogsByRanger(companyId: string) { 
    const token = localStorage.getItem('api_token');
    const payload = { company_id: companyId, api_token: token };
    const headers = { 'Bypass-Token': 'true' };
    return this.getUserMonthlyAttendance(payload, headers); 
  }
  
  getAttendanceByCompany(companyId: string) { return this.getAttendanceRequests(companyId); }
  
  markOnsiteAttendance(payload: any, headers?: any) { 
    // Reverting to requestEntryAttendance for onsite approval workflow
    return this.requestEntryAttendance(payload, headers); 
  }
  
  getOnsiteLogsByRanger(rangerId: string, companyId: string) { 
    const token = localStorage.getItem('api_token');
    const now = new Date();
    const payload = { 
      company_id: companyId, 
      api_token: token, 
      ranger_id: rangerId,
      user_id: rangerId, // Sir's API often expects user_id
      month: now.getMonth() + 1,
      year: now.getFullYear()
    };
    const headers = { 'Bypass-Token': 'true' };
    return this.getUserMonthlyAttendance(payload, headers); 
  }
  getWeeklyAttendanceStats(companyId: any, rangerId?: any): Observable<number[]> {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    
    // Using both camelCase and snake_case for maximum compatibility with various backend versions
    const params: any = { 
      type: 'attendance', 
      companyId: companyId.toString(),
      company_id: companyId.toString(),
      user_id: rangerId ? rangerId.toString() : '' // Added user_id for Sir's API compatibility
    };
    if (rangerId) {
      params.rangerId = rangerId.toString();
      params.ranger_id = rangerId.toString();
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.get<any>(url, { params, headers }).pipe(
      map(res => {
        // Robust mapping to handle different response structures from Sir's API
        const data = res?.data ? res.data : res;
        
        // 1. Direct number array [0, 5, 2, ...]
        if (Array.isArray(data) && (data.length === 0 || typeof data[0] === 'number')) {
          return data.length === 7 ? data : [...data, 0, 0, 0, 0, 0, 0, 0].slice(0, 7);
        }
        
        // 2. Nested history objects
        const history = data?.officerStatus?.history || data?.history || data?.attendance_history;
        if (Array.isArray(history)) return history;

        // 3. Array of objects with count property [{count: 5}, {count: 2}, ...]
        if (Array.isArray(data) && data.length > 0 && (data[0]?.count !== undefined || data[0]?.total !== undefined)) {
          return data.map((item: any) => Number(item.count || item.total || 0));
        }

        return [0, 0, 0, 0, 0, 0, 0];
      }),
      catchError(err => {
        console.warn("⚠️ Attendance API failing, using fallback empty data:", err);
        return of([0, 0, 0, 0, 0, 0, 0]);
      })
    );
  }




  

  // --- 9. ASSETS MANAGEMENT ---
  addAsset(assetData: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in assetData) {
      if (Array.isArray(assetData[key])) {
        assetData[key].forEach((val: any) => formData.append(`${key}[]`, val));
      } else {
        formData.append(key, assetData[key]);
      }
    }
    return this.http.post(`${this.baseApiUrl}/asset/create`, formData, {
      headers: { 'Bypass-Token': 'true' }
    }); 
  }
  updateAsset(id: any, payload: any): Observable<any> {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);

    for (const key in payload) {
      if (payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    }
    return this.http.post(`${this.baseApiUrl}/asset/${id}/update`, formData, {
      headers: { 'Bypass-Token': 'true' }
    });
  }
  deleteAsset(id: string | number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset/${id}/delete`, {}); }
  getAssets(companyId: number): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId.toString());
    
    return this.http.post(`${this.baseApiUrl}/asset-list`, formData, {
      headers: { 'Bypass-Token': 'true' }
    }); 
  }
  getMyAssets(companyId: number, userId: number): Observable<any> { 
    const formData = new FormData();
    formData.append('company_id', companyId.toString());
    formData.append('created_by', userId.toString());
    return this.http.post(`${this.baseApiUrl}/asset-list`, formData); 
  }
  getAssetDetail(id: string | number): Observable<any> { 
    const formData = new FormData();
    formData.append('id', id.toString());
    return this.http.post(`${this.baseApiUrl}/asset/detail`, formData); 
  }
  downloadAssetReport(payload: any) { 
    return this.http.post(`${this.baseApiUrl}/asset-report`, payload, { responseType: 'blob', observe: 'response' }); 
  }

  getAssetStats(companyId: number): Observable<any> {
    const token = localStorage.getItem('api_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data?type=assets&companyId=${companyId}`, { headers });
  }
  getAssetTrend(companyId: number): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');
    
    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };
    
    return this.http.post(`${this.baseApiUrl}/assets/assets-trend`, formData, { headers }); 
  }
  getAssetsTrend(companyId: number): Observable<any> { return this.getAssetTrend(companyId); }
  getAssetCategories(companyId: any): Observable<any[]> { return this.getCategories(companyId); }
  getAssetStatuses(companyId: number): Observable<any> { return this.getStatuses(companyId); }
  // getCategories(companyId: any): Observable<any> { 
  //   const formData = new FormData();
  //   const token = localStorage.getItem('api_token') || '';
  //   formData.append('api_token', token);
  //   formData.append('company_id', companyId.toString());
    
  //   const headers = { 
  //     'Accept': 'application/json'
  //   };
    
  //   return this.http.post(`${this.baseApiUrl}/assets/categories`, formData, { headers }); 
  // }
  // getStatuses(companyId: any): Observable<any> { 
  //   const formData = new FormData();
  //   const token = localStorage.getItem('api_token') || '';
  //   formData.append('api_token', token);
  //   formData.append('company_id', companyId.toString());
    

  // --- UPDATED: EXACT MATCH WITH POSTMAN COLLECTION ---

  getCategories(companyId: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');

    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true' // Prevents interceptor from injecting Bearer token if it conflicts
    };

    return this.http.post(`${this.baseApiUrl}/assets/categories`, formData, { headers }).pipe(
      catchError(err => {
        console.warn("Backend categories API failed, using fallback", err);
        return of([
          { id: 1, name: 'Vehicles (Jeeps/Bikes)' },
          { id: 2, name: 'Communication (Walkie Talkies)' },
          { id: 3, name: 'Field Tools (Drones/Cameras)' },
          { id: 4, name: 'Office Assets' }
        ]);
      })
    );
  }

  getStatuses(companyId: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');

    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };

    return this.http.post(`${this.baseApiUrl}/assets/statuses`, formData, { headers }).pipe(
      catchError(err => {
        console.warn("Backend statuses API failed, using fallback", err);
        return of([
          { id: 1, status_name: 'Operational (Good)' },
          { id: 2, status_name: 'Maintenance Needed' },
          { id: 3, status_name: 'Out of Order / Broken' }
        ]);
      })
    );
  }

  // --- 10. ANALYTICS ---
  getAssetsAnalytics(companyId: number, startDate?: string, endDate?: string) {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=assets&companyId=${companyId}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  getEventsAnalytics(companyId: number, timeframe: string, startDate?: string, endDate?: string) {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=events&companyId=${companyId}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  
  // FIX: Admin Analytics Missing Function
  getSubCategoryAnalytics(companyId: number, category: string, subCategory: string, timeframe: string, startDate?: string, endDate?: string): Observable<any> {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=subcategory-details&companyId=${companyId}&category=${category}&subCategory=${encodeURIComponent(subCategory)}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  getCriminalAnalytics(companyId: any, timeframe: string, range: string, beat: string): Observable<any> {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    const params = { type: 'criminal', companyId: companyId.toString(), timeframe: timeframe || 'month', range: range || 'all', beat: beat || 'all' };
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { params, headers });
  }
  getFireAnalytics(companyId: any, timeframe: string, range: string, beat: string) {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    const params = { type: 'fire', companyId: companyId.toString(), timeframe, range, beat };
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { params, headers });
  }

  // --- 11. ALERTS & SOS ---
  sendSOSAlert(payload: any) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('latitude', payload.latitude || '');
    formData.append('longitude', payload.longitude || '');
    formData.append('message', payload.message || 'Emergency SOS Triggered');
    
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };
    
    return this.http.post(`${this.baseApiUrl}/alerts/sos`, formData, { headers }); 
  }
  getLatestAlerts(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`); }
  getAlertsByCompany(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/company/${companyId}`); }

  // --- 12. PASSWORD & OTP ---
  requestPasswordReset(phoneNo: string) { return this.http.post(`${this.baseApiUrl}/resetPassword`, { phoneNo }); }
  resetPassword(phoneNo: string, otp: string, newPass: string) { return this.http.post(`${this.baseApiUrl}/resetPassword`, { phoneNo, otp, newPass }); }


  get(endpoint: string) { return this.http.get(`${this.baseApiUrl}/${endpoint}`); }

  // --- 14. NEW ENDPOINTS FROM FMS COLLECTION ---
  getForestReportConfigs() { return this.http.get(`${this.baseApiUrl}/forest-report-configs`); }
  
  getForestReports(paramsOrCategory?: any) { 
    let url = `${this.baseApiUrl}/forest-reports`;
    
    if (typeof paramsOrCategory === 'string') {
      const params = { category: paramsOrCategory };
      return this.http.get(url, { params });
    } else if (paramsOrCategory && typeof paramsOrCategory === 'object') {
      return this.http.get(url, { params: paramsOrCategory });
    }
    
    return this.http.get(url);
  }
  getSitesList(companyId: string) {
    const token = localStorage.getItem('api_token');
    return this.http.post(`${this.baseApiUrl}/getSites`, { 
      company_id: companyId, 
      api_token: token 
    });
  }
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
  getGuardGeofence(payload: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...payload, api_token: token };
    return this.http.post(`${this.baseApiUrl}/getGuardGeofence`, fullPayload); 
  }
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

  // --- 16. COMMUNICATION (CHAT/NOTIFY) ALIGNED WITH SIR'S API ---
  postUpdate(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/postUpdate`, formData);
  }

  getUpdates() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getUpdates`, formData);
  }

  getChatUsers() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getChatUsers`, formData);
  }

  getConversations() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getConversations`, formData);
  }

  getChatHistory(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/getChatHistory`, formData);
  }

  getGroupChatHistory(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/getGroupChatHistory`, formData);
  }

  createGroup(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/createGroup`, formData);
  }

  uploadChatFile(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/uploadFile`, formData);
  }

  // --- 17. FIELD VISITS ALIGNED WITH SIR'S API ---
  addClientVisit(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/addClientVisit`, formData);
  }
  updateClientVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/updateClientVisit`, payload); }
  getClientVisits() { return this.http.post(`${this.baseApiUrl}/getClientVisits`, {}); }
  getClientFollowUps() { return this.http.post(`${this.baseApiUrl}/getClientFollowUps`, {}); }
  getFieldVisitList() { return this.http.post(`${this.baseApiUrl}/list`, {}); }
  getFieldVisitDetail(payload: any) { return this.http.post(`${this.baseApiUrl}/detail`, payload); }
  createFieldVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/create`, payload); }
  updateFieldVisit(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/${id}/update`, payload); }

  // --- 18. OFFLINE DRAFTS & RECENT ACTIVITY ---
  
  // Check if internet is available
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  saveForestEventDraft(payload: any) {
    let drafts = this.getForestEventDrafts();
    
    // Check for duplicates to avoid bloating
    const isDuplicate = drafts.some(d => 
      d.category === payload.category && 
      d.report_type === payload.report_type && 
      d.latitude === payload.latitude
    );
    if (isDuplicate) return;

    drafts.push({
      ...payload,
      draftId: 'DRAFT-' + Date.now(),
      isDraft: true,
      createdAt: new Date().toISOString()
    });

    try {
      localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
    } catch (e) {
      if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
        console.warn('LocalStorage quota exceeded. Removing oldest drafts...');
        // Remove oldest 3 drafts to make space
        drafts = drafts.slice(-5); // Keep only the latest 5 drafts
        localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
      } else {
        throw e;
      }
    }
  }

  getForestEventDrafts(): any[] {
    const drafts = localStorage.getItem('forest_event_drafts');
    return drafts ? JSON.parse(drafts) : [];
  }

  deleteForestEventDraft(draftId: string) {
    let drafts = this.getForestEventDrafts();
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
  }

  saveRecentSubmission(payload: any) {
    const history = this.getRecentSubmissions();
    // Maintain only last 10 entries locally
    history.unshift({
      title: payload.report_type,
      date: payload.date_dateTime || new Date().toISOString(),
      category: payload.category,
      id: payload.report_id
    });
    if (history.length > 10) history.pop();
    localStorage.setItem('forest_recent_history', JSON.stringify(history));
  }

  getRecentSubmissions(): any[] {
    const history = localStorage.getItem('forest_recent_history');
    return history ? JSON.parse(history) : [];
  }

  // --- ATTENDANCE OFFLINE SUPPORT ---
  saveAttendanceDraft(payload: any, mode: 'beat' | 'onsite') {
    const drafts = this.getAttendanceDrafts(mode);
    drafts.push({
      ...payload,
      draftId: 'ATT-' + Date.now(),
      mode: mode,
      isOffline: true,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(`attendance_drafts_${mode}`, JSON.stringify(drafts));
  }

  getAttendanceDrafts(mode: 'beat' | 'onsite'): any[] {
    const drafts = localStorage.getItem(`attendance_drafts_${mode}`);
    return drafts ? JSON.parse(drafts) : [];
  }

  deleteAttendanceDraft(draftId: string, mode: 'beat' | 'onsite') {
    let drafts = this.getAttendanceDrafts(mode);
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem(`attendance_drafts_${mode}`, JSON.stringify(drafts));
  }

  // --- PATROL OFFLINE SUPPORT ---
  savePatrolDraft(payload: any, type: 'start' | 'end') {
    const drafts = this.getPatrolDrafts();
    drafts.push({
      ...payload,
      draftId: 'PAT-' + Date.now(),
      type: type,
      isOffline: true,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('patrol_drafts', JSON.stringify(drafts));
  }

  getPatrolDrafts(): any[] {
    const drafts = localStorage.getItem('patrol_drafts');
    return drafts ? JSON.parse(drafts) : [];
  }

  deletePatrolDraft(draftId: string) {
    let drafts = this.getPatrolDrafts();
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem('patrol_drafts', JSON.stringify(drafts));
  }

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

  getForestKPIs(companyId: number, range: string, category: string): Observable<any> {
    const params = { companyId, range, category, timeframe: range };
    return this.http.get(`${this.baseApiUrl}/forest-events/analytics/kpi`, { params });
  }

  getForestMapData(companyId: number, range?: string): Observable<any[]> {
    const params = range ? `?range=${range}` : '';
    return this.http.get<any[]>(`${this.baseApiUrl}/forest-events/map-data/${companyId}${params}`);
  }

  downloadReport(endpoint: string, payload: any) {
    return this.http.post(`${this.baseApiUrl}/${endpoint}`, payload, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  getForestEventById(id: number): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/forest-reports/${id}`);
  }

  saveFormConfig(config: any) {
    return this.http.post(`${this.baseApiUrl}/forest-reports/configs`, config);
  }

  getFormConfig(category: string, type: string) {
    const companyId = this.getUserCompanyId() || '1';
    const token = localStorage.getItem('api_token');
    
    // Sir's API (POST /getReportIncidenceCheckList)
    const payload = { 
      category: category, 
      report_type: type, 
      company_id: companyId.toString(),
      api_token: token 
    };
    
    const headers = { 'Bypass-Token': 'true' };
    return this.getReportIncidenceCheckList(payload);
  }

  getAllConfigs() {
    const companyId = this.getUserCompanyId() || 0;
    return this.http.get(`${this.baseApiUrl}/forest-reports/configs/all`, {
      params: { companyId: companyId.toString() }
    });
  }

  private isSyncing = false;

  // --- GLOBAL SYNC ENGINE ---
  async syncAllDrafts(): Promise<{ success: boolean; count: number; message?: string }> {
    if (!this.isOnline()) return { success: false, count: 0, message: 'Still Offline' };
    if (this.isSyncing) {
      console.log("🔄 Sync already in progress, skipping duplicate call...");
      return { success: false, count: 0, message: 'Sync in progress' };
    }

    this.isSyncing = true;
    console.log("🚀 STARTING GLOBAL SYNC...");
    let syncCount = 0;
    
    try {
      // 1. Sync Forest Events
      const eventDrafts = this.getForestEventDrafts();
      for (const draft of eventDrafts) {
        try {
          await this.submitForestEvent(draft).toPromise();
          this.deleteForestEventDraft(draft.draftId);
          syncCount++;
        } catch (e) { console.error("Sync Event Error", e); }
      }

      // 2. Sync Attendance (Beat)
      const beatDrafts = this.getAttendanceDrafts('beat');
      for (const draft of beatDrafts) {
        try {
          if (draft.mode_type === 'exit') {
            await this.markAttendanceExit(draft).toPromise();
          } else {
            await this.markAttendance(draft).toPromise();
          }
          this.deleteAttendanceDraft(draft.draftId, 'beat');
          syncCount++;
        } catch (e) { console.error("Sync Beat Error", e); }
      }

      // 3. Sync Attendance (Onsite)
      const onsiteDrafts = this.getAttendanceDrafts('onsite');
      for (const draft of onsiteDrafts) {
        try {
          await this.markOnsiteAttendance(draft).toPromise();
          this.deleteAttendanceDraft(draft.draftId, 'onsite');
          syncCount++;
        } catch (e) { console.error("Sync Onsite Error", e); }
      }

      // 4. Sync Patrols
      const patrolDrafts = this.getPatrolDrafts();
      const syncedPatrolIdsMap: {[key: string]: string} = {};

      for (const draft of patrolDrafts) {
        try {
          if (draft.type === 'start') {
            const res: any = await this.startActivePatrol(draft).toPromise();
            const newId = res?.data?.id || res?.id;
            if (newId && draft.sessionId) {
              syncedPatrolIdsMap[draft.sessionId] = newId.toString();
            }
          } else {
            const pId = draft.patrol_id || (draft.sessionId ? syncedPatrolIdsMap[draft.sessionId] : null);
            if (pId && pId !== 'undefined') {
              await this.updatePatrolStats(pId, draft).toPromise();
            } else {
              console.warn("Skipping end draft: No active Patrol ID found on server or locally.");
              continue;
            }
          }
          this.deletePatrolDraft(draft.draftId);
          syncCount++;
        } catch (e: any) { 
          if (e.status === 401 && e.error?.message?.includes('Another patrol is in progress')) {
            try {
              const ongoing: any = await this.getOngoingPatrols().toPromise();
              const list = ongoing?.data || ongoing || [];
              if (list.length > 0) {
                const pId = list[0].id || list[0].sessionId;
                if (pId && draft.sessionId) {
                  syncedPatrolIdsMap[draft.sessionId] = pId.toString();
                  this.deletePatrolDraft(draft.draftId);
                  syncCount++;
                  continue;
                }
              }
            } catch(recoveryErr) {}
          }
          console.error("Sync Patrol Error", e); 
        }
      }

      if (syncCount > 0) {
        this.syncCompleted$.next();
      }

      return { success: true, count: syncCount };
    } finally {
      this.isSyncing = false;
      console.log("🏁 GLOBAL SYNC FINISHED.");
    }
  }
}