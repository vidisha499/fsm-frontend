

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  // FIXED: Base URL now includes /api for all requests
  private baseUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  // --- 1. AUTH & STORAGE ---
  
  login(credentials: { phoneNo: string; password: string }) {
    // Note: Use 'phoneNo' to match your backend controller logic
    return this.http.post(`${this.baseUrl}/rangers/login`, credentials);
  }

  saveRangerId(id: string) {
    localStorage.setItem('ranger_id', id);
  }

  getRangerId() {
    return localStorage.getItem('ranger_id');
  }

  // --- 2. INCIDENTS MODULE ---

  getIncidentsByRanger() {
    const id = this.getRangerId();
    return this.http.get(`${this.baseUrl}/incidents/my-reports/${id}`);
  }

  reportNewIncident(incidentData: any) {
    return this.http.post(`${this.baseUrl}/incidents`, incidentData);
  }

  // --- 3. PATROLS MODULE (PERSISTENCE LOGIC) ---

  startActivePatrol(rangerId: number) {
    return this.http.post(`${this.baseUrl}/patrols/active`, { rangerId });
  }

  getOngoingPatrols() {
    return this.http.get(`${this.baseUrl}/patrols/active`);
  }

  updatePatrolStats(patrolId: number, data: any) {
    // This will persist your categories to the database
    return this.http.patch(`${this.baseUrl}/patrols/active/${patrolId}`, data);
  }

  getCompletedPatrolLogs() {
    return this.http.get(`${this.baseUrl}/patrols/logs`);
  }
}