
import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit ,  ChangeDetectorRef} from '@angular/core';
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
  public currentTranslateX: number = 0;
public textOpacity: number = 1;
private startX: number = 0;
private maxSlide: number = 0;
  
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
    private actionSheetCtrl: ActionSheetController ,
    private cdr: ChangeDetectorRef
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

// async submitReport() {
//   if (this.isSubmitting) return;

//   // 1. New Guard: Check if photos exist
//   if (!this.capturedPhotos || this.capturedPhotos.length === 0) {
//     this.presentToast('Action Required: Please add at least one photo.', 'warning');
//     return; // Stop the function here
//   }

//   const rangerId = localStorage.getItem('ranger_id');
//   if (!rangerId) {
//     this.presentToast('Session expired. Please login.', 'danger');
//     return;
//   }

//   this.isSubmitting = true;

//   const payload = {
//     rangerId: +rangerId,
//     photos: this.capturedPhotos, 
//     responsePriority: this.incidentData.priority,
//     incidentCriteria: this.incidentData.criteria,
//     rootCause: this.incidentData.cause,
//     fieldObservation: this.incidentData.observation
//   };

//   this.http.post(this.apiUrl, payload).subscribe({
//     next: () => {
//       setTimeout(() => {
//         this.isSubmitting = false;
//         this.presentToast('Incident reported successfully!', 'success');
//         this.navCtrl.back();
//       }, 1000);
//     },
//     error: (err: any) => { 
//       this.isSubmitting = false;
//       this.presentToast('Upload Failed: Check internet.', 'danger');
//     }
//   });
// }

async submitReport() {
  if (this.isSubmitting) return;

  // 1. New Guard: Check if photos exist
  if (!this.capturedPhotos || this.capturedPhotos.length === 0) {
    this.presentToast('Action Required: Please add at least one photo.', 'warning');
    // Snap slider back if they try to slide without photos
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
    return; 
  }

  const rangerId = localStorage.getItem('ranger_id');
  if (!rangerId) {
    this.presentToast('Session expired. Please login.', 'danger');
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
    return;
  }

  // 2. Lock UI for Animation
  this.isSubmitting = true;
  this.textOpacity = 0; // Hide 'SUBMIT REPORT' text
  
  // Ensure maxSlide is calculated to lock the handle at the end
  const container = document.querySelector('.slider-track');
  if (container) {
    this.maxSlide = container.clientWidth - 64; 
  }
  this.currentTranslateX = this.maxSlide; 
  this.cdr.detectChanges();

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
      // 3. Success: Show state, then go back
      setTimeout(() => {
        this.presentToast('Incident reported successfully!', 'success');
        
        // Wait for user to see the success state before navigating
        setTimeout(() => {
          this.isSubmitting = false;
          this.navCtrl.back();
        }, 1000);
      }, 500);
    },
    error: (err: any) => { 
      // 4. Failure: Reset slider so user can try again
      this.isSubmitting = false;
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.presentToast('Upload Failed: Check internet.', 'danger');
      this.cdr.detectChanges();
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

  onDragStart(event: TouchEvent) {
  // Prevent sliding if already submitting OR if no photos are captured
  if (this.isSubmitting || this.capturedPhotos.length === 0) return;
  
  this.startX = event.touches[0].clientX - this.currentTranslateX;
  
  const container = document.querySelector('.slider-track');
  if (container) {
    // 52px handle width + 12px padding (6px left + 6px right)
    this.maxSlide = container.clientWidth - 64; 
  }
}

onDragMove(event: TouchEvent) {
  if (this.isSubmitting || this.capturedPhotos.length === 0) return;

  let moveX = event.touches[0].clientX - this.startX;

  if (moveX < 0) moveX = 0;
  if (moveX > this.maxSlide) moveX = this.maxSlide;

  this.currentTranslateX = moveX;
  this.textOpacity = 1 - (moveX / this.maxSlide);
  this.cdr.detectChanges();
}

onDragEnd() {
  if (this.isSubmitting || this.capturedPhotos.length === 0) return;

  // Requirement: User must slide 85% to trigger
  if (this.currentTranslateX >= this.maxSlide * 0.85) {
    this.currentTranslateX = this.maxSlide;
    this.textOpacity = 0;
    this.submitReport(); // Call your existing submission function
  } else {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }
  this.cdr.detectChanges();
}
}