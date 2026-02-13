// import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
// import { NavController, ToastController, ActionSheetController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// import { Geolocation } from '@capacitor/geolocation';
// import { GoogleMap } from '@capacitor/google-maps';
// import { firstValueFrom } from 'rxjs';
// import { TranslateService } from '@ngx-translate/core';

// @Component({
//   selector: 'app-attendance',
//   templateUrl: './attendance.page.html',
//   styleUrls: ['./attendance.page.scss'],
//   standalone: false
// })
// export class AttendancePage implements OnInit, OnDestroy {
//   @ViewChild('map') mapRef!: ElementRef;
//   newMap!: GoogleMap;

//   public isEntry: boolean = true;
//   public capturedPhoto: string = ''; 
//   public rangerName: string = 'vidisha';
//   public rangerRegion: string = 'Washim';
//   public currentAddress: string = 'Detecting location...';

//   public currentLat: number = 0;
//   public currentLng: number = 0;
//   private watchId: string | null = null;
//   private markerId: string | null = null;

//   private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
//   private apiUrl: string = 'http://10.160.145.89:3000/api/attendance/beat-attendance';

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private actionSheetCtrl: ActionSheetController,
//     private http: HttpClient,
//     private translate: TranslateService 
//   ) {}

//   ngOnInit() {
//     this.rangerName = localStorage.getItem('ranger_username') || 'vidisha';
//     this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
//     this.initMapAndTracking();
//   }

//   async initMapAndTracking() {
//     try {
//       const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
//       this.currentLat = coordinates.coords.latitude;
//       this.currentLng = coordinates.coords.longitude;
//       await this.createMap();
//       this.startLocationWatch();
//     } catch (e) {
//       console.error('GPS Error', e);
//     }
//   }

//   async createMap() {
//     const mapElement = document.getElementById('map');
//     if (!mapElement) return;
//     this.newMap = await GoogleMap.create({
//       id: 'attendance-map',
//       element: mapElement,
//       apiKey: this.googleApiKey,
//       config: { center: { lat: this.currentLat, lng: this.currentLng }, zoom: 17 },
//     });
//     this.updateMarker();
//   }

//   async startLocationWatch() {
//     this.watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
//       if (position) {
//         this.currentLat = position.coords.latitude;
//         this.currentLng = position.coords.longitude;
//         this.updateAddress(this.currentLat, this.currentLng);
//         this.updateMarker();
//       }
//     });
//   }

//   async updateMarker() {
//     if (!this.newMap) return;
//     if (this.markerId) await this.newMap.removeMarkers([this.markerId]);
//     this.markerId = await this.newMap.addMarker({ coordinate: { lat: this.currentLat, lng: this.currentLng } });
//   }

//   async updateAddress(lat: number, lng: number) {
//     const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
//     try {
//       const data: any = await firstValueFrom(this.http.get(url));
//       this.currentAddress = data.results[0]?.formatted_address || 'Unknown Location';
//     } catch (err) { this.currentAddress = 'Location detected'; }
//   }

//   async presentImageSourceOptions() {
//     const actionSheet = await this.actionSheetCtrl.create({
//       header: 'Capture ID',
//       buttons: [
//         { text: 'Take Photo', icon: 'camera', handler: () => this.captureImage(CameraSource.Camera) },
//         { text: 'Gallery', icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
//         { text: 'Cancel', role: 'cancel' }
//       ]
//     });
//     await actionSheet.present();
//   }

//   async captureImage(source: CameraSource) {
//     try {
//       const photo = await Camera.getPhoto({
//         quality: 40, // Lower quality to avoid large payload errors
//         source: source,
//         resultType: CameraResultType.Base64,
//       });
//       if (photo.base64String) {
//         this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
//       }
//     } catch (error) { console.error('Camera cancelled'); }
//   }

//   goBack() { this.navCtrl.back(); }
//   setMode(entry: boolean) { this.isEntry = entry; }

//   async submitAttendance() {
//     console.log('--- Attendance Submission Started ---');
    
//     // Check for ID and Photo
//     const storedId = localStorage.getItem('ranger_id');
//     const rangerId = storedId ? Number(storedId) : 1; // Default to 1 if null
    
//     if (!this.capturedPhoto) {
//       this.presentToast('Please capture a photo first', 'warning');
//       return;
//     }

