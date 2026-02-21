import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';

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
  public currentAddress: string = 'Detecting location...';

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

  async initLeafletMap() {
  try {
    // Force high accuracy and disable cache
    const pos = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 0 // <--- CRITICAL: Prevents using old/cached location
    });
    
    this.currentLat = pos.coords.latitude;
    this.currentLng = pos.coords.longitude;

    if (this.map) { this.map.remove(); }

    this.map = L.map('attendanceMap', { 
      center: [this.currentLat, this.currentLng], 
      zoom: 18, // Zoomed in closer for better accuracy check
      zoomControl: false 
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    this.marker = L.marker([this.currentLat, this.currentLng], { icon: this.locationIcon }).addTo(this.map);
    
    this.updateAddress(this.currentLat, this.currentLng);
    this.startLiveTracking();

  } catch (e) {
    console.error("Leaflet init failed", e);
    // If it fails, try one more time with lower accuracy as fallback
    this.presentToast('Searching for GPS signal...', 'warning');
  }
}
async startLiveTracking() {
  this.gpsWatchId = await Geolocation.watchPosition({ 
    enableHighAccuracy: true, 
    maximumAge: 0 // Forces a fresh read every time
  }, (position) => {
    if (position && this.map) {
      const newLat = position.coords.latitude;
      const newLng = position.coords.longitude;
      
      // Accuracy check: only update if the signal is decent (less than 50 meters error)
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
        // This is the variable bound to your HTML "Detected Geofence" field
        this.currentAddress = data.results[0].formatted_address;
      } else {
        this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (err) {
      this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    this.cdr.detectChanges(); // Force UI update
  }

  async submitAttendance() {
    if (this.isSubmitting) return; 
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo', 'warning');
      this.resetSlider();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges(); 

    const payload = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      photo: this.capturedPhoto,
      latitude: this.currentLat,
      longitude: this.currentLng,
      geofence: this.currentAddress
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: () => {
        this.presentToast('Attendance Marked!', 'success');
        setTimeout(() => {
          this.isSubmitting = false;
          this.goBack();
        }, 1500);
      },
      error: () => {
        this.isSubmitting = false;
        this.resetSlider();
        this.presentToast('Failed to sync. Check internet.', 'danger');
      }
    });
  }

  resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Photo Source',
      mode: 'md',
      buttons: [
        { text: 'Camera', icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: 'Gallery', icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({ 
        quality: 50, 
        source: source, 
        resultType: CameraResultType.Base64 
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

  goBack() { this.navCtrl.navigateRoot('/home'); }

  ngOnDestroy() { 
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); 
    if (this.map) this.map.remove();
  }

  // --- Slider Gestures ---
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