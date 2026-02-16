

// import { HttpClient } from '@angular/common/http'; 
// import { Component, OnInit } from '@angular/core';
// import { ActionSheetController, NavController, ToastController, LoadingController } from '@ionic/angular';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// @Component({
//   selector: 'app-new-incident',
//   templateUrl: './new-incident.page.html',
//   styleUrls: ['./new-incident.page.scss'],
//   standalone: false
// })
// export class NewIncidentPage implements OnInit {
//   isSubmitting: boolean = false;
//   public capturedPhoto: string | null = null;
  
//   public incidentData = {
//     priority: 'High Priority',
//     criteria: 'Fire Warning',
//     cause: 'Short Circuit',
//     observation: ''
//   };

//   private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/incidents';

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient,
//     private loadingCtrl: LoadingController,
//     private actionSheetCtrl: ActionSheetController 
//   ) { }

//   ngOnInit() { }

//   goBack() {
//     this.navCtrl.back();
//   }

//   // Updated takePhoto to trigger the menu with the Cancel option
//   async takePhoto() {
//     const actionSheet = await this.actionSheetCtrl.create({
//       header: 'SELECT PHOTO SOURCE',
//       cssClass: 'premium-action-sheet',
//       buttons: [
//         { 
//           text: 'Take Picture', 
//           icon: 'camera-outline', 
//           handler: () => this.captureImage(CameraSource.Camera) 
//         },
//         { 
//           text: 'From Photos', 
//           icon: 'image-outline', 
//           handler: () => this.captureImage(CameraSource.Photos) 
//         },
//         { 
//           text: 'Cancel', 
//           icon: 'close-outline',
//           role: 'cancel',
//           handler: () => {
//             console.log('User cancelled selection');
//           }
//         }
//       ]
//     });
//     await actionSheet.present();
//   }

//   // Shared logic for both Camera and Gallery
//   async captureImage(source: CameraSource) {
//     try {
//       const image = await Camera.getPhoto({
//         quality: 50,
//         allowEditing: false,
//         resultType: CameraResultType.Base64,
//         source: source
//       });

//       if (image && image.base64String) {
//         this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
//       }
//     } catch (error) {
//       console.log('User closed camera/gallery without selection');
//     }
//   }

//   async submitReport() {
//     if (this.isSubmitting) return;

//     const rangerId = localStorage.getItem('ranger_id');
//     if (!rangerId) {
//       this.presentToast('Session expired. Please login.', 'danger');
//       return;
//     }

//     this.isSubmitting = true;

//     const payload = {
//       rangerId: +rangerId,
//       photo: this.capturedPhoto, 
//       responsePriority: this.incidentData.priority,
//       incidentCriteria: this.incidentData.criteria,
//       rootCause: this.incidentData.cause,
//       fieldObservation: this.incidentData.observation
//     };

//     this.http.post(this.apiUrl, payload).subscribe({
//       next: () => {
//         setTimeout(() => {
//           this.isSubmitting = false;
//           this.presentToast('Incident reported successfully!', 'success');
//           this.navCtrl.back();
//         }, 1000);
//       },
//       error: (err: any) => { 
//         this.isSubmitting = false;
//         console.error('Upload failed', err);
//         this.presentToast('Upload Failed: Check internet.', 'danger');
//       }
//     });
//   }

//   adjustHeight(event: any) {
//     const textArea = event.target;
//     textArea.style.height = 'auto'; 
//     textArea.style.height = textArea.scrollHeight + 'px';
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 3000,
//       color: color,
//       position: 'bottom',
//       mode: 'ios'
//     });
//     toast.present();
//   }
// }

import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit } from '@angular/core';
import { ActionSheetController, NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {
  isSubmitting: boolean = false;
  
  // Array to hold up to 5 photos
  public capturedPhotos: string[] = []; 
  
  public incidentData = {
    priority: 'High Priority',
    criteria: 'Fire Warning',
    cause: 'Short Circuit',
    observation: ''
  };

  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/incidents';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController 
  ) { }

  ngOnInit() { }

  goBack() {
    this.navCtrl.back();
  }

  async takePhoto() {
    // Prevent adding more than 5
    if (this.capturedPhotos.length >= 5) {
      this.presentToast('Maximum 5 photos allowed', 'warning');
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: `ATTACH EVIDENCE (${this.capturedPhotos.length}/5)`,
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Take Picture', icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: 'From Photos', icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });

      if (image && image.base64String) {
        const base64 = `data:image/jpeg;base64,${image.base64String}`;
        this.capturedPhotos.push(base64);
      }
    } catch (error) {
      console.log('User cancelled');
    }
  }

  // Essential for the "X" button in HTML
  removePhoto(index: number) {
    this.capturedPhotos.splice(index, 1);
  }

async submitReport() {
  if (this.isSubmitting) return;

  // 1. New Guard: Check if photos exist
  if (!this.capturedPhotos || this.capturedPhotos.length === 0) {
    this.presentToast('Action Required: Please add at least one photo.', 'warning');
    return; // Stop the function here
  }

  const rangerId = localStorage.getItem('ranger_id');
  if (!rangerId) {
    this.presentToast('Session expired. Please login.', 'danger');
    return;
  }

  this.isSubmitting = true;

  const payload = {
    rangerId: +rangerId,
    photos: this.capturedPhotos, 
    responsePriority: this.incidentData.priority,
    incidentCriteria: this.incidentData.criteria,
    rootCause: this.incidentData.cause,
    fieldObservation: this.incidentData.observation
  };

  this.http.post(this.apiUrl, payload).subscribe({
    next: () => {
      setTimeout(() => {
        this.isSubmitting = false;
        this.presentToast('Incident reported successfully!', 'success');
        this.navCtrl.back();
      }, 1000);
    },
    error: (err: any) => { 
      this.isSubmitting = false;
      this.presentToast('Upload Failed: Check internet.', 'danger');
    }
  });
}

  adjustHeight(event: any) {
    const textArea = event.target;
    textArea.style.height = 'auto'; 
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }
}