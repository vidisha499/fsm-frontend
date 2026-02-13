import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  // 1. Updated to your Vercel URL
  private baseUrl = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app'; 

  constructor(private http: HttpClient) {}

  // --- AUTH ---
  login(credentials: { phoneNo: string; password: string }) {
    return this.http.post(`${this.baseUrl}/api/rangers/login`, credentials);
  }

  saveRangerId(id: string) {
    localStorage.setItem('ranger_id', id);
  }

  getRangerId() {
    return localStorage.getItem('ranger_id');
  }

  // --- INCIDENTS ---
  getIncidentsByRanger() {
    const id = this.getRangerId();
    return this.http.get(`${this.baseUrl}/api/incidents/my-reports/${id}`);
  }

  reportNewIncident(incidentData: any) {
    return this.http.post(`${this.baseUrl}/api/incidents`, incidentData);
  }

  // --- PATROLS ---
  startActivePatrol(rangerId: number) {
    return this.http.post(`${this.baseUrl}/api/patrols/active`, { rangerId });
  }

  getOngoingPatrols() {
    return this.http.get(`${this.baseUrl}/api/patrols/active`);
  }

  updatePatrolStats(patrolId: number, data: any) {
    return this.http.patch(`${this.baseUrl}/api/patrols/active/${patrolId}`, data);
  }

  getCompletedPatrolLogs() {
    return this.http.get(`${this.baseUrl}/api/patrols/logs`);
  }

  // --- RANGER PROFILE & UPDATES ---
  updateRanger(data: any) {
    return this.http.post(`${this.baseUrl}/api/rangers/update`, data);
  }

  getRangerProfile(id: string) {
    return this.http.get(`${this.baseUrl}/api/rangers/${id}`);
  }

  // --- PASSWORD RESET & OTP ---
  requestPasswordReset(phoneNo: string) {
    return this.http.post(`${this.baseUrl}/api/rangers/forgot-password`, { phoneNo });
  }

  verifyOtp(phoneNo: string, otp: string) {
    return this.http.post(`${this.baseUrl}/api/rangers/verify-otp`, { phoneNo, otp });
  }

  resetPassword(phoneNo: string, otp: string, newPass: string) {
    return this.http.post(`${this.baseUrl}/api/rangers/reset-password`, { 
      phoneNo, 
      otp, 
      newPass 
    });
  }
}