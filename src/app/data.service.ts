import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  // Use the central URL from your environment file
  // e.g., 'https://fsm-backend-....vercel.app/api'
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;

  constructor(private http: HttpClient) {}

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
    return this.http.post(`${this.baseApiUrl}/rangers/login`, data);
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
}