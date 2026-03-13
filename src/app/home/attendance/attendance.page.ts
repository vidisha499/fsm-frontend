import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { TranslateService } from '@ngx-translate/core'; // 👈 Import TranslateService

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit, OnDestroy {
  // Leaflet variables
  map!: L.Map;
  marker!: L.Marker;
  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0;
  
  public isSubmitting: boolean = false;
  public isEntry: boolean = true;
  public attendance: any = null;
  public currentTime: Date = new Date(); 
  public capturedPhoto: string = ''; 
  public rangerName: string = '';
  public rangerRegion: string = '';
  public currentAddress: string = ''; // Will show translated placeholder in HTML

  public currentLat: number = 20.1013; 
  public currentLng: number = 77.1337;
  private gpsWatchId: any = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private platform: Platform,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService // 👈 Inject TranslateService
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    this.attendance = { created_at: new Date() };

    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  async ionViewDidEnter() {
    await this.initLeafletMap();
  }

//   async initLeafletMap() {
//     try {
//       if (this.map) { this.map.remove(); }

//       const iconRetinaUrl = 'assets/marker-icon-2x.png';
//     const iconUrl = 'assets/marker-icon.png';
//     const shadowUrl = 'assets/marker-shadow.png';
//     const iconDefault = L.icon({
//       iconRetinaUrl,
//       iconUrl,
//       shadowUrl,
//       iconSize: [25, 41],
//       iconAnchor: [12, 41],
//       popupAnchor: [1, -34],
//       tooltipAnchor: [16, -28],
//       shadowSize: [41, 41]
//     });
//     L.Marker.prototype.options.icon = iconDefault;

//     // initLeafletMap() ke shuruat mein ye dalo
// delete (L.Icon.Default.prototype as any)._getIconUrl;

// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });
      
//       this.map = L.map('attendanceMap', { 
//         center: [this.currentLat, this.currentLng], 
//         zoom: 16, 
//         zoomControl: false 
//       });

//       L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
//         subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
//       }).addTo(this.map);

//       this.marker = L.marker([this.currentLat, this.currentLng], { icon: this.locationIcon }).addTo(this.map);

//       const pos = await Geolocation.getCurrentPosition({ 
//         enableHighAccuracy: false, 
//         timeout: 15000, 
//         maximumAge: 60000 
//       });
      
//       this.currentLat = pos.coords.latitude;
//       this.currentLng = pos.coords.longitude;

//       const newPoint = L.latLng(this.currentLat, this.currentLng);
//       this.marker.setLatLng(newPoint);
//       this.map.setView(newPoint, 18);
      
//       this.updateAddress(this.currentLat, this.currentLng);
//       this.startLiveTracking();

//     } catch (e) {
//       console.error("GPS Timeout", e);
//       const msg = await this.translate.get('ATTENDANCE.GPS_SEARCH').toPromise(); // 👈 Translated
//       this.presentToast(msg, 'warning');
//       this.startLiveTracking(); 
//     }
//   }

async initLeafletMap() {
  try {
    if (this.map) { 
      this.map.remove(); 
    }

    // 1. Pehle purana default icon handler delete karein
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    // 2. Ab CDN se icons set karein (Isse 404 hamesha ke liye band ho jayega)
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // 3. Map initialize karein
    this.map = L.map('attendanceMap', { 
      center: [this.currentLat, this.currentLng], 
      zoom: 16, 
      zoomControl: false 
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    // 4. Marker create karein (Custom blue dot icon ke saath)
    this.marker = L.marker([this.currentLat, this.currentLng], { 
      icon: this.locationIcon 
    }).addTo(this.map);

    // 5. GPS Location update karein
    const pos = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: false, 
      timeout: 15000, 
      maximumAge: 60000 
    });
    
    this.currentLat = pos.coords.latitude;
    this.currentLng = pos.coords.longitude;

    const newPoint = L.latLng(this.currentLat, this.currentLng);
    this.marker.setLatLng(newPoint);
    this.map.setView(newPoint, 18);
    
    this.updateAddress(this.currentLat, this.currentLng);
    this.startLiveTracking();

  } catch (e) {
    console.error("GPS Timeout", e);
    const msg = await this.translate.get('ATTENDANCE.GPS_SEARCH').toPromise();
    this.presentToast(msg, 'warning');
    this.startLiveTracking(); 
  }
}

  async startLiveTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: true, 
      maximumAge: 0 
    }, (position) => {
      if (position && this.map) {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        
        if (position.coords.accuracy < 50) { 
          const newPoint = L.latLng(newLat, newLng);
          this.marker.setLatLng(newPoint);
          this.map.panTo(newPoint);
          
          if (L.latLng(this.currentLat, this.currentLng).distanceTo(newPoint) > 5) {
            this.currentLat = newLat;
            this.currentLng = newLng;
            this.updateAddress(newLat, newLng);
          }
        }
      }
    });
  }

  recenterMap() {
    if (this.map) {
      this.map.setView([this.currentLat, this.currentLng], 16);
    }
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.status === 'OK' && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      } else {
        this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (err) {
      this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    this.cdr.detectChanges();
  }

  async submitAttendance() {
    if (this.isSubmitting) return; 
    if (!this.capturedPhoto) {
      const msg = await this.translate.get('ATTENDANCE.PHOTO_REQUIRED').toPromise(); // 👈 Translated
      this.presentToast(msg, 'warning');
      this.resetSlider();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges(); 
    const companyId = localStorage.getItem('company_id');

    const payload = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      company_id: companyId ? Number(companyId) : null,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      photo: this.capturedPhoto,
      latitude: this.currentLat,
      longitude: this.currentLng,
      geofence: this.currentAddress,
      rangerName: this.rangerName, 
    region: this.rangerRegion 
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: async () => {
        const msg = await this.translate.get('ATTENDANCE.SUCCESS').toPromise(); // 👈 Translated
        this.presentToast(msg, 'success');
        setTimeout(() => {
          this.isSubmitting = false;
          this.goBack();
        }, 1500);
      },
      error: async () => {
        this.isSubmitting = false;
        this.resetSlider();
        const msg = await this.translate.get('ATTENDANCE.SYNC_ERROR').toPromise(); // 👈 Translated
        this.presentToast(msg, 'danger');
      }
    });
  }



  async presentImageSourceOptions() {
    const header = await this.translate.get('ATTENDANCE.SELECT_SOURCE').toPromise();
    const cam = await this.translate.get('ATTENDANCE.CAMERA').toPromise();
    const gal = await this.translate.get('ATTENDANCE.GALLERY').toPromise();
    const cancel = await this.translate.get('ATTENDANCE.CANCEL').toPromise();

    const actionSheet = await this.actionSheetCtrl.create({
      header: header,
      mode: 'md',
      buttons: [
        { text: cam, icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: gal, icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: cancel, role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  // Rest of slider logic stays same...
  resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  async captureImage(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({ 
        quality: 50, 
        source: source, 
        resultType: CameraResultType.Base64 ,
        width: 800,
      });
      if (photo.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
      }
    } catch (e) { console.log('Camera cancelled'); }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/attendance-list'); }

  ngOnDestroy() { 
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); 
    if (this.map) this.map.remove();
  }

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 60; 
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting) return;
    let moveX = event.touches[0].clientX - this.startX;
    if (moveX < 0) moveX = 0;
    if (moveX > this.maxSlide) moveX = this.maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / this.maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting) return;
    if (this.currentTranslateX >= this.maxSlide * 0.85) {
      this.currentTranslateX = this.maxSlide;
      this.submitAttendance();
    } else {
      this.resetSlider();
    }
  }
}