

// import { Component } from '@angular/core';
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http'; // Added HttpClient

// @Component({
//   selector: 'app-attendance',
//   templateUrl: './attendance.page.html',
//   styleUrls: ['./attendance.page.scss'],
//   standalone: false
// })
// export class AttendancePage {
//   public isEntry: boolean = true;
//   public capturedPhoto: string = 'camera_capture.jpg'; // Placeholder for photo logic

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient // Injected HttpClient
//   ) {}

//   goBack() {
//     this.navCtrl.back();
//   }

//   setMode(entry: boolean) {
//     this.isEntry = entry;
//   }

//   async captureImage() {
//     console.log('Opening Camera...');
//     // When you implement Capacitor Camera, update this.capturedPhoto with the result
//   }

//   async submitAttendance() {
//     // 1. Get user details from localStorage
//     const rangerId = localStorage.getItem('ranger_id');
//     const rangerName = localStorage.getItem('ranger_name');

//     if (!rangerId) {
//       this.presentToast('Error: No Ranger ID found. Please log in again.', 'danger');
//       return;
//     }

//     // 2. Prepare the data payload
//     const attendanceData = {
//       ranger_id: rangerId,
//       photo: this.capturedPhoto,
//       ranger: rangerName,
//       geofence: 'Panna Sector 4.2' // You can make this dynamic later
//     };

//     // 3. ACTUAL API CALL
//     this.http.post('http://localhost:3000/api/attendance/beat-attendance', attendanceData)
//       .subscribe({
//         next: async (res: any) => {
//           await this.presentToast('Attendance Marked Successfully!', 'success');
          
//           // Only navigate back if the database actually saved it
//           setTimeout(() => {
//             this.navCtrl.back();
//           }, 2100);
//         },
//         error: async (err) => {
//           console.error('API Error:', err);
//           this.presentToast('Database Sync Failed. Check Connection.', 'danger');
//         }
//       });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 2000,
//       position: 'bottom',
//       color: color,
//       mode: 'ios'
//     });
//     toast.present();
//   }
// }

import { Component, OnInit } from '@angular/core'; // Added OnInit
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit { // Implemented OnInit
  public isEntry: boolean = true;
  public capturedPhoto: string = 'camera_capture.jpg';
  public rangerName: string = 'Ranger'; // Variable to hold the name

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load name from storage when page opens
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) {
      this.rangerName = storedName;
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  setMode(entry: boolean) {
    this.isEntry = entry;
  }

  async captureImage() {
    console.log('Opening Camera...');
  }

  async submitAttendance() {
    const rangerId = localStorage.getItem('ranger_id');
    // Use the variable we already loaded
    const rangerName = this.rangerName;

    if (!rangerId) {
      this.presentToast('Error: No Ranger ID found. Please log in again.', 'danger');
      return;
    }

    const attendanceData = {
      ranger_id: rangerId,
      photo: this.capturedPhoto,
      ranger: rangerName,
      geofence: 'Panna Sector 4.2',
      type: this.isEntry ? 'ENTRY' : 'EXIT' // Added type to distinguish Entry/Exit
    };

    this.http.post('http://localhost:3000/api/attendance/beat-attendance', attendanceData)
      .subscribe({
        next: async (res: any) => {
          await this.presentToast('Attendance Marked Successfully!', 'success');
          setTimeout(() => {
            this.navCtrl.back();
          }, 2100);
        },
        error: async (err) => {
          console.error('API Error:', err);
          this.presentToast('Database Sync Failed. Check Connection.', 'danger');
        }
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color,
      mode: 'ios'
    });
    toast.present();
  }
}