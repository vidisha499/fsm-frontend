

// // import { Component } from '@angular/core';
// // import { NavController, ToastController } from '@ionic/angular';
// // import { HttpClient } from '@angular/common/http'; // Added HttpClient

// // @Component({
// //   selector: 'app-attendance',
// //   templateUrl: './attendance.page.html',
// //   styleUrls: ['./attendance.page.scss'],
// //   standalone: false
// // })
// // export class AttendancePage {
// //   public isEntry: boolean = true;
// //   public capturedPhoto: string = 'camera_capture.jpg'; // Placeholder for photo logic

// //   constructor(
// //     private navCtrl: NavController,
// //     private toastCtrl: ToastController,
// //     private http: HttpClient // Injected HttpClient
// //   ) {}

// //   goBack() {
// //     this.navCtrl.back();
// //   }

// //   setMode(entry: boolean) {
// //     this.isEntry = entry;
// //   }

// //   async captureImage() {
// //     console.log('Opening Camera...');
// //     // When you implement Capacitor Camera, update this.capturedPhoto with the result
// //   }

// //   async submitAttendance() {
// //     // 1. Get user details from localStorage
// //     const rangerId = localStorage.getItem('ranger_id');
// //     const rangerName = localStorage.getItem('ranger_name');

// //     if (!rangerId) {
// //       this.presentToast('Error: No Ranger ID found. Please log in again.', 'danger');
// //       return;
// //     }

// //     // 2. Prepare the data payload
// //     const attendanceData = {
// //       ranger_id: rangerId,
// //       photo: this.capturedPhoto,
// //       ranger: rangerName,
// //       geofence: 'Panna Sector 4.2' // You can make this dynamic later
// //     };

// //     // 3. ACTUAL API CALL
// //     this.http.post('http://localhost:3000/api/attendance/beat-attendance', attendanceData)
// //       .subscribe({
// //         next: async (res: any) => {
// //           await this.presentToast('Attendance Marked Successfully!', 'success');
          
// //           // Only navigate back if the database actually saved it
// //           setTimeout(() => {
// //             this.navCtrl.back();
// //           }, 2100);
// //         },
// //         error: async (err) => {
// //           console.error('API Error:', err);
// //           this.presentToast('Database Sync Failed. Check Connection.', 'danger');
// //         }
// //       });
// //   }

// //   async presentToast(message: string, color: string) {
// //     const toast = await this.toastCtrl.create({
// //       message: message,
// //       duration: 2000,
// //       position: 'bottom',
// //       color: color,
// //       mode: 'ios'
// //     });
// //     toast.present();
// //   }
// // }

// import { Component, OnInit } from '@angular/core'; // Added OnInit
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// @Component({
//   selector: 'app-attendance',
//   templateUrl: './attendance.page.html',
//   styleUrls: ['./attendance.page.scss'],
//   standalone: false
// })
// export class AttendancePage implements OnInit { // Implemented OnInit
//   public isEntry: boolean = true;
//   public capturedPhoto: string = '';
//   public rangerName: string = ''; 
 
//   public region: string = 'Detecting...';
//   public selectedSite: string = 'panna';// Variable to hold the name

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient
//   ) {}

//   ngOnInit() {
   
//     this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    
//     // 2. Load Region (If not found, it defaults to 'Washim')
//     const storedRegion = localStorage.getItem('ranger_region');
//     this.rangerRegion = storedRegion ? storedRegion : 'Washim';
//   }

//   // ✅ Camera Integration
//   async captureImage() {
//     try {
//       const image = await Camera.getPhoto({
//         quality: 90,
//         allowEditing: false,
//         resultType: CameraResultType.Base64, // Base64 is easier to send to DB
//         source: CameraSource.Camera
//       });

//       this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
//     } catch (error) {
//       console.error('Camera error', error);
//     }
//   }

//   async submitAttendance() {
//     const rangerId = localStorage.getItem('ranger_id');
//     rangerName: this.rangerName,
//       region: this.rangerRegion, // Now sending the specific region
//       type: this.isEntry ? 'ENTRY' : 'EXIT';

//     if (!this.capturedPhoto) {
//       this.presentToast('Please capture ID photo first!', 'warning');
//       return;
//     }

