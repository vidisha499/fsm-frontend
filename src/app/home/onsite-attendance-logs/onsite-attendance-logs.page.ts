import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-onsite-attendance-logs',
  templateUrl: './onsite-attendance-logs.page.html',
  styleUrls: ['./onsite-attendance-logs.page.scss'],
  standalone: false
})
export class OnsiteAttendanceLogsPage implements OnInit {
  rangerId: number = Number(localStorage.getItem('ranger_id')) || 0; 
allLogs: any[] = []; // Backup for filtering
  // attendanceLogs: any[] = [];
  // rangerId: number = 145; // Replace with your actual auth storage value
  attendanceLogs: any[] = []; // Data from server
filteredLogs: any[] = [];   // Data displayed after filtering // Data shown in UI
  isModalOpen = false;
  today: string = new Date().toISOString();

  filters = {
    location: '',
    fromDate: new Date().toISOString(), // Default to today
    toDate: new Date().toISOString()    // Default to today
  };

  private apiUrl = `${environment.apiUrl}/onsite-attendance`;

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
  
  }

  // Replace ngOnInit with this:
ionViewWillEnter() {
  this.loadAttendanceLogs();
}

//   async loadAttendanceLogs() {
//     const loader = await this.loadingCtrl.create({
//       message: 'Loading history...',
//       spinner: 'crescent'
//     });
//     await loader.present();

//     // Change this URL to your actual NestJS endpoint
//     // const url = `${environment.apiUrl}/attendance/logs?rangerId=${this.rangerId}`;
//     // Ensure the URL matches your NestJS OnsiteAttendance controller
// const url = `${environment.apiUrl}/onsite-attendance`;

//     this.http.get<any[]>(url).subscribe({
//       next: (data) => {
//         this.attendanceLogs = data;
//         this.filteredLogs = data;
//         loader.dismiss();
//       },
//       error: (err) => {
//         console.error('Error fetching logs', err);
//         loader.dismiss();
//         // Fallback dummy data for UI testing
//         this.attendanceLogs = [
//           { id: 1, date: '2026-02-23', totalHours: '9.2', status: 'COMPLETED' },
//           { id: 2, date: '2026-02-22', totalHours: '8.5', status: 'COMPLETED' }
//         ];
//       }
//     });
//   }

async loadAttendanceLogs() {
  const loader = await this.loadingCtrl.create({
    message: 'Loading your logs...',
    spinner: 'crescent'
  });
  await loader.present();

  // URL mein rangerId bhejna zaroori hai
  const url = `${environment.apiUrl}/onsite-attendance/ranger/${this.rangerId}`;

  this.http.get<any[]>(url).subscribe({
    next: (data) => {
      this.allLogs = data; // Sab data backup mein rakha
      
      // Default: Sirf AAJ ka data dikhayein
      this.showTodayOnly();
      loader.dismiss();
    },
    error: (err) => {
      console.error('Error fetching logs', err);
      loader.dismiss();
    }
  });
}

showTodayOnly() {
  const todayDate = new Date().toISOString().split('T')[0];
  this.filteredLogs = this.allLogs.filter(log => {
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    return logDate === todayDate;
  });
}

  viewDetails(log: any) {
    this.navCtrl.navigateForward(['/onsite-attendance-details'], {
      queryParams: { id: log.id }
    });
  }

  

  goBack() {
  // navigateRoot resets the stack and ensures home is the base page
  this.navCtrl.navigateRoot('/home', {
    animated: true,
    animationDirection: 'back'
  });
}

  goToMarkAttendance() {
  this.navCtrl.navigateForward('/onsite-attendance');
}

async deleteLog(id: number, event: Event) {
  event.stopPropagation(); // Prevents opening details

  const alert = await this.alertCtrl.create({
    header: 'Confirm Delete',
    message: 'Are you sure you want to remove this attendance log?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => {
          this.http.delete(`${this.apiUrl}/${id}`).subscribe({
            next: () => {
              // 1. Remove from the master list
              this.attendanceLogs = this.attendanceLogs.filter(log => log.id !== id);
              
              // 2. CRUCIAL: Remove from the displayed list so it vanishes from UI
              this.filteredLogs = this.filteredLogs.filter(log => log.id !== id);
              
              console.log('Log deleted successfully');
            },
            error: (err) => console.error('Delete failed', err)
          });
        }
      }
    ]
  });

  await alert.present();
}


// 3. Apply Filter Logic (Purana data dekhne ke liye)
applyFilters() {
  const start = this.filters.fromDate ? new Date(this.filters.fromDate).setHours(0,0,0,0) : null;
  const end = this.filters.toDate ? new Date(this.filters.toDate).setHours(23,59,59,999) : null;

  this.filteredLogs = this.allLogs.filter(log => {
    const logTime = new Date(log.created_at).getTime();
    
    const matchesFrom = start ? logTime >= start : true;
    const matchesTo = end ? logTime <= end : true;
    const matchesLoc = log.geofence?.toLowerCase().includes(this.filters.location.toLowerCase());

    return matchesFrom && matchesTo && matchesLoc;
  });

  this.isModalOpen = false;
}

// 4. Reset logic
resetFilters() {
  this.filters = { location: '', fromDate: this.today, toDate: this.today };
  this.showTodayOnly();
  this.isModalOpen = false;
}
}
