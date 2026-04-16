import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  
  private readonly STORAGE_KEY = 'app_label_overrides';

  // --- MASTER DICTIONARY (Source of Truth) ---
  private masterDictionary: { [key: string]: string } = {
    'label_company': 'Company',
    'label_plantation': 'Plantation',
    'label_patrolling': 'Patrolling',
    'label_report': 'Reports',
    'label_attendance': 'Attendance',
    'label_dynamic': 'Dynamic label',
    'label_anucampa': 'Anucampa',
    'label_registration': 'Registration',
    'label_overview': 'Overview',
    'label_logs': 'Attendance logs',
    'label_request': 'Attendance Request',
    'label_patrol_logs': 'Patrol Logs',
    'label_all_patrolling': 'All Patrolling',
    'label_map_view': 'Map view',
    'label_advance_analytics': 'Advance Analytics',
    'label_patrol': 'Patrol',
    'label_patrol_analysis': 'Patrol Analysis',
    'label_client': 'Client',
    'label_site': 'Site',
    'label_user': 'User'
  };

  private overrides: { [key: string]: string } = {};
  private labelUpdated = new BehaviorSubject<boolean>(true);
  labelUpdated$ = this.labelUpdated.asObservable();

  constructor() {
    this.loadOverrides();
  }

  private loadOverrides() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.overrides = JSON.parse(saved);
      } catch (e) {
        this.overrides = {};
      }
    }
  }

  saveOverrides(newOverrides: { [key: string]: string }) {
    this.overrides = { ...newOverrides };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.overrides));
    this.labelUpdated.next(true); // Notify all listeners
  }

  getLabel(key: string): string {
    // Return override if exists, otherwise return master default
    if (this.overrides[key]) {
      return this.overrides[key];
    }
    return this.masterDictionary[key] || key;
  }

  getDefaultValue(key: string): string {
    return this.masterDictionary[key] || '';
  }

  getMasterKeys(): string[] {
    return Object.keys(this.masterDictionary);
  }

  getOverrides(): { [key: string]: string } {
    return { ...this.overrides };
  }
}
