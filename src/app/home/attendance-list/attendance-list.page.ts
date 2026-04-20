import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController , AlertController, IonModal} from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service'; 
import { TranslateService } from '@ngx-translate/core';
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
  isFiltered: boolean = false;
  todayDateOnly: string = new Date().toISOString().split('T')[0]; // Format: "2026-02-25"

  filters = {
    location: '',
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

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
    this.attendance = this.dataService.getSelectedAttendance();
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'onsite') {
        this.selectedMode = 'onsite';
      } else {
        this.selectedMode = 'beat';
      }
    });
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
                     (log.site_name && log.site_name.toLowerCase().includes('onsite')) ||
                     (log.geo_name && log.geo_name.toLowerCase().includes('[onsite]')) ||
                     (log.geofence && log.geofence.toLowerCase().includes('[onsite]'));
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

  const request = this.selectedMode === 'beat' 
    ? this.dataService.getAttendanceLogsByRanger(companyId)
    : this.dataService.getOnsiteLogsByRanger(this.rangerId, companyId);

  request.subscribe({
    next: (res: any) => {
      // Robust array extraction for both modes
      let logsArray: any[] = [];
      if (Array.isArray(res)) {
        logsArray = res;
      } else if (res && Array.isArray(res.data)) {
        logsArray = res.data;
      } else if (res && Array.isArray(res.attendance)) {
        logsArray = res.attendance;
      } else if (res && res.data && Array.isArray(res.data.attendance)) {
        logsArray = res.data.attendance;
      }
      
      if (logsArray.length === 0 && res && !Array.isArray(res) && !res.data && !res.attendance) {
         console.warn('Could not find logs array in response:', res);
      }
      
      this.allLogs = logsArray.map((log: any) => {
        // Robust date extraction
        let rawDate = '';
        if (this.selectedMode === 'beat') {
          rawDate = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || '';
        } else {
          // Onsite logs typically use created_at
          rawDate = log.created_at || log.createdAt || log.timestamp || '';
        }

        // Convert to ISO string for consistent startsWith(today) filtering
        let formattedDate = '';
        try {
          if (rawDate) {
            formattedDate = new Date(rawDate).toISOString();
          }
        } catch (e) {
          console.warn('Date parsing failed for:', rawDate);
          formattedDate = rawDate; // Fallback
        }
          
        return {
          ...log,
          createdAt: formattedDate,
          geofence: log.geo_name || log.geofence || 'General Area',
          rangerName: log.name || log.rangerName || 'Ranger'
        };
      });

      // Filter for today AND selected mode
      const today = new Date().toISOString().split('T')[0];
      this.attendanceLogs = this.allLogs.filter(log => {
        // 1. Date check
        const isToday = log.createdAt && log.createdAt.startsWith(today);
        
        // 2. Mode check
        const isOnsite = String(log.site_id) === '99999' || String(log.geo_id) === '99999' ||
                         log.site_id === 'onsite' || 
                         (log.site_name && log.site_name.toLowerCase().includes('onsite')) ||
                         (log.geo_name && log.geo_name.toLowerCase().includes('[onsite]')) ||
                         (log.geofence && log.geofence.toLowerCase().includes('[onsite]'));
        const matchesMode = (this.selectedMode === 'onsite') ? isOnsite : !isOnsite;

        return isToday && matchesMode;
      });
      
      loader.dismiss();
    },
    error: (err) => {
      console.error(err);
      this.allLogs = [];
      this.attendanceLogs = [];
      loader.dismiss();
    }
  });
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

  // 1. Dates ko normalize karein (Sirf YYYY-MM-DD format)
  const start = new Date(this.filters.fromDate).toISOString().split('T')[0];
  const end = new Date(this.filters.toDate).toISOString().split('T')[0];

  console.log("Starting Filter Process...");
  console.log("Selected Start Date:", start);
  console.log("Selected End Date:", end);
  console.log("Total Logs in Memory:", this.allLogs.length);

  // 2. Filter logic with Logging
  this.attendanceLogs = this.allLogs.filter(log => {
      if (!log.createdAt) return false;
      
    const logDate = log.createdAt.split('T')[0]; // IST adjusted date
    const isWithin = logDate >= start && logDate <= end;
    
    // Agar 24 tarikh ka data hai toh yahan console mein dikhega
    if (logDate.includes('2026-02-24')) {
      console.log("Found a 24th record! Within range?", isWithin);
    }

    return isWithin;
  });

  console.log("Results after filtering:", this.attendanceLogs.length);
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