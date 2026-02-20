import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  // Leaflet variables
  map!: L.Map;
  marker!: L.Marker;
  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  private maxSlide: number = 0;
  private startX: number = 0;
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;

  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Loading...';
  public currentAddress: string = 'Detecting location...';
  public currentLat: number = 20.1013;
  public currentLng: number = 77.1337;
  
  public isSubmitting: boolean = false;
  public mapLoaded: boolean = false;
  private gpsWatchId: any = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/onsite-attendance`;

  public currentDateTime: string = '';
  private timer: any;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private platform: Platform,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 60000);
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  }

  async ionViewDidEnter() {
    await this.initLeafletMap();
  }

  // --- Map & High Accuracy Location Logic ---
  async initLeafletMap() {
    try {
      // Force high accuracy & clear cache
      const pos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 
      });

      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      if (this.map) { this.map.remove(); }

      this.map = L.map('onsiteMap', { 
        center: [this.currentLat, this.currentLng], 
        zoom: 17, 
        zoomControl: false 
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(this.map);

      this.marker = L.marker([this.currentLat, this.currentLng], { icon: this.locationIcon }).addTo(this.map);
      
      this.mapLoaded = true;
      this.updateAddress(this.currentLat, this.currentLng);
      this.startLiveTracking();

    } catch (e) {
      this.presentToast('Searching for GPS signal...', 'warning');
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
        const newPoint = L.latLng(newLat, newLng);
        
        this.marker.setLatLng(newPoint);
        this.map.panTo(newPoint);

        // Update address only if moved more than 10 meters
        const distance = L.latLng(this.currentLat, this.currentLng).distanceTo(newPoint);
        if (distance > 10 || this.currentAddress === 'Detecting location...') {
          this.currentLat = newLat;
          this.currentLng = newLng;
          this.updateAddress(newLat, newLng);
        }
        this.cdr.detectChanges();
      }
    });
  }

  recenterMap() {
    if (this.map) {
      this.map.setView([this.currentLat, this.currentLng], 17);
    }
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.status === 'OK' && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      }
    } catch (err) {
      this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    this.cdr.detectChanges();
  }

  // --- Photo Logic ---
  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({ 
        quality: 50, 
        resultType: CameraResultType.Base64, 
        source 
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) { console.log('User cancelled'); }
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

  // --- Submission Logic ---
  async submit() {
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo first.', 'warning');
      this.resetSlider();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges(); 

    const onsiteData = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      ranger: this.rangerName,
      geofence: this.currentAddress, 
      attendance_type: 'ON-SITE',
      photo: this.capturedPhoto,
      latitude: this.currentLat,
      longitude: this.currentLng,
      created_at: new Date().toISOString() 
    };

    this.http.post(this.apiUrl, onsiteData).subscribe({
      next: () => {
        this.presentToast('ATTENDANCE MARKED & SYNCED', 'success');
        setTimeout(() => {
          this.isSubmitting = false;
          this.navCtrl.navigateRoot('/home');
        }, 1500);
      },
      error: () => {
        this.isSubmitting = false;
        this.resetSlider();
        this.presentToast('Submission Failed.', 'danger');
      }
    });
  }

  resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  // --- slider helpers ---
  onDragStart(event: TouchEvent) {
    if (this.isSubmitting) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting) return;
    let moveX = event.touches[0].clientX - this.startX;
    const maxSlide = window.innerWidth - 115; 
    if (moveX < 0) moveX = 0;
    if (moveX > maxSlide) moveX = maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting) return;
    const maxSlide = window.innerWidth - 115;
    if (this.currentTranslateX > maxSlide * 0.8) {
      this.currentTranslateX = maxSlide;
      this.submit(); 
    } else {
      this.resetSlider();
    }
  }

  updateClock() {
    const now = new Date();
    this.currentDateTime = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(now).replace(',', ' •');
  }

  async ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    if (this.map) this.map.remove();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.back(); }
}