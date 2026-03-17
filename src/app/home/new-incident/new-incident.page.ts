import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActionSheetController, NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {
  private readonly MAX_WIDTH = 700;
  isSubmitting: boolean = false;
  public capturedPhotos: string[] = []; 
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0;
  map: any;
  lat: any = 'Detecting...';
  lng: any = 'Detecting...';
  
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
    private actionSheetCtrl: ActionSheetController,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

 ngOnInit() { 
  setTimeout(() => {
    this.initIncidentMap();
  }, 600);
}

async initIncidentMap() {
  try {
    const coordinates = await Geolocation.getCurrentPosition();
    this.lat = coordinates.coords.latitude.toFixed(6);
    this.lng = coordinates.coords.longitude.toFixed(6);

    // Create map
    this.map = L.map('incidentMap', {
      zoomControl: false,
      attributionControl: false
    }).setView([this.lat, this.lng], 15);

    // Add Google Maps layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    // Add the 📍 icon we used in the previous page
    const incidentIcon = L.divIcon({
      className: 'incident-pin',
      html: `<div style="font-size: 24px;">📍</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    L.marker([this.lat, this.lng], { icon: incidentIcon }).addTo(this.map);

  } catch (error) {
    console.error('Error getting location', error);
    this.lat = 'Location Error';
    this.lng = 'Location Error';
  }
}

  goBack() { this.navCtrl.back(); }

  async takePhoto() {
    if (this.capturedPhotos.length >= 5) {
      const msg = await this.translate.get('REPORT.MAX_PHOTO_MSG').toPromise();
      this.presentToast(msg, 'warning');
      return;
    }

    const headerTxt = await this.translate.get('REPORT.ATTACH_HEADER').toPromise();
    const camTxt = await this.translate.get('REPORT.TAKE_PICTURE').toPromise();
    const galleryTxt = await this.translate.get('REPORT.FROM_PHOTOS').toPromise();
    const cancelTxt = await this.translate.get('REPORT.CANCEL').toPromise();

    const actionSheet = await this.actionSheetCtrl.create({
      header: `${headerTxt} (${this.capturedPhotos.length}/5)`,
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: camTxt, icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: galleryTxt, icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: cancelTxt, icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }


// --- IMAGE COMPRESSION LOGIC (The Fix) ---
  async compressAndResize(base64Str: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700; // Size aur chota kiya taaki multiple photos aa sakein
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 0.4 = 40% quality. Ye size ko drastically kam kar dega.
        const compressed = canvas.toDataURL('image/jpeg', 0.4);
        resolve(compressed); 
      };
    });
  }

  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 40,
        resultType: CameraResultType.Base64,
        source: source
      });
      if (image && image.base64String) {
       const compressedPhoto = await this.compressAndResize(image.base64String);
      this.capturedPhotos.push(compressedPhoto);
      }
    } catch (e) { console.log('Cancelled'); }
  }

  removePhoto(index: number) { this.capturedPhotos.splice(index, 1); }

  // async submitReport() {
  //   if (this.isSubmitting) return;

  //   if (!this.capturedPhotos.length) {
  //     const msg = await this.translate.get('REPORT.PHOTO_REQ_MSG').toPromise();
  //     this.presentToast(msg, 'warning');
  //     this.resetSlider();
  //     return; 
  //   }

  //   const rangerId = localStorage.getItem('ranger_id');
  //   if (!rangerId) {
  //     this.presentToast('Session expired.', 'danger');
  //     this.resetSlider();
  //     return;
  //   }

  //   this.isSubmitting = true;
  //   this.textOpacity = 0;
    
  //   const container = document.querySelector('.slider-track');
  //   if (container) this.maxSlide = container.clientWidth - 64;
  //   this.currentTranslateX = this.maxSlide;
  //   this.cdr.detectChanges();

  //   const payload = {
  //     rangerId: +rangerId,
  //     photos: this.capturedPhotos, 
  //     responsePriority: this.incidentData.priority,
  //     incidentCriteria: this.incidentData.criteria,
  //     rootCause: this.incidentData.cause,
  //     latitude: parseFloat(this.lat),
  //   longitude: parseFloat(this.lng),
  //     fieldObservation: this.incidentData.observation
  //   };

  //   this.http.post(this.apiUrl, payload).subscribe({
  //     next: async () => {
  //       const successMsg = await this.translate.get('REPORT.SUCCESS_MSG').toPromise();
  //       this.presentToast(successMsg, 'success');
  //       setTimeout(() => {
  //         this.isSubmitting = false;
  //         this.navCtrl.back();
  //       }, 1500);
  //     },
  //     error: async () => {
  //       this.isSubmitting = false;
  //       this.resetSlider();
  //       const errMsg = await this.translate.get('REPORT.ERROR_MSG').toPromise();
  //       this.presentToast(errMsg, 'danger');
  //     }
  //   });
  // }


//  async submitReport() {
//   if (this.isSubmitting) return;

//   const rawRangerId = localStorage.getItem('ranger_id');
  
//   if (!rawRangerId) {
//     this.presentToast('Error: Ranger ID not found.', 'danger');
//     this.resetSlider();
//     return;
//   }

//   // Double-check these variables are numbers
//   if (this.lat === 'Detecting...' || this.lat === 'Location Error') {
//     this.presentToast('Waiting for GPS...', 'warning');
//     this.resetSlider();
//     return;
//   }

//   this.isSubmitting = true;

//   const finalPhotos = this.capturedPhotos.map(p => p.split(',')[1]);

//   const payload = {
//     company_id: Number(localStorage.getItem('company_id')),
//     rangerId: +rawRangerId, 
//     photos: this.capturedPhotos,
//     responsePriority: this.incidentData.priority,
//     incidentCriteria: this.incidentData.criteria,
//     rootCause: this.incidentData.cause,
//     fieldObservation: this.incidentData.observation,
//     // THE CRITICAL LINES:
//  latitude: Number(this.lat), 
//   longitude: Number(this.lng)
//   };

//   console.log('SENDING PAYLOAD:', payload); // Look for this in your browser console!

//   this.http.post(this.apiUrl, payload).subscribe({
//     next: async (response) => {
//       // 1. Show success message
//       const successMsg = await this.translate.get('REPORT.SUCCESS_MSG').toPromise();
//       this.presentToast(successMsg || 'Incident reported successfully!', 'success');
      
//       // 2. Clear state and go back to home
//       setTimeout(() => {
//         this.isSubmitting = false;
//         this.navCtrl.back();
//       }, 1500);
//     },
//     error: (err) => {
//       console.error('SERVER ERROR:', err); // Check this in F12 console
//       this.isSubmitting = false;
//       this.resetSlider();
//       this.presentToast('Failed to submit. Check server limits.', 'danger');
//     }
//   });
// }

async submitReport() {
  if (this.isSubmitting) return;

  const rawRangerId = localStorage.getItem('ranger_id');
  const rawCompanyId = localStorage.getItem('company_id'); // <--- 1. Company ID uthayi
  
  // Guard: Agar Company ID nahi hai toh data mix hone se bachao
  if (!rawCompanyId || rawCompanyId === '0' || rawCompanyId === 'undefined') {
    this.presentToast('Error: Company session missing. Please re-login.', 'danger');
    this.resetSlider();
    return;
  }

  if (!rawRangerId) {
    this.presentToast('Error: Ranger ID not found.', 'danger');
    this.resetSlider();
    return;
  }

  this.isSubmitting = true;

  // 2. Photos se 'data:image/jpeg;base64,' wala part hatao (Backend requirement)
  const finalPhotos = this.capturedPhotos.map(p => p.split(',')[1]);

  const payload = {
    company_id: Number(rawCompanyId), // <--- Ab ye usi company ki ID jayegi jo logged in hai
    rangerId: +rawRangerId, 
    photos: finalPhotos, // <--- Safed Base64 string
    responsePriority: this.incidentData.priority,
    incidentCriteria: this.incidentData.criteria,
    rootCause: this.incidentData.cause,
    fieldObservation: this.incidentData.observation,
    latitude: Number(this.lat), 
    longitude: Number(this.lng)
  };

  console.log('FINAL PAYLOAD:', payload);

  this.http.post(this.apiUrl, payload).subscribe({
    next: async (response) => {
      const successMsg = 'Incident reported successfully!';
      this.presentToast(successMsg, 'success');
      setTimeout(() => {
        this.isSubmitting = false;
        this.navCtrl.back();
      }, 1500);
    },
    error: (err) => {
      console.error('SERVER ERROR:', err);
      this.isSubmitting = false;
      this.resetSlider();
      this.presentToast('Failed to submit. Check server limits.', 'danger');
    }
  });
}

  private resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  adjustHeight(event: any) {
    const textArea = event.target;
    textArea.style.height = 'auto'; 
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 3000, color, position: 'bottom', mode: 'ios'
    });
    toast.present();
  }

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 64;
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    let moveX = event.touches[0].clientX - this.startX;
    if (moveX < 0) moveX = 0;
    if (moveX > this.maxSlide) moveX = this.maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / this.maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    if (this.currentTranslateX >= this.maxSlide * 0.85) {
      this.submitReport();
    } else {
      this.resetSlider();
    }
  }

  ngOnDestroy() {
  if (this.map) {
    this.map.remove();
  }
}
}