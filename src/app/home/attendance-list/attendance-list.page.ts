import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController , AlertController, IonModal} from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  // isFiltered: boolean = false;
  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private router: Router,
    private dataService: DataService,
    private translate: TranslateService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
this.attendance = this.dataService.getSelectedAttendance();
    
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
  const rangerId = localStorage.getItem('ranger_id');
  if (!rangerId) return;

  const loader = await this.loadingCtrl.create({
    message: 'Fetching Logs...',
    spinner: 'crescent'
  });
  await loader.present();

  // 📍 Sabse safe tarika: Saara data mangwao (dates params mat bhejo)
  // Backend ab updated hai, toh wo saara data bhej dega
  let url = `${this.apiUrl}/ranger/${rangerId}`;

  this.http.get(url).subscribe({
    next: (data: any) => {
 // fetchAndFilter aur loadAttendanceLogs dono mein ye change kar:
this.allLogs = data.map((log: any) => {
  const rawDate = log.created_at || log.createdAt; 
  return {
    ...log,
    // Sirf raw date string pass karo, manipulation mat karo
    createdAt: rawDate 
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
    this.attendanceLogs = this.allLogs.filter(log => log.createdAt.startsWith(today));
    return;
  }

  const start = this.startDate.split('T')[0];
  const end = this.endDate.split('T')[0];

  this.attendanceLogs = this.allLogs.filter(log => {
    const logDate = log.createdAt.split('T')[0];
    const isWithinDate = logDate >= start && logDate <= end;
    
    let isMatchLocation = true;
    if (this.filterLocation) {
      const query = this.filterLocation.toLowerCase();
      const locName = (log.geofence || log.location_name || '').toLowerCase();
      isMatchLocation = locName.includes(query);
    }
    return isWithinDate && isMatchLocation;
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
  const rangerId = localStorage.getItem('ranger_id');
  if (!rangerId) return;

  const loader = await this.loadingCtrl.create({
    message: 'Fetching Logs...',
    spinner: 'crescent'
  });
  await loader.present();

  this.http.get(`${this.apiUrl}/ranger/${rangerId}`).subscribe({
    next: (data: any) => {
      // 1. Saara data format karke backup mein rakhein
  // fetchAndFilter aur loadAttendanceLogs dono mein ye change kar:
this.allLogs = data.map((log: any) => {
  const rawDate = log.created_at || log.createdAt; 
  return {
    ...log,
    // Sirf raw date string pass karo, manipulation mat karo
    createdAt: rawDate 
  };
      });

      // 2. Sirf AAJ ka data dikhayein (Starts with YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      this.attendanceLogs = this.allLogs.filter(log => log.createdAt.startsWith(today));
      
      loader.dismiss();
    },
    error: (err) => {
      console.error(err);
      loader.dismiss();
    }
  });
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
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({ 
      next: () => {
        this.attendanceLogs = this.attendanceLogs.filter(log => log.id !== id);
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
    this.router.navigate([`/attendance-detail/${log.id}`]);
  }

  goBack() {
    this.navCtrl.navigateRoot('/home');
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





goToMarkAttendance() {
    // Ye aapko attendance mark karne wale page par le jayega
    this.navCtrl.navigateForward('/attendance'); 
  }
}