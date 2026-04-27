import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController , AlertController, IonModal} from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service'; 
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-attendance-list',
  templateUrl: './attendance-list.page.html',
  styleUrls: ['./attendance-list.page.scss'],
  standalone: false
})
export class AttendanceListPage implements OnInit {
  @ViewChild('filterModal') filterModal!: IonModal;
  // Variables section mein add karein
allLogs: any[] = []; // Ye backup ke liye taaki original data safe rahe
filterLocation: string = ''; // Location input ke liye
  attendanceLogs: any[] = [];
  attendance: any;
  startDate: string | undefined;
  endDate: string | undefined;
  maxDate: string = new Date().toISOString();
  filters: any = { fromDate: '', toDate: '', location: '' };
  isFiltered: boolean = false;
  private syncSub!: Subscription;
  todayDateOnly: string = new Date().toISOString().split('T')[0]; // Format: "2026-02-25"

  isModalOpen: boolean = false; // Modal toggle error fix
  today: string = new Date().toISOString(); // [max]="today" error fix
  selectedMode: 'beat' | 'onsite' = 'beat';
  rangerId: string = localStorage.getItem('ranger_id') || '0';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private router: Router,
    private dataService: DataService,
    private translate: TranslateService,
    private alertCtrl: AlertController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['mode']) this.selectedMode = params['mode'];
      this.loadAttendanceLogs();
    });

    // Auto-refresh when sync completes
    this.syncSub = this.dataService.syncCompleted$.subscribe(() => {
      console.log("♻️ Sync detected, refreshing attendance list...");
      this.loadAttendanceLogs();
    });
  }

  ngOnDestroy() {
    if (this.syncSub) this.syncSub.unsubscribe();
  }

  // async loadTodayOnly() {
  // this.isFiltered = false; // Default view is not "manually filtered"
  // this.startDate = this.todayDateOnly;
  // this.endDate = this.todayDateOnly;
  // this.loadAttendanceLogs(this.todayDateOnly, this.todayDateOnly);
  // }

  async loadTodayOnly() {
  this.isFiltered = false;
  this.startDate = this.todayDateOnly;
  this.endDate = this.todayDateOnly;
  this.filterLocation = '';
  // Hum backend se saara data layenge aur fir filter karenge
  await this.fetchAndFilter();
}

async fetchAndFilter() {
  const companyId = localStorage.getItem('company_id');
  if (!companyId) return;

  const loader = await this.loadingCtrl.create({
    message: 'Fetching Logs...',
    spinner: 'crescent'
  });
  await loader.present();

  // 📍 Sabse safe tarika: Saara data mangwao (dates params mat bhejo)
  this.dataService.getAttendanceLogsByRanger(companyId).subscribe({
    next: (res: any) => {
      const logsArray = res.attendance || res.data || res;
      if (!Array.isArray(logsArray)) {
        console.error('Expected array but got:', logsArray);
        loader.dismiss();
        return;
      }
      
      console.log("Raw Array Data (first item):", logsArray[0]);

      this.allLogs = logsArray.map((log: any) => {
        // Backend now returns timestamp or entryDateTime
        const rawDate = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || ''; 
        return {
          ...log,
          createdAt: rawDate,
          geofence: log.geo_name,
          rangerName: log.name
        };
      });

      // Default logic: Sirf aaj ka dikhao
      this.applyFrontendLogic();
      loader.dismiss();
    },
    error: (err) => {
      console.error(err);
      loader.dismiss();
    }
  });
}

