import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController , AlertController, IonModal, IonContent } from '@ionic/angular';
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
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  @ViewChild('filterModal') filterModal!: IonModal;
  // Variables section mein add karein
allLogs: any[] = []; // Ye backup ke liye taaki original data safe rahe
filterLocation: string = ''; // Location input ke liye
  attendanceLogs: any[] = [];
  isLoading: boolean = false;
  onDutyCount: number = 0;
  attendance: any;
  startDate: string | undefined;
  endDate: string | undefined;
  maxDate: string = new Date().toISOString();
  filters: any = { fromDate: '', toDate: '', location: '', status: 'all' };
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
    public dataService: DataService,
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

private toYYYYMMDD(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).split('T')[0] || '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return String(val).split('T')[0] || '';
  }
}

updateDisplayedLogs() {
  const userRole = localStorage.getItem('user_role') || '3';
  const isAdmin = userRole === '1' || userRole === '2' || userRole === '7';
  const myRangerId = localStorage.getItem('ranger_id');
  const todayStr = this.toYYYYMMDD(new Date());

  this.attendanceLogs = this.allLogs.filter(log => {
    // 1. Multi-assignment Region Filtering (e.g. Supervisor sees only assigned Beats/Ranges)
    const recordEntityId = log.entity_id || log.geo_id || log.geofence_id || log.site_id;
    if (!this.dataService.isRecordVisible(recordEntityId)) {
      return false;
    }

    // 2. Filter by Ranger ID for non-admins
    if (!isAdmin && myRangerId) {
      const logRangerId = String(log.user_id || log.ranger_id || log.applicant_id || log.rangerId || log.guard_id || '');
      if (logRangerId !== '') {
        if (logRangerId !== String(myRangerId)) return false;
      } else {
        const myName = (localStorage.getItem('ranger_username') || localStorage.getItem('ranger_name') || '').toLowerCase().trim();
        const logName = String(log.name || log.rangerName || log.guard_name || '').toLowerCase().trim();
        if (myName && logName && myName !== logName) return false;
      }
    }

    // 3. Mode Match (Beat vs Onsite)
    if (!this.matchesSelectedMode(log)) return false;

    // 4. Date Range Filtering
    const logDate = this.toYYYYMMDD(log.createdAt);
    if (!logDate) return false;

    if (this.isFiltered) {
      const start = this.toYYYYMMDD(this.filters.fromDate);
      const end = this.toYYYYMMDD(this.filters.toDate);
      if (logDate < start || logDate > end) return false;
    } else {
      if (logDate !== todayStr) return false;
    }

    // 5. Search Location Filter
    if (this.filterLocation) {
      const query = this.filterLocation.toLowerCase();
      const locName = String(log.geofence || log.location_name || '').toLowerCase();
      if (!locName.includes(query)) return false;
    }

    return true;
  });
}

