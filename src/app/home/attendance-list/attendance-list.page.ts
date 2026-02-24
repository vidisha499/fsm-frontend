

import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DataService } from '../../data.service'; // Check your path
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-attendance-list',
  templateUrl: './attendance-list.page.html',
  styleUrls: ['./attendance-list.page.scss'],
  standalone: false
})
export class AttendanceListPage implements OnInit {
  attendanceLogs: any[] = [];
  attendance: any;
  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private router: Router,
    private dataService: DataService,
    private translate: TranslateService
  ) {}

  ngOnInit() {

    this.attendance = this.dataService.getSelectedAttendance();
    
    // Agar page refresh ho jaye aur data ud jaye, toh wapas list par bhej do
    if (!this.attendance) {
      this.navCtrl.navigateBack('/home/attendance-list');
    }
  }

  ionViewWillEnter() {
    this.loadAttendanceLogs();
  }

 async loadAttendanceLogs() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    const loader = await this.loadingCtrl.create({
      message: 'Fetching Logs...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/ranger/${rangerId}`).subscribe({
      next: (data: any) => {
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        
        this.attendanceLogs = data.map((log: any) => {
          // 👈 Yahan 'log.created_at' likhiye kyunki NestJS entity wahi bhej rahi hai
          const utcDate = new Date(log.created_at); 
          
          const adjustedDate = new Date(utcDate.getTime() - IST_OFFSET);
          return {
            ...log,
            // Card layout 'createdAt' expect kar raha hai, isliye key yahi rakhein
            createdAt: adjustedDate.toISOString() 
          };
        });
        loader.dismiss();
      },
      error: () => {
        loader.dismiss();
      }
    });
  }

  formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  goToMarkAttendance() {
    // Ye aapke purane Attendance Form page ka route hona chahiye
    this.navCtrl.navigateForward('/attendance'); 
  }

  viewDetails(log: any) {
    this.dataService.setSelectedAttendance(log); // Make sure this method exists in DataService
    this.router.navigate([`/attendance-detail/${log.id}`]);
  }

  goBack() {
    this.navCtrl.navigateRoot('/home');
  }
}