applyFrontendLogic() {
  if (!this.startDate || !this.endDate) {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceLogs = this.allLogs.filter(log => log.createdAt && log.createdAt.startsWith(today));
    return;
  }

  const start = this.startDate.split('T')[0];
  const end = this.endDate.split('T')[0];

  this.attendanceLogs = this.allLogs.filter(log => {
    const logDate = log.createdAt.split('T')[0];
    const isWithinDate = logDate >= start && logDate <= end;
    
    // Mode check (Beat vs Onsite)
    const isOnsite = String(log.site_id) === '99999' || String(log.geo_id) === '99999' ||
                      log.site_id === 'onsite' || 
                      (log.site_name && String(log.site_name).toLowerCase().includes('onsite')) ||
                      (log.geo_name && String(log.geo_name).toLowerCase().includes('[onsite]')) ||
                      (log.geofence && String(log.geofence).toLowerCase().includes('[onsite]'));
    const matchesMode = (this.selectedMode === 'onsite') ? isOnsite : !isOnsite;

    let isMatchLocation = true;
    if (this.filterLocation) {
      const query = this.filterLocation.toLowerCase();
      const locName = (log.geofence || log.location_name || '').toLowerCase();
      isMatchLocation = locName.includes(query);
    }
    return isWithinDate && isMatchLocation && matchesMode;
  });
}

  ionViewWillEnter() {
   this.resetToToday();
  }


  async resetToToday() {
  this.isFiltered = false;
  this.filters.location = '';
  
  const todayStr = new Date().toISOString();
  this.filters.fromDate = todayStr;
  this.filters.toDate = todayStr;
  
  // Wapas "todayDateOnly" variable ko bhi sync karein agar use kar rahe hain
  this.startDate = this.todayDateOnly;
  this.endDate = this.todayDateOnly;

  // Data fetch karein
  await this.loadAttendanceLogs();
}


async loadAttendanceLogs() {
  const companyId = localStorage.getItem('company_id');
  if (!companyId) return;

    const loader = await this.loadingCtrl.create({
      message: `Fetching ${this.selectedMode === 'beat' ? 'Beat' : 'Onsite'} Logs...`,
      spinner: 'crescent'
    });
    await loader.present();

    if (this.selectedMode === 'beat') {
      this.dataService.getAttendanceLogsByRanger(companyId).subscribe({
        next: (res: any) => this.processLogsResponse(res, loader),
        error: (err) => this.handleError(err, loader)
      });
    } else {
      // For Onsite: Merge Monthly Logs (Approved) and Attendance Requests (Pending)
      const rangerId = localStorage.getItem('ranger_id') || '0';
      
      const logsObs = this.dataService.getOnsiteLogsByRanger(rangerId, companyId);
      const reqsObs = this.dataService.getAttendanceRequests(companyId);

      import('rxjs').then(({ forkJoin }) => {
        forkJoin([logsObs, reqsObs]).subscribe({
          next: ([logsRes, reqsRes]: [any, any]) => {
            let approvedLogs = this.extractLogsArray(logsRes);
            let pendingReqs = this.extractLogsArray(reqsRes);

            // Mark status and normalize fields
            approvedLogs = approvedLogs.map((l: any) => ({ ...l, status: 'approved' }));
            
            pendingReqs = pendingReqs.filter((r: any) => {
              const rId = String(r.guard_id || r.user_id || r.ranger_id || r.rangerId || '');
              return rId === rangerId;
            }).map((r: any) => {
              const rawStatus = String(r.status || 'pending').toLowerCase();
              return { ...r, status: rawStatus, isRequest: true };
            });

            console.log(`✅ Loaded ${approvedLogs.length} approved and ${pendingReqs.length} pending logs.`);

            const combined = [...pendingReqs, ...approvedLogs];
            this.processLogsResponse(combined, loader);
          },
          error: (err) => this.handleError(err, loader)
        });
      });
    }
  }

  private extractLogsArray(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.attendance)) return res.attendance;
  if (res && res.data && Array.isArray(res.data.attendance)) return res.data.attendance;
  return [];
}

