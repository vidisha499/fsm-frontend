import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  // Base URL for your NestJS server
  private baseUrl = 'http://localhost:3000'; 

  constructor(private http: HttpClient) {}

  // --- 1. AUTH & STORAGE ---
  
  login(credentials: { mobileNumber: string; password: string }) {
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
    // This allows rangers to submit poaching or animal death reports
    return this.http.post(`${this.baseUrl}/incidents`, incidentData);
  }

  // --- 3. PATROLS MODULE (PERSISTENCE LOGIC) ---

  // Replicates: POST http://localhost:3000/patrols/active
  startActivePatrol(rangerId: number) {
    return this.http.post(`${this.baseUrl}/patrols/active`, { rangerId });
  }

  // Replicates: GET http://localhost:3000/patrols/active
  // Used to check if a ranger has an ongoing patrol when they re-open the app
  getOngoingPatrols() {
    return this.http.get(`${this.baseUrl}/patrols/active`);
  }

  // Replicates: PATCH http://localhost:3000/patrols/active/:id
  // This is the key to persisting categories! 
  // Call this every time a count (animals, water) is incremented.
  updatePatrolStats(patrolId: number, data: any) {
    return this.http.patch(`${this.baseUrl}/patrols/active/${patrolId}`, data);
  }

  // Replicates: GET http://localhost:3000/patrols/logs
  getCompletedPatrolLogs() {
    return this.http.get(`${this.baseUrl}/patrols/logs`);
  }
}