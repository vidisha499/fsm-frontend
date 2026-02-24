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
  
  // attendanceLogs: any[] = [];
  rangerId: number = 145; // Replace with your actual auth storage value
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

  async loadAttendanceLogs() {
    const loader = await this.loadingCtrl.create({
      message: 'Loading history...',
      spinner: 'crescent'
    });
    await loader.present();

    // Change this URL to your actual NestJS endpoint
    // const url = `${environment.apiUrl}/attendance/logs?rangerId=${this.rangerId}`;
    // Ensure the URL matches your NestJS OnsiteAttendance controller
const url = `${environment.apiUrl}/onsite-attendance`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.attendanceLogs = data;
        this.filteredLogs = data;
        loader.dismiss();
      },
      error: (err) => {
        console.error('Error fetching logs', err);
        loader.dismiss();
        // Fallback dummy data for UI testing
        this.attendanceLogs = [
          { id: 1, date: '2026-02-23', totalHours: '9.2', status: 'COMPLETED' },
          { id: 2, date: '2026-02-22', totalHours: '8.5', status: 'COMPLETED' }
        ];
      }
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



  applyFilters() {
    this.filteredLogs = this.attendanceLogs.filter(log => {
      const logDate = new Date(log.created_at).setHours(0,0,0,0);
      const from = this.filters.fromDate ? new Date(this.filters.fromDate).setHours(0,0,0,0) : null;
      const to = this.filters.toDate ? new Date(this.filters.toDate).setHours(0,0,0,0) : null;
      
      const matchesLocation = log.geofence?.toLowerCase().includes(this.filters.location.toLowerCase());
      const matchesFrom = from ? logDate >= from : true;
      const matchesTo = to ? logDate <= to : true;

      return matchesLocation && matchesFrom && matchesTo;
    });

    this.isModalOpen = false;
  }

  resetFilters() {
    this.filters = { location: '', fromDate: '', toDate: '' };
    this.filteredLogs = [...this.attendanceLogs];
    this.isModalOpen = false;
  }
}
