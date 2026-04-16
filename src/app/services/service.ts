import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  
  private baseUrl = environment.apiUrl; 

  constructor(private http: HttpClient) {}

  // --- 1. AUTH & STORAGE ---
  
  login(credentials: { phoneNo: string; password: string }) {
    return this.http.post(`${this.baseUrl}/rangers/login`, credentials);
  }

  // Helper method for profile updates
  getRangerProfile(id: string) {
    return this.http.get(`${this.baseUrl}/rangers/profile/${id}`);
  }

  updateRanger(data: any) {
    return this.http.put(`${this.baseUrl}/rangers/update`, data);
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
    // This persists your observation categories to the Neon database via Vercel
    return this.http.patch(`${this.baseUrl}/patrols/active/${patrolId}`, data);
  }

  getCompletedPatrolLogs() {
    return this.http.get(`${this.baseUrl}/patrols/logs`);
  }
  // Inside DataService class

}