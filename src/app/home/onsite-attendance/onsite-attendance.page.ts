

// import { Component } from '@angular/core';
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http'; // Import HttpClient

// @Component({
//   selector: 'app-onsite',
//   templateUrl: './onsite-attendance.page.html',
//   styleUrls: ['./onsite-attendance.page.scss'],
//   standalone: false
// })
// export class OnsiteAttendancePage {
//   public locationType: string = 'site';
//   public capturedPhoto: string = 'onsite_photo.jpg'; // Placeholder

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient // Inject HttpClient
//   ) {}

//   goBack() {
//     this.navCtrl.back();
//   }

//   async takePhoto() {
//     console.log('Opening Camera...');
//     // Add Capacitor Camera logic here if needed
//   }

//   async submit() {
//     // 1. Retrieve Ranger details from storage
//     const rangerId = localStorage.getItem('ranger_id');
//     const rangerName = localStorage.getItem('ranger_name');

//     if (!rangerId) {
//       this.presentToast('Error: No Ranger ID found. Please login again.', 'danger');
//       return;
//     }

//     // 2. Prepare the data payload matching your backend route
//     const onsiteData = {
//       ranger_id: rangerId,
//       type: this.locationType, // 'site' or other from your logic
//       photo: this.capturedPhoto,
//       ranger: rangerName,
//       geofence: 'Panna Site Sector 2', // Can be dynamic
//       attendance_type: 'On-Site'
//     };

//     // 3. Call the backend API
//     this.http.post('http://localhost:3000/api/onsite/mark', onsiteData)
//       .subscribe({
//         next: async (res: any) => {
//           await this.presentToast('On-Site Attendance Logged!', 'success');
          
//           // Return to previous page after success
//           setTimeout(() => {
//             this.navCtrl.back();
//           }, 2000);
//         },
//         error: async (err) => {
//           console.error('Onsite Sync Error:', err);
//           this.presentToast('Database Sync Failed!', 'danger');
//         }
//       });
//   }

//   // Helper for consistent toasts
//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 2000,
//       color: color,
//       position: 'bottom',
//       mode: 'ios'
//     });
//     await toast.present();
//   }
// }

import { Component, OnInit } from '@angular/core'; // Added OnInit
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit { // Implemented OnInit
  public locationType: string = 'site';
  public capturedPhoto: string = 'onsite_photo.jpg';
  public rangerName: string = 'Ranger'; // 1. Variable to hold the dynamic name

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  // 2. Load the name from storage on initialization
  ngOnInit() {
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) {
      this.rangerName = storedName;
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  async takePhoto() {
    console.log('Opening Camera...');
  }

  async submit() {
    const rangerId = localStorage.getItem('ranger_id');
    // Use the class variable for the payload
    const rangerName = this.rangerName;

    if (!rangerId) {
      this.presentToast('Error: No Ranger ID found. Please login again.', 'danger');
      return;
    }

    const onsiteData = {
      ranger_id: rangerId,
      type: this.locationType,
      photo: this.capturedPhoto,
      ranger: rangerName,
      geofence: 'Panna Site Sector 2', 
      attendance_type: 'On-Site'
    };

    this.http.post('http://localhost:3000/api/onsite/mark', onsiteData)
      .subscribe({
        next: async (res: any) => {
          await this.presentToast('On-Site Attendance Logged!', 'success');
          setTimeout(() => {
            this.navCtrl.back();
          }, 2000);
        },
        error: async (err) => {
          console.error('Onsite Sync Error:', err);
          this.presentToast('Database Sync Failed!', 'danger');
        }
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }
}