//     const attendanceData = {
//       ranger_id: Number(rangerId),
//       photo: this.capturedPhoto,
//       rangerName: this.rangerName,
//       geofence: this.selectedSite,
//       type: this.isEntry ? 'ENTRY' : 'EXIT',
//       timestamp: new Date()
//     };

//     // ✅ Match the route to your backend controller (@Post)
//     this.http.post('http://localhost:3000/api/attendance', attendanceData)
//       .subscribe({
//         next: async (res: any) => {
//           await this.presentToast('Attendance Marked Successfully!', 'success');
//           setTimeout(() => this.navCtrl.back(), 2000);
//         },
//         error: async (err) => {
//           this.presentToast('Database Sync Failed.', 'danger');
//         }
//       });
//   }

//   goBack() {
//     this.navCtrl.back();
//   }

//   setMode(entry: boolean) {
//     this.isEntry = entry;
//   }

//   // async captureImage() {
//   //   console.log('Opening Camera...');
//   // }

//   // async submitAttendance() {
//   //   const rangerId = localStorage.getItem('ranger_id');
//   //   // Use the variable we already loaded
//   //   const rangerName = this.rangerName;

//   //   if (!rangerId) {
//   //     this.presentToast('Error: No Ranger ID found. Please log in again.', 'danger');
//   //     return;
//   //   }

//   //   const attendanceData = {
//   //     ranger_id: rangerId,
//   //     photo: this.capturedPhoto,
//   //     ranger: rangerName,
//   //     geofence: 'Panna Sector 4.2',
//   //     type: this.isEntry ? 'ENTRY' : 'EXIT' // Added type to distinguish Entry/Exit
//   //   };

//   //   this.http.post('http://localhost:3000/api/attendance/beat-attendance', attendanceData)
//   //     .subscribe({
//   //       next: async (res: any) => {
//   //         await this.presentToast('Attendance Marked Successfully!', 'success');
//   //         setTimeout(() => {
//   //           this.navCtrl.back();
//   //         }, 2100);
//   //       },
//   //       error: async (err) => {
//   //         console.error('API Error:', err);
//   //         this.presentToast('Database Sync Failed. Check Connection.', 'danger');
//   //       }
//   //     });
//   // }

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

import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit {
  // ✅ All properties must be declared here
  public isEntry: boolean = true;
  public capturedPhoto: string = '';
  public rangerName: string = 'Loading...';
  public rangerRegion: string = 'Washim'; // Added missing property
  public selectedSite: string = 'panna';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load data from storage
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    const storedRegion = localStorage.getItem('ranger_region');
    this.rangerRegion = storedRegion ? storedRegion : 'Washim';
  }

  goBack() {
    this.navCtrl.back();
  }

  setMode(entry: boolean) {
    this.isEntry = entry;
  }

  

 // attendance.page.ts
async captureImage() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      // ✅ Change this from 'Prompt' to 'Camera' to force the lens to open
      source: CameraSource.Camera 
    });

    if (image.base64String) {
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
    }
  } catch (error) {
    console.warn('Camera closed');
  }
}
  async submitAttendance() {
    const rangerId = localStorage.getItem('ranger_id');

    if (!rangerId) {
      this.presentToast('Error: No Ranger ID found.', 'danger');
      return;
    }

    if (!this.capturedPhoto) {
      this.presentToast('Please capture ID photo first!', 'warning');
      return;
    }

    // ✅ Fixed Syntax: Using commas (,) not semicolons (;) inside objects
    const attendanceData = {
      ranger_id: Number(rangerId),
      photo: this.capturedPhoto,
      rangerName: this.rangerName,
      region: this.rangerRegion,
      geofence: this.selectedSite,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      timestamp: new Date()
    };

    this.http.post('http://localhost:3000/api/attendance', attendanceData)
      .subscribe({
        next: async (res: any) => {
          await this.presentToast('Attendance Marked Successfully!', 'success');
          setTimeout(() => this.navCtrl.back(), 2000);
        },
        error: async (err) => {
          console.error('API Error:', err);
          this.presentToast('Database Sync Failed.', 'danger');
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