private processLogsResponse(res: any, loader: any) {
  const rawArray = Array.isArray(res) ? res : this.extractLogsArray(res);
  
  // De-duplicate logs to prevent showing the same record twice
  const uniqueMap = new Map();
  rawArray.forEach((log: any) => {
    const uniqueId = String(log.id || log.attendance_id || log.request_id || (String(log.time || '') + String(log.date || '')));
    if (!uniqueMap.has(uniqueId)) {
      uniqueMap.set(uniqueId, log);
    } else {
      // If duplicate, prefer the one from requests if it contains status/isRequest flag
      if (log.isRequest) uniqueMap.set(uniqueId, log);
    }
  });

  const logsArray = Array.from(uniqueMap.values());
  
  const fetchedLogs = logsArray.map((log: any) => {
    let rawDate = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || '';
    let formattedDate = '';
    try { if (rawDate) formattedDate = new Date(rawDate).toISOString(); } catch (e) { formattedDate = rawDate; }
      
    const isOnsite = log.isRequest || 
                     String(log.site_id) === '99999' || String(log.geo_id) === '99999' ||
                     log.site_id === 'onsite' || 
                     !log.geo_id || log.geo_id === '0' ||
                     (log.site_name && String(log.site_name).toLowerCase().includes('onsite')) ||
                     (log.geo_name && String(log.geo_name).toLowerCase().includes('[onsite]'));

    return {
      ...log,
      createdAt: formattedDate,
      geofence: isOnsite ? (log.location || log.address || log.geo_name || log.geofence || 'Onsite') : (log.geo_name || log.geofence || 'General Area'),
      rangerName: log.name || log.rangerName || log.guard_name || 'Ranger',
      status: String(log.status || (this.selectedMode === 'beat' ? 'completed' : 'approved')).toLowerCase()
    };
  });

  // Merge Offline Drafts
  const drafts = this.dataService.getAttendanceDrafts(this.selectedMode);
  this.allLogs = [...drafts, ...fetchedLogs];

  // Filter logic
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  this.attendanceLogs = this.allLogs.filter(log => {
    // 1. Determine Mode (Onsite vs Beat)
    const isOnsite = log.isRequest || 
                     String(log.site_id) === '99999' || String(log.geo_id) === '99999' ||
                     log.site_id === 'onsite' || 
                     !log.geo_id || log.geo_id === '0' ||
                     (log.site_name && log.site_name.toLowerCase().includes('onsite')) ||
                     (log.geo_name && log.geo_name.toLowerCase().includes('[onsite]'));
    
    const matchesMode = (this.selectedMode === 'onsite') ? isOnsite : !isOnsite;
    if (!matchesMode) return false;

    // 2. Date Filtering:
    const logDate = log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-CA') : '';

    if (this.isFiltered) {
      const start = new Date(this.filters.fromDate).toLocaleDateString('en-CA');
      const end = new Date(this.filters.toDate).toLocaleDateString('en-CA');
      const locQuery = (this.filters.location || '').toLowerCase().trim();
      const logLoc = (log.geofence || log.location_name || '').toLowerCase();
      
      const isWithin = logDate >= start && logDate <= end;
      const matchesLoc = locQuery === '' || logLoc.includes(locQuery);
      return isWithin && matchesLoc;
    } else {
      // Default: Only Today
      return logDate === todayStr;
    }
  });
  
  loader.dismiss();
}

private handleError(err: any, loader: any) {
  console.error(err);
  const drafts = this.dataService.getAttendanceDrafts(this.selectedMode);
  this.allLogs = drafts;
  this.attendanceLogs = drafts;
  loader.dismiss();
}

    hasOfflineLogs(): boolean {
      return this.attendanceLogs && this.attendanceLogs.some(l => l.isOffline);
    }

    async syncOfflineDrafts() {
      if (!this.dataService.isOnline()) {
        const msg = await firstValueFrom(this.translate.get('ATTENDANCE.OFFLINE_SYNC_WAIT')) || 'Still offline. Please check connection.';
        this.presentToast(msg, 'warning');
        return;
      }

      const loader = await this.loadingCtrl.create({
        message: 'Syncing All Offline Data...',
        spinner: 'crescent'
      });
      await loader.present();

      const res = await this.dataService.syncAllDrafts();
      await loader.dismiss();

      if (res.success) {
        if (res.count && res.count > 0) {
          this.presentToast(`Successfully synced ${res.count} items!`, 'success');
          this.loadAttendanceLogs();
        } else {
          this.presentToast('Everything is already synced.', 'primary');
        }
      } else {
        this.presentToast(res.message || 'Sync failed. Will try again later.', 'danger');
      }
    }

    async presentToast(message: string, color: string) {
      const toast = await (this as any).alertCtrl.create({ // Using alert for prominence or toast
        header: 'Sync Status',
        message: message,
        buttons: ['OK']
      });
      await toast.present();
    }