//     const attendanceData = {
//       ranger_id: rangerId,
//       ranger_name: this.rangerName,
//       photo: this.capturedPhoto,
//       type: this.isEntry ? 'ENTRY' : 'EXIT',
//       latitude: this.currentLat,
//       longitude: this.currentLng,
//       site_name: this.currentAddress,
//       timestamp: new Date().toISOString()
//     };

//     console.log('Data to send:', attendanceData);

//     this.http.post(this.apiUrl, attendanceData).subscribe({
//       next: (res) => {
//         console.log('Server Response:', res);
//         this.presentToast('Attendance Marked!', 'success');
//         this.navCtrl.back();
//       },
//       error: (err) => {
//         console.error('HTTP Error Details:', err);
//         this.presentToast('Sync Failed. Check Server Connection.', 'danger');
//       }
//     });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message, duration: 2500, color, mode: 'ios', position: 'bottom'
//     });
//     toast.present();
//   }

//   ngOnDestroy() { if (this.watchId) Geolocation.clearWatch({ id: this.watchId }); }
// }

import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  newMap!: GoogleMap;

  public isEntry: boolean = true;
  public capturedPhoto: string = ''; 
  public rangerName: string = 'vidisha';
  public rangerRegion: string = 'Washim';
  public currentAddress: string = 'Detecting location...';

  public currentLat: number = 0;
  public currentLng: number = 0;
  private watchId: any = null;
  private markerId: string | null = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = 'http://localhost:3000/api/attendance/beat-attendance';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController, // Injected LoadingController
    private http: HttpClient,
    private translate: TranslateService,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'vidisha';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    
    // Auto-detect URL based on environment
    this.apiUrl = this.platform.is('hybrid') 
      ? 'http://10.60.250.89:3000/api/attendance/beat-attendance' 
      : 'http://localhost:3000/api/attendance/beat-attendance';

    this.initMapAndTracking();
  }

  async initMapAndTracking() {
    try {
      if (this.platform.is('hybrid')) {
        await Geolocation.requestPermissions();
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      await this.createMap();
      this.startLocationWatch();
    } catch (e) {
      this.presentToast('Check browser location permissions', 'warning');
    }
  }

  async createMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    this.newMap = await GoogleMap.create({
      id: 'attendance-map',
      element: mapElement,
      apiKey: this.googleApiKey,
      config: {
        center: { lat: this.currentLat, lng: this.currentLng },
        zoom: 17,
      },
    });
    this.updateMarker();
  }

  async startLocationWatch() {
    this.watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
      if (pos) {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;
        this.updateMarker();
        this.updateAddress(this.currentLat, this.currentLng);
        if (this.newMap) {
          this.newMap.setCamera({ coordinate: { lat: this.currentLat, lng: this.currentLng }, animate: true });
        }
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
      this.currentAddress = data.results[0]?.formatted_address || 'Location detected';
    } catch (err) { this.currentAddress = 'Location detected'; }
  }

  async submitAttendance() {
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo', 'warning');
      return;
    }

    // --- Start Loader ---
    const loader = await this.loadingCtrl.create({
      message: 'Syncing Attendance...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

    const payload = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      ranger_name: this.rangerName,
      photo: this.capturedPhoto,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      latitude: this.currentLat,
      longitude: this.currentLng,
      site_name: this.currentAddress,
      timestamp: new Date().toISOString()
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: () => {
        loader.dismiss(); // Stop Loader
        this.presentToast('Attendance Success!', 'success');
        this.navCtrl.back();
      },
      error: (err) => {
        loader.dismiss(); // Stop Loader
        console.error('Submit Error:', err);
        this.presentToast('Sync Failed. Check Server Connection.', 'danger');
      }
    });
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Capture ID',
      buttons: [
        { text: 'Camera', icon: 'camera', handler: () => this.captureImage(CameraSource.Camera) },
        { text: 'Gallery', icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({ quality: 50, source, resultType: CameraResultType.Base64 });
      if (photo.base64String) this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
    } catch (e) { console.log('Camera cancelled'); }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.back(); }
  setMode(e: boolean) { this.isEntry = e; }
  ngOnDestroy() { if (this.watchId) Geolocation.clearWatch({ id: this.watchId }); }
}