applyFrontendLogic() {
  this.updateDisplayedLogs();
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
  this.isLoading = true;
  const companyId = localStorage.getItem('company_id');
  if (!companyId) return;

    const loader = await this.loadingCtrl.create({
      message: `Fetching ${this.selectedMode === 'beat' ? 'Beat' : 'On Location'} Logs...`,
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
            try {
              let approvedLogs = this.extractLogsArray(logsRes)
                .filter((l: any) => this.dataService.isOnsiteAttendance(l));
              let pendingReqs = this.extractLogsArray(reqsRes);

              approvedLogs = approvedLogs.map((l: any) => ({ ...l, status: String(l.status || 'pending').toLowerCase() }));
              
              pendingReqs = pendingReqs.filter((r: any) => {
                const rId = String(r.guard_id || r.user_id || r.ranger_id || r.rangerId || '');
                return rId === rangerId && this.dataService.isOnsiteAttendance(r);
              }).map((r: any) => {
                const rawStatus = String(r.status || 'pending').toLowerCase();
                return { ...r, status: rawStatus, isRequest: true };
              });

              console.log(`✅ Loaded ${approvedLogs.length} approved and ${pendingReqs.length} pending logs.`);

              const combined = [...pendingReqs, ...approvedLogs];
              this.processLogsResponse(combined, loader);
            } catch (e) {
              console.error('❌ Error processing onsite logs:', e);
              loader.dismiss();
            }
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

private parseLocation(loc: any): string {
  if (!loc) return 'On Location';
  if (typeof loc !== 'string') return String(loc);
  try {
    const parsed = JSON.parse(loc);
    return parsed.name || parsed.address || `${parsed.lat}, ${parsed.lng}`;
  } catch (e) {
    return loc;
  }
}

private processLogsResponse(res: any, loader: any) {
  const rawArray = Array.isArray(res) ? res : this.extractLogsArray(res);
  
  // De-duplicate logs using a normalized ISO timestamp as the key
  const uniqueMap = new Map();
  rawArray.forEach((log: any) => {
    let rawDate = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || '';
    let isoKey = '';
    try { 
      if (rawDate) {
        // Normalize date format (Handle DD-MM-YYYY if needed)
        if (typeof rawDate === 'string' && rawDate.includes('-') && rawDate.split('-')[0].length === 2) {
          const parts = rawDate.split(' ');
          const dateParts = parts[0].split('-');
          rawDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}${parts[1] ? ' ' + parts[1] : ''}`;
        }
        isoKey = new Date(rawDate).toISOString(); 
      }
    } catch (e) { isoKey = rawDate; }

    if (!isoKey) return;

    const existing = uniqueMap.get(isoKey);
    const currentStatus = String(log.status || '').toLowerCase().trim();

    if (!existing) {
      uniqueMap.set(isoKey, log);
    } else {
      // 🏆 PRIORITY: ONLY 'approved' string wins
      const existingStatus = String(existing.status || '').toLowerCase().trim();
      if (currentStatus === 'approved') {
        uniqueMap.set(isoKey, log);
      }
      // If current is NOT approved, keep the existing one (especially if existing is already approved)
    }
  });

  const logsArray = Array.from(uniqueMap.values());
  
  const fetchedLogs = logsArray.map((log: any) => {
    let rawDate = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || '';
    let formattedDate = '';
    try { 
      if (rawDate) {
        // Normalize for ISO conversion
        if (typeof rawDate === 'string' && rawDate.includes('-') && rawDate.split('-')[0].length === 2) {
           const parts = rawDate.split(' ');
           const dateParts = parts[0].split('-');
           rawDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}${parts[1] ? ' ' + parts[1] : ''}`;
        }
        formattedDate = new Date(rawDate).toISOString(); 
      }
    } catch (e) { formattedDate = rawDate; }
      
    const isOnsite = this.dataService.isOnsiteAttendance(log);

      // Map backend statuses to readable strings
      const statusStr = String(log.status || '').toLowerCase().trim();
      let mappedStatus = 'pending';
      let statusLabel = 'PENDING';
      
      if (statusStr === 'approved') {
        mappedStatus = 'approved';
        statusLabel = 'APPROVED';
      } else if (statusStr === '0' || statusStr === 'rejected') {
        mappedStatus = 'rejected';
        statusLabel = 'REJECTED';
      } else if (statusStr === '1') {
        // For Beat Attendance, '1' usually means it's successfully logged (Present)
        if (!isOnsite) {
          mappedStatus = 'approved';
          statusLabel = 'PRESENT';
        } else {
          mappedStatus = 'pending';
          statusLabel = 'PENDING';
        }
      } else {
        // "pending", "requested", "" — all mean pending
        mappedStatus = 'pending';
        statusLabel = 'PENDING';
      }

      let photoUrl = log.photo || log.image || log.profile_pic || log.guard_photo || null;
      if (photoUrl && typeof photoUrl === 'string') {
        photoUrl = photoUrl.trim();
        if (!photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
          let cleaned = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
          if (!cleaned.includes('profilepics') && !cleaned.includes('attendance')) {
             photoUrl = `https://fms.pugarch.in/public/${cleaned}`;
          } else {
             photoUrl = `https://fms.pugarch.in/public/${cleaned}`;
          }
        }
      }

      return {
        ...log,
        createdAt: formattedDate,
        geofence: isOnsite ? this.parseLocation(log.location || log.address || log.geo_name || log.geofence || 'Onsite') : (log.geo_name || log.geofence || 'General Area'),
        rangerName: log.name || log.rangerName || log.guard_name || 'Ranger',
        status: mappedStatus,
        statusLabel: statusLabel,
        photo: photoUrl
      };
  });

  // Merge Offline Drafts
  const drafts = this.dataService.getAttendanceDrafts(this.selectedMode);
  this.allLogs = [...drafts, ...fetchedLogs].sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  this.onDutyCount = this.allLogs.filter(l => l.status === 'approved').length;

  // Delegate all filtering to updateDisplayedLogs
  this.updateDisplayedLogs();
  
  this.isLoading = false;
  loader.dismiss();
}

private handleError(err: any, loader: any) {
  console.error(err);
  const drafts = this.dataService.getAttendanceDrafts(this.selectedMode);
  this.allLogs = drafts;
  this.attendanceLogs = drafts;
  this.isLoading = false;
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

  doRefresh() {
    this.loadAttendanceLogs();
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
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
  console.log('applyFilters triggered with:', this.filters);
  this.isFiltered = true;
  try {
    // 1. Dates ko normalize karein (Local Date YYYY-MM-DD)
    const start = new Date(this.filters.fromDate).toLocaleDateString('en-CA');
    const end = new Date(this.filters.toDate).toLocaleDateString('en-CA');
    // 2. Filter logic with Mode check
    this.attendanceLogs = this.allLogs.filter(log => {
      if (!log.createdAt) return false;
        
      const logDate = new Date(log.createdAt).toLocaleDateString('en-CA');
      const isWithin = logDate >= start && logDate <= end;
      
      let matchesStatus = true;
      if (this.filters.status && this.filters.status !== 'all') {
        matchesStatus = log.status === this.filters.status;
      }
      
      return isWithin && matchesStatus && this.matchesSelectedMode(log);
    });

    this.updateDisplayedLogs();
    console.log('updateDisplayedLogs success, filtered count:', this.attendanceLogs?.length);
  } catch (e) {
    console.error('Error in applyFilters:', e);
  }
  this.isModalOpen = false;
}

resetFilters() {
  this.filters.status = 'all';
  this.resetToToday();
  this.isModalOpen = false;
}






  private matchesSelectedMode(log: any): boolean {
    return this.selectedMode === 'onsite'
      ? this.dataService.isOnsiteAttendance(log)
      : this.dataService.isBeatAttendance(log);
  }

  async goToMarkAttendance() {
    const status = await firstValueFrom(this.dataService.checkTodayAttendanceStatus());

    if (this.selectedMode === 'beat' && status.hasOnsite) {
      const alert = await this.alertCtrl.create({
        header: 'Onsite already marked',
        message: 'You have already marked onsite attendance today. Beat attendance is not allowed on the same day.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.selectedMode === 'onsite' && status.hasBeat) {
      const alert = await this.alertCtrl.create({
        header: 'Beat already marked',
        message: 'You have already marked beat attendance today. Onsite attendance is not allowed on the same day.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.selectedMode === 'beat') {
      this.navCtrl.navigateForward('/attendance');
    } else {
      this.navCtrl.navigateForward('/onsite-attendance');
    }
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}