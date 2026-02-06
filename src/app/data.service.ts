// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Data {
  
// }

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  private baseUrl = 'http://localhost:3000'; 

  constructor(private http: HttpClient) {}

  // --- AUTH ---
  login(credentials: { phoneNo: string; password: string }) {
    // return this.http.post(`${this.baseUrl}/api/rangers/login`, credentials);
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

 updateRanger(data: any) {
  // ✅ This matches your NestJS Controller: @Controller('rangers') @Post('update')
  return this.http.post(`${this.baseUrl}/api/rangers/update`, data);
}

// Inside DataService class
requestPasswordReset(phoneNo: string) {
  // This must match your NestJS route /api/rangers/forgot-password
  return this.http.post(`${this.baseUrl}/api/rangers/forgot-password`, { phoneNo });
}
// data.service.ts
getRangerProfile(id: string) {
  // This calls your @Get(':id') endpoint in the RangersController
  return this.http.get(`${this.baseUrl}/api/rangers/${id}`);
}


}

