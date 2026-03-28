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
  // Inside NewIncidentPage class
private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
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
  public currentAddress: string = '';
  
public incidentData = {
  priority: 'High Priority',
  criteria: 'Criminal Activity',
  subCategory: 'illegal felling', // New field
  species: 'sagvan',     // New field
  cause: 'human error',
  reason: 'Trade',
  observation: '',
  vehicleType: 'truck', // New
  route: 'village route',
  storageArea: 'godown',
  range: '',
  fireStage: '',
  assetInventory: '',
  vehicleInfo: '',
  checkpost: '',
  rangerName: '', // Will be auto-filled
  geofence: '',
  
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
  this.loadDefaultData();
  setTimeout(() => {
    this.initIncidentMap();
  }, 600);
}

async loadDefaultData() {
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  this.incidentData.rangerName = userData.name || 'Unknown Ranger';

  // FIX: Pehle check karo ki lat/lng numbers hain ya nahi
  if (typeof this.lat === 'number' && typeof this.lng === 'number') {
    this.incidentData.geofence = `Lat: ${this.lat.toFixed(4)}, Lng: ${this.lng.toFixed(4)}`;
  } else {
    // Agar abhi tak detect nahi hua toh wait karein
    this.incidentData.geofence = "Detecting location...";
  }
}

async initIncidentMap() {
  try {
    const coordinates = await Geolocation.getCurrentPosition();
    // Inhe numbers ki tarah save karo, string ki tarah nahi
    this.lat = coordinates.coords.latitude;
    this.lng = coordinates.coords.longitude;

    // Address update karo
    this.updateAddress(this.lat, this.lng);

    // Map initialize
    this.map = L.map('incidentMap', {
      zoomControl: false,
      attributionControl: false
    }).setView([this.lat, this.lng], 15);

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    L.marker([this.lat, this.lng], { 
      icon: L.divIcon({ className: 'incident-pin', html: `📍`, iconSize: [30, 30] }) 
    }).addTo(this.map);

  } catch (error) {
    console.error('Location error:', error);
    this.incidentData.geofence = 'Location Error';
  }
}

async updateAddress(lat: number, lng: number) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
  try {
    const data: any = await this.http.get(url).toPromise(); // Use toPromise or firstValueFrom
    if (data.status === 'OK' && data.results.length > 0) {
      // This sets the Green Geofence field to the actual address name
      this.incidentData.geofence = data.results[0].formatted_address;
    } else {
      this.incidentData.geofence = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch (err) {
    console.error("Geocoding error", err);
    this.incidentData.geofence = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  this.cdr.detectChanges(); // Refresh UI
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
  const finalPhotos = this.capturedPhotos.map(p => p.includes(',') ? p.split(',')[1] : p);
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

const payload = {
  userId: userData.id,     // Ye hai teri main ID link karne ke liye
  company_id: Number(rawCompanyId),
  rangerId: Number(rawRangerId), 
  photos: finalPhotos,
  responsePriority: this.incidentData.priority,
  incidentCriteria: this.incidentData.criteria,
  
  // Ensure these match your Entity @Column names exactly

  subCategory: this.incidentData.subCategory,
  rootCause: this.incidentData.cause,
  fieldObservation: this.incidentData.observation,
  incidentReason: this.incidentData.reason, 
  species: this.incidentData.species,
  vehicleType: this.incidentData.vehicleType,
  transportRoute: this.incidentData.route,
  storageArea: this.incidentData.storageArea,
  fireStage: this.incidentData.fireStage,
  assetInventory: this.incidentData.assetInventory, 
  vehicleInfo: this.incidentData.vehicleInfo,    
  checkpost: this.incidentData.checkpost,
  rangerName: this.incidentData.rangerName,
  geofence: this.incidentData.geofence, // This is the address string

  // GPS Coordinates
  latitude: Number(this.lat), 
  longitude: Number(this.lng),
  status: 'Pending'
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

resetSubFields() {
  // 1. DO NOT reset this.incidentData.subCategory here! 
  // If you reset it, the UI won't know what to show.

  // 2. Clear ONLY the detail fields
  this.incidentData.species = '';
  this.incidentData.vehicleType = '';
  this.incidentData.route = '';
  this.incidentData.storageArea = '';
  this.incidentData.reason = '';
  this.incidentData.range = ''; 
  this.incidentData.fireStage = '';
  this.incidentData.assetInventory = '';
  this.incidentData.vehicleInfo = '';
  this.incidentData.checkpost = '';

  // 3. Set specific defaults based on the subCategory
  if (this.incidentData.subCategory === 'Poaching') {
    this.incidentData.cause = 'Natural';
  } else if (this.incidentData.subCategory === 'illegal felling') {
    this.incidentData.reason = 'Trade';
    this.incidentData.cause = 'Human Error';
  } else {
    this.incidentData.cause = 'Human Error';
  }
}

}