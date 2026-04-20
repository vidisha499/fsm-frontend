
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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

  changePassword(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    const fullPayload = { 
      ...payload, 
      api_token: token 
    };
    return this.http.post(`${this.baseApiUrl}/changePassword`, fullPayload);
  }

  getRangerProfile(id: string) { return this.http.get(`${this.baseApiUrl}/rangers/${id}`); }
  getRangersByCompany(companyId: string) { return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`); }
  getUsersByCompany(companyId: any) { return this.http.get(`${this.baseApiUrl}/users/company/${companyId}`); }

  // --- 6. INCIDENTS ---
  getIncidentsByRanger() {
    const id = this.getRangerId();
    return this.http.get(`${this.baseApiUrl}/incidents/my-reports/${id}`);
  }
  reportNewIncident(incidentData: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...incidentData, api_token: token };
    return this.http.post(`${this.baseApiUrl}/reportIncidence`, fullPayload); 
  }
  getIncidentsByCompany(companyId: string) { return this.http.post(`${this.baseApiUrl}/getIncidence`, { company_id: companyId }); }
  getIncidentsForMap(companyId: number) { return this.http.get<any[]>(`${this.baseApiUrl}/incidents/company/${companyId}`); }
  getIncidentTrend(companyId: number): Observable<any> { return this.http.get(`${this.baseApiUrl}/incidents/trend/${companyId}`); }

  // --- 7. PATROLS & SIGHTINGS ---
  startActivePatrol(payload: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...payload, api_token: token };
    return this.http.post(`${this.baseApiUrl}/patrol/start`, fullPayload); 
  }
  getOngoingPatrols() { 
    const token = localStorage.getItem('api_token');
    return this.http.post(`${this.baseApiUrl}/patrol-list`, { api_token: token }); 
  }
  getActivePatrols(companyId: number) { 
    const token = localStorage.getItem('api_token');
    return this.http.post(`${this.baseApiUrl}/patrol-list`, { company_id: companyId, api_token: token }); 
  }
  updatePatrolStats(patrolId: string, data: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...data, api_token: token };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/end`, fullPayload); 
  }
  uploadPatrolPhoto(patrolId: string, photoData: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...photoData, api_token: token };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/photos`, fullPayload); 
  }
  getCompletedPatrolLogs() { return this.http.post(`${this.baseApiUrl}/patrol-logs`, {}); }
  getPatrolsByCompany(companyId: number, dateFrom?: string, dateTo?: string) {
    let payload: any = { company_id: companyId };
    if (dateFrom) payload.date_from = dateFrom;
    if (dateTo) payload.date_to = dateTo;
    return this.http.post(`${this.baseApiUrl}/patrol-list`, payload);
  }
  getPatrolById(id: number | string) { return this.http.post(`${this.baseApiUrl}/patrol-logs`, { id: id }); }
  saveSighting(payload: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...payload, api_token: token };
    return this.http.post(`${this.baseApiUrl}/forest-reports`, fullPayload); 
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
    // This allows MySQL strict types (integers, nulls) to be ingested directly without string constraint bugs.
    const token = localStorage.getItem('api_token') || '';
    
    // Inject api_token and securely enforce any null fallback values expected by Laravel.
    const finalPayload = { 
      ...payload, 
      api_token: token,
      site_id: payload.site_id || null // Force NULL explicitly instead of '' for relational constraints
    };

    const finalHeaders = headers || { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/forest-reports`, finalPayload, { headers: finalHeaders });
  }
  savePatrolLogs(payload: any) { return this.http.post(`${this.baseApiUrl}/save-patrol-logs`, payload); }
  updatePatrolLog(id: string | number, payload: any) { return this.http.put(`${this.baseApiUrl}/patrol-logs/${id}`, payload); }
  deletePatrolLog(id: string | number) { return this.http.delete(`${this.baseApiUrl}/patrol-logs/${id}`); }
  getPatrolPhotos(sessionId: string) { return this.http.post(`${this.baseApiUrl}/patrol/${sessionId}/getphotos`, {}); }
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
  
  requestEntryAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestEntryAttendance`, payload); }
  updateAttendanceRequestStatus(payload: any) { return this.http.post(`${this.baseApiUrl}/updateAttendanceRequestStatus`, payload); }
  requestExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestExitAttendance`, payload); }
  
  getAttendanceRequests(companyId: string) { return this.http.post(`${this.baseApiUrl}/getAttendanceRequests`, { company_id: companyId }); }
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
  
  markOfflineEntryAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEntryAttendance`, payload); }
  markOfflineExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineExitAttendance`, payload); }
  markOfflineEmergencyAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEmergencyAttendance`, payload); }
  
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
    // Point onsite to same main attendance endpoint to match Sir's API collection
    return this.markAttendance(payload, headers); 
  }
  getPendingOnsiteRequests(companyId: string) { return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}/pending`); }
  updateOnsiteStatus(id: number, status: 'approved' | 'rejected') { return this.http.patch(`${this.baseApiUrl}/onsite-attendance/${id}/status`, { status }); }
  getOnsiteLogsByRanger(rangerId: string, companyId: string) { 
    // Fix: Instead of old GET route that doesn't exist, use common monthly logs with token in body
    const token = localStorage.getItem('api_token');
    const payload = { company_id: companyId, api_token: token, ranger_id: rangerId };
    const headers = { 'Bypass-Token': 'true' };
    return this.getUserMonthlyAttendance(payload, headers); 
  }
  getApprovedOnsiteByCompany(companyId: string) { return this.http.get(`${this.baseApiUrl}/onsite-attendance/company/${companyId}`); }
  getWeeklyAttendanceStats(companyId: any, rangerId?: any): Observable<number[]> {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    const params: any = { type: 'attendance', companyId: companyId.toString() };
    if (rangerId) params.ranger_id = rangerId.toString();
    
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.get<any>(url, { params, headers }).pipe(
      map(res => {
        const data = res.data ? res.data : res;
        return data.officerStatus?.history || data.history || [0, 0, 0, 0, 0, 0, 0];
      }),
      catchError(err => {
        console.warn("⚠️ Attendance API failing (500), using fallback empty data:", err);
        return of([0, 0, 0, 0, 0, 0, 0]);
      })
    );
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

  getAssetStats(companyId: number): Observable<any> {
    const token = localStorage.getItem('api_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data?type=assets&companyId=${companyId}`, { headers });
  }
  getAssetTrend(companyId: number): Observable<any> { return this.http.get(`${this.baseApiUrl}/assets/assets-trend?company_id=${companyId}`); }
  getAssetsTrend(companyId: number): Observable<any> { return this.getAssetTrend(companyId); }
  getAssetCategories(companyId: any): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/assets/categories/${companyId}`); }
  getAssetStatuses(companyId: number) { return this.http.get(`${this.baseApiUrl}/assets/statuses/company/${companyId}`); }
  getCategories(companyId: any) { return this.http.get(`${this.baseApiUrl}/assets/categories/${companyId}`); }
  getStatuses(companyId: any) { return this.http.get(`${this.baseApiUrl}/assets/statuses/${companyId}`); }

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
  sendSOSAlert(payload: any) { return this.http.post(`${this.baseApiUrl}/alerts/sos`, payload); }
  getLatestAlerts(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`); }
  getAlertsByCompany(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/company/${companyId}`); }

  // --- 12. PASSWORD & OTP ---
  requestPasswordReset(phoneNo: string) { return this.http.post(`${this.baseApiUrl}/rangers/forgot-password`, { phoneNo }); }
  verifyOtp(phoneNo: string, otp: string) { return this.http.post(`${this.baseApiUrl}/rangers/verify-otp`, { phoneNo, otp }); }
  resetPassword(phoneNo: string, otp: string, newPass: string) { return this.http.post(`${this.baseApiUrl}/rangers/reset-password`, { phoneNo, otp, newPass }); }


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
}
