// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { environment } from '../environments/environment';

// @Injectable({ providedIn: 'root' })
// export class DataService {
//   // 1. Updated to your Vercel URL
//   // private baseUrl = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app'; 
//   private apiUrl = `${environment.apiUrl}/rangers`;

//   constructor(private http: HttpClient) {}

//   // --- AUTH ---
//   // login(credentials: { phoneNo: string; password: string }) {
//   //   return this.http.post(`${this.baseUrl}/api/rangers/login`, credentials);
//   // }
//   login(data: any) {
//     return this.http.post(`${this.apiUrl}/login`, data);
//   }

//   saveRangerId(id: string) {
//     localStorage.setItem('ranger_id', id);
//   }

//   getRangerId() {
//     return localStorage.getItem('ranger_id');
//   }

//   // --- INCIDENTS ---
//   getIncidentsByRanger() {
//     const id = this.getRangerId();
//     return this.http.get(`${this.baseUrl}/api/incidents/my-reports/${id}`);
//   }

//   reportNewIncident(incidentData: any) {
//     return this.http.post(`${this.baseUrl}/api/incidents`, incidentData);
//   }

//   // --- PATROLS ---
//   startActivePatrol(rangerId: number) {
//     return this.http.post(`${this.baseUrl}/api/patrols/active`, { rangerId });
//   }

//   getOngoingPatrols() {
//     return this.http.get(`${this.baseUrl}/api/patrols/active`);
//   }

//   updatePatrolStats(patrolId: number, data: any) {
//     return this.http.patch(`${this.baseUrl}/api/patrols/active/${patrolId}`, data);
//   }

//   getCompletedPatrolLogs() {
//     return this.http.get(`${this.baseUrl}/api/patrols/logs`);
//   }

//   // --- RANGER PROFILE & UPDATES ---
//   updateRanger(data: any) {
//     return this.http.post(`${this.baseUrl}/api/rangers/update`, data);
//   }

//   getRangerProfile(id: string) {
//     return this.http.get(`${this.baseUrl}/api/rangers/${id}`);
//   }

//   // --- PASSWORD RESET & OTP ---
//   requestPasswordReset(phoneNo: string) {
//     return this.http.post(`${this.baseUrl}/api/rangers/forgot-password`, { phoneNo });
//   }

//   verifyOtp(phoneNo: string, otp: string) {
//     return this.http.post(`${this.baseUrl}/api/rangers/verify-otp`, { phoneNo, otp });
//   }

//   resetPassword(phoneNo: string, otp: string, newPass: string) {
//     return this.http.post(`${this.baseUrl}/api/rangers/reset-password`, { 
//       phoneNo, 
//       otp, 
//       newPass 
//     });
//   }
// }

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
}