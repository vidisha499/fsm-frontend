


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

import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {

  // Bound to your HTML via [(ngModel)]
  public incidentData = {
    priority: 'High Priority',
    criteria: 'Fire Warning',
    cause: 'Short Circuit',
    observation: '',
    photo: 'incident_capture.jpg'
  };

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) { }

  ngOnInit() { }

  goBack() {
    this.navCtrl.back();
  }

  async submitReport() {
    const rangerId = localStorage.getItem('ranger_id');

    if (!rangerId) {
      this.presentToast('Error: No Ranger session found. Please log in.', 'danger');
      return;
    }

    // Mapping incidentData to the database column names
    const payload = {
      ranger_id: rangerId,
      photo: this.incidentData.photo,
      priority: this.incidentData.priority,
      criteria: this.incidentData.criteria,
      cause: this.incidentData.cause,
      observation: this.incidentData.observation
    };

    console.log("🚀 Sending Incident Payload:", payload);

    this.http.post('http://localhost:3000/api/incidents/report', payload)
      .subscribe({
        next: async (res: any) => {
          const toast = await this.toastCtrl.create({
            message: '🚨 INCIDENT PROTOCOL SUBMITTED',
            duration: 2500,
            color: 'success',
            position: 'bottom',
            mode: 'ios',
            buttons: [{ side: 'start', icon: 'shield-checkmark' }]
          });
          await toast.present();

          setTimeout(() => {
            this.navCtrl.back();
          }, 500);
        },
        error: async (err) => {
          console.error('Submission Error:', err);
          const errorMessage = err.error?.error || 'Sync failed with server.';
          this.presentToast(errorMessage, 'danger');
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
}