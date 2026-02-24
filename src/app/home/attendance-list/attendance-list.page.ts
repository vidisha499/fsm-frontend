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
  
  attendanceLogs: any[] = [];
  attendance: any;
  startDate: string | undefined;
  endDate: string | undefined;
  maxDate: string = new Date().toISOString();
  isFiltered: boolean = false;
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
    this.loadAttendanceLogs();
    this.attendance = this.dataService.getSelectedAttendance();
    
    if (!this.attendance) {
      // Optional: Agar logic ki zaroorat na ho toh ise hata sakte hain
      // this.navCtrl.navigateBack('/home/attendance-list');
    }
  }

  ionViewWillEnter() {
    this.loadAttendanceLogs();
  }

  // UPDATE: Added 'from' and 'to' parameters to fix TS2554
  async loadAttendanceLogs(from?: string, to?: string) {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    const loader = await this.loadingCtrl.create({
      message: 'Fetching Logs...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    // Query parameters build karein
    let url = `${this.apiUrl}/ranger/${rangerId}`;
    if (from && to) {
      const formattedFrom = from.split('T')[0];
      const formattedTo = to.split('T')[0];
      url += `?startDate=${formattedFrom}&endDate=${formattedTo}`;
    }

    this.http.get(url).subscribe({
      next: (data: any) => {
        this.attendanceLogs = data.map((log: any) => {
          const rawDate = log.created_at || log.createdAt; 
          const utcDate = new Date(rawDate);
          const validDate = isNaN(utcDate.getTime()) ? new Date() : utcDate;

          // IST adjustment logic (as per your code)
          const IST_OFFSET = 5.5 * 60 * 60 * 1000;
          const adjustedDate = new Date(validDate.getTime() - IST_OFFSET);
          
          return {
            ...log,
            createdAt: adjustedDate.toISOString() 
          };
        });
        loader.dismiss();
      },
      error: (err) => {
        console.error("Fetch error:", err);
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

  applyFilter() {
    if (this.startDate && this.endDate) {
      this.isFiltered = true;
      this.loadAttendanceLogs(this.startDate, this.endDate);
      if (this.filterModal) this.filterModal.dismiss();
    }
  }

  clearFilter() {
    this.isFiltered = false;
    this.startDate = undefined;
    this.endDate = undefined;
    this.loadAttendanceLogs(); 
    if (this.filterModal) this.filterModal.dismiss();
  }

  goToMarkAttendance() {
    // Ye aapko attendance mark karne wale page par le jayega
    this.navCtrl.navigateForward('/attendance'); 
  }
}