setMode(mode: 'beat' | 'onsite') {
  if (this.selectedMode === mode) return;
  this.selectedMode = mode;
  this.isFiltered = false;
  this.loadAttendanceLogs();
}
  // UPDATE: Event must be 'any' or 'Event' and come first as per HTML ($event, log.id)
  async confirmDelete(event: any, id: number) {
    if (event) event.stopPropagation(); 

    const alert = await this.alertCtrl.create({
      header: 'Delete Log?',
      message: 'Do you want to delete this log?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'delete-confirm-btn',
          handler: () => {
            this.deleteLog(id);
          }
        }
      ]
    });
    await alert.present();
  }

  deleteLog(id: number) {
    const endpoint = this.selectedMode === 'beat' 
      ? `${environment.apiUrl}/attendance/beat-attendance/${id}`
      : `${environment.apiUrl}/onsite-attendance/${id}`;

    this.http.delete(endpoint).subscribe({ 
      next: () => {
        this.attendanceLogs = this.attendanceLogs.filter(log => log.id !== id);
        this.allLogs = this.allLogs.filter(log => log.id !== id);
      },
      error: (err) => console.error("Delete Error:", err)
    });
  }

  formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  viewDetails(log: any) {
    this.dataService.setSelectedAttendance(log); 
    if (this.selectedMode === 'beat') {
      this.router.navigate([`/attendance-detail/${log.id}`]);
    } else {
      this.router.navigate(['/onsite-attendance-details'], {
        queryParams: { id: log.id }
      });
    }
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }

// applyFilters() {
//   // 1. Pehle Date Range ke liye API se fresh data layein
//   if (this.startDate && this.endDate) {
//     this.isFiltered = true;
    
//     const rangerId = localStorage.getItem('ranger_id');
//     const formattedFrom = this.startDate.split('T')[0];
//     const formattedTo = this.endDate.split('T')[0];
//     let url = `${this.apiUrl}/ranger/${rangerId}?startDate=${formattedFrom}&endDate=${formattedTo}`;

//     this.http.get(url).subscribe({
//       next: (data: any) => {
//         // Data format karein (IST adjustment)
//         let filtered = data.map((log: any) => {
//           const rawDate = log.created_at || log.createdAt;
//           return { ...log, createdAt: new Date(new Date(rawDate).getTime() - (5.5 * 60 * 60 * 1000)).toISOString() };
//         });

//         // 2. AB LOCATION FILTER APPLY KAREIN (Frontend Filtering)
//         if (this.filterLocation && this.filterLocation.trim() !== '') {
//           const query = this.filterLocation.toLowerCase().trim();
//           filtered = filtered.filter((log: any) => 
//             (log.geofence && log.geofence.toLowerCase().includes(query)) ||
//             (log.region && log.region.toLowerCase().includes(query))
//           );
//         }

//         this.attendanceLogs = filtered;
//         if (this.filterModal) this.filterModal.dismiss();
//       },
//       error: (err) => console.error(err)
//     });
//   }
// }

// resetFilters() {
//   this.isFiltered = false;
//   this.startDate = undefined;
//   this.endDate = undefined;
//   this.filterLocation = ''; // Location khali karein
//   this.loadAttendanceLogs(); 
//   if (this.filterModal) this.filterModal.dismiss();
// }
async applyFilters() {
  this.isFiltered = true;

  // 1. Dates ko normalize karein (Local Date YYYY-MM-DD)
  const start = new Date(this.filters.fromDate).toLocaleDateString('en-CA');
  const end = new Date(this.filters.toDate).toLocaleDateString('en-CA');
  const locQuery = (this.filters.location || '').toLowerCase().trim();

  // 2. Filter logic with Mode check
  this.attendanceLogs = this.allLogs.filter(log => {
    if (!log.createdAt) return false;
      
    const logDate = new Date(log.createdAt).toLocaleDateString('en-CA');
    const isWithin = logDate >= start && logDate <= end;
    
    // Mode check (Beat vs Onsite)
    const isOnsite = log.isRequest || 
                     String(log.site_id) === '99999' || String(log.geo_id) === '99999' ||
                     log.site_id === 'onsite' || 
                     !log.geo_id || log.geo_id === '0' ||
                     (log.site_name && log.site_name.toLowerCase().includes('onsite')) ||
                     (log.geo_name && log.geo_name.toLowerCase().includes('[onsite]'));
    
    const matchesMode = (this.selectedMode === 'onsite') ? isOnsite : !isOnsite;
    
    // Location check
    const logLoc = (log.geofence || log.location_name || '').toLowerCase();
    const matchesLoc = locQuery === '' || logLoc.includes(locQuery);

    return isWithin && matchesMode && matchesLoc;
  });

  this.isModalOpen = false;
}

resetFilters() {
  this.resetToToday();
  this.isModalOpen = false;
}





async goToMarkAttendance() {
    if (this.selectedMode === 'beat') {
      this.navCtrl.navigateForward('/attendance'); 
    } else {
      this.navCtrl.navigateForward('/onsite-attendance');
    }
  }
}