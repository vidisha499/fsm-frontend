


// import { Component, OnInit } from '@angular/core';
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';

// @Component({
//   selector: 'app-new-incident',
//   templateUrl: './new-incident.page.html',
//   styleUrls: ['./new-incident.page.scss'],
//   standalone: false
// })
// export class NewIncidentPage implements OnInit {

//   // Ensure these properties match your HTML [(ngModel)] bindings
//   public incidentData = {
//     priority: 'High Priority',
//     criteria: 'Fire Warning',
//     cause: 'Short Circuit',
//     observation: '',
//     photo: 'incident_capture.jpg'
//   };

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient
//   ) { }

//   ngOnInit() { }

//   goBack() {
//     this.navCtrl.back();
//   }

//   async submitReport() {
//     const rangerId = localStorage.getItem('ranger_id');

//     if (!rangerId) {
//       this.presentToast('Error: No Ranger session found.', 'danger');
//       return;
//     }

//     // This payload must match the keys in your backend destructuring
//     const payload = {
//       ranger_id: rangerId,
//       photo: this.incidentData.photo,
//       priority: this.incidentData.priority,
//       criteria: this.incidentData.criteria,
//       cause: this.incidentData.cause,
//       observation: this.incidentData.observation
//     };

//     this.http.post('http://localhost:3000/api/incidents/report', payload)
//       .subscribe({
//         next: async (res: any) => {
//           const toast = await this.toastCtrl.create({
//             message: '🚨 INCIDENT PROTOCOL SUBMITTED',
//             duration: 2500,
//             color: 'success',
//             position: 'bottom',
//             mode: 'ios',
//             buttons: [{ side: 'start', icon: 'shield-checkmark' }]
//           });
//           await toast.present();

//           setTimeout(() => {
//             this.navCtrl.back();
//           }, 500);
//         },
//         error: async (err) => {
//           // Captures the 400 error and displays the reason
//           console.error('Submission Error:', err);
//           const errorMessage = err.error?.error || 'Sync failed with server.';
//           this.presentToast(errorMessage, 'danger');
//         }
//       });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 3000,
//       color: color,
//       position: 'bottom'
//     });
//     toast.present();
//   }
// }

// import { Component, OnInit } from '@angular/core';
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// @Component({
//   selector: 'app-new-incident',
//   templateUrl: './new-incident.page.html',
//   styleUrls: ['./new-incident.page.scss'],
//   standalone: false
// })
// export class NewIncidentPage implements OnInit {

//   // Bound to your HTML via [(ngModel)]
//   public capturedPhoto: string | null = null; // To preview the image
//   public incidentData = {
//     priority: 'High Priority',
//     criteria: 'Fire Warning',
//     cause: 'Short Circuit',
//     observation: '',
//     photo: 'incident_capture.jpg'
//   };

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient
//   ) { }

//   ngOnInit() { }

//   goBack() {
//     this.navCtrl.back();
//   }

//   async submitReport() {
//     const rangerId = localStorage.getItem('ranger_id');

//     if (!rangerId) {
//       this.presentToast('Error: No Ranger session found. Please log in.', 'danger');
//       return;
//     }

//     // Mapping incidentData to the database column names
//     const payload = {
//       ranger_id: rangerId,
//       photo: this.incidentData.photo,
//       priority: this.incidentData.priority,
//       criteria: this.incidentData.criteria,
//       cause: this.incidentData.cause,
//       observation: this.incidentData.observation
//     };

//     console.log("🚀 Sending Incident Payload:", payload);

//     this.http.post('http://localhost:3000/api/incidents/report', payload)
//       .subscribe({
//         next: async (res: any) => {
//           const toast = await this.toastCtrl.create({
//             message: '🚨 INCIDENT PROTOCOL SUBMITTED',
//             duration: 2500,
//             color: 'success',
//             position: 'bottom',
//             mode: 'ios',
//             buttons: [{ side: 'start', icon: 'shield-checkmark' }]
//           });
//           await toast.present();

//           setTimeout(() => {
//             this.navCtrl.back();
//           }, 500);
//         },
//         error: async (err) => {
//           console.error('Submission Error:', err);
//           const errorMessage = err.error?.error || 'Sync failed with server.';
//           this.presentToast(errorMessage, 'danger');
//         }
//       });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 3000,
//       color: color,
//       position: 'bottom'
//     });
//     toast.present();
//   }

//   async takePhoto() {
//   try {
//     const image = await Camera.getPhoto({
//       quality: 90,
//       allowEditing: false,
//       resultType: CameraResultType.Base64, // Get image as a string
//       source: CameraSource.Prompt // Asks user: Gallery or Camera?
//     });

//     // Save for preview and payload
//     this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
//     this.incidentData.photo = image.base64String; // This goes to the DB
//   } catch (error) {
//     console.error('Camera closed or failed', error);
//   }
// }
// }


// 1. Make sure this import is at the VERY top
import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {

  public capturedPhoto: string | null = null;
  public incidentData = {
    priority: 'High Priority',
    criteria: 'Fire Warning',
    cause: 'Short Circuit',
    observation: ''
  };

  // 2. Update your constructor to include 'private http: HttpClient'
  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient 
  ) { }

  ngOnInit() { }

  goBack() {
    this.navCtrl.back();
  }

  // 3. Keep ONLY THIS ONE submitReport function. Delete any other copies!
  async submitReport() {
    const rangerId = localStorage.getItem('ranger_id');
    
    if (!rangerId) {
      this.presentToast('Session expired. Please login.', 'danger');
      return;
    }

    const payload = {
      rangerId: +rangerId,
      photo: this.capturedPhoto, 
      responsePriority: this.incidentData.priority,
      incidentCriteria: this.incidentData.criteria,
      rootCause: this.incidentData.cause,
      fieldObservation: this.incidentData.observation
    };

    // Note: We use (err: any) to fix the 'implicitly has an any type' error
    this.http.post('http://localhost:3000/api/incidents', payload).subscribe({
      next: () => {
        this.presentToast('Incident reported successfully!', 'success');
        this.navCtrl.back();
      },
      error: (err: any) => { 
        console.error('Upload failed', err);
        this.presentToast('Server Error: Could not save incident.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Get image as a string
        source: CameraSource.Prompt // Asks user: Gallery or Camera?
      });

      // Save for preview and payload
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
    } catch (error) {
      console.error('Camera closed or failed', error);
    }
  }
}