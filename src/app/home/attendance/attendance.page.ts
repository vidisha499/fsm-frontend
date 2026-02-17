import { Component, OnInit, ViewChild, ElementRef, OnDestroy , ChangeDetectorRef} from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  newMap!: GoogleMap;
  
  public isSubmitting: boolean = false;
  public isEntry: boolean = true;
  
  public attendance: any = null;
  public currentTime: Date = new Date(); 

  public capturedPhoto: string = ''; 
  public rangerName: string = '';
  public rangerRegion: string = '';
  public currentAddress: string = 'Detecting location...';

  public currentLat: number = 0;
  public currentLng: number = 0;
  private watchId: any = null;
  private markerId: string | null = null;

  // Google API Key fix: Make sure this key has "Geocoding API" enabled
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private translate: TranslateService,
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
    await this.platform.ready();
    await this.initMapAndTracking();
  }

  async initMapAndTracking() {
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') await Geolocation.requestPermissions();

      const pos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true,
        timeout: 15000 
      });
      
      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      await this.createMap();
      this.startLocationWatch();
      // Wait a bit to ensure GPS is stable before geocoding
      setTimeout(() => this.updateAddress(this.currentLat, this.currentLng), 1000);
    } catch (e) {
      this.presentToast('Please enable GPS and permissions', 'warning');
    }
  }

  async createMap() {
    if (!this.mapRef) return;
    this.newMap = await GoogleMap.create({
      id: 'attendance-map-unique',
      element: this.mapRef.nativeElement,
      apiKey: this.googleApiKey,
      config: { center: { lat: this.currentLat, lng: this.currentLng }, zoom: 17 },
    });
    this.updateMarker();
  }

  async startLocationWatch() {
    this.watchId = await Geolocation.watchPosition({ 
        enableHighAccuracy: true, 
        timeout: 10000 
    }, (pos) => {
      if (pos) {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;
        this.updateMarker();
      }
    });
  }

  async updateMarker() {
    if (!this.newMap) return;
    if (this.markerId) await this.newMap.removeMarkers([this.markerId]);
    this.markerId = await this.newMap.addMarker({ coordinate: { lat: this.currentLat, lng: this.currentLng } });
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.status === 'OK' && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      } else {
        this.currentAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      }
    } catch (err) { 
      this.currentAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`; 
    }
  }


  async submitAttendance() {
  if (this.isSubmitting) return; 
  
  if (!this.capturedPhoto) {
    this.presentToast('Please capture a photo', 'warning');
    return;
  }

  // 1. Start the sliding animation immediately
  this.isSubmitting = true;
  this.cdr.detectChanges(); // Ensures the UI sees the 'active' class

  const payload = {
    ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
    rangerName: this.rangerName,
    region: this.rangerRegion,
    type: this.isEntry ? 'ENTRY' : 'EXIT',
    photo: this.capturedPhoto,
    latitude: this.currentLat,
    longitude: this.currentLng,
    geofence: this.currentAddress
  };

  this.http.post(this.apiUrl, payload).subscribe({
    next: (res: any) => {
      // 2. Success: Wait for the slide to complete (0.6s) + show the tick
      setTimeout(() => {
        this.presentToast('Attendance Success!', 'success');
        this.attendance = res;
        
        // Reset the form after the user sees the success state
        this.isSubmitting = false;
        this.capturedPhoto = ''; 
        this.attendance = null; 
        this.initMapAndTracking(); 
        this.cdr.detectChanges();
      }, 1500); // 1.5s total delay for the premium feel
    },
    error: () => {
      // 3. Reset the button immediately on error so they can try again
      this.isSubmitting = false;
      this.presentToast('Failed to sync', 'danger');
      this.cdr.detectChanges();
    }
  });
}

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Photo Source',
      mode: 'md',
      cssClass: 'small-action-sheet',
      buttons: [
        { 
          text: 'Camera', 
          icon: 'camera-outline', 
          handler: () => this.captureImage(CameraSource.Camera) 
        },
        { 
          text: 'Gallery', 
          icon: 'image-outline', 
          handler: () => this.captureImage(CameraSource.Photos) 
        },
        { 
          text: 'Cancel', 
          role: 'cancel',
          icon: 'close'
        }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      // ResultType.Base64 is required for your payload structure
      const photo = await Camera.getPhoto({ 
        quality: 50, 
        source: source, 
        resultType: CameraResultType.Base64,
        saveToGallery: false 
      });
      if (photo.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
      }
    } catch (e) { 
        console.log('User cancelled or camera error:', e); 
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }

  async ngOnDestroy() { 
    if (this.watchId) await Geolocation.clearWatch({ id: this.watchId }); 
    if (this.newMap) await this.newMap.destroy();
  }
}