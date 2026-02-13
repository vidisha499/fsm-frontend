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
  private apiUrl: string = '';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private translate: TranslateService,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'vidisha';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    
    // API URL detection
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
      const pos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true,
        timeout: 10000 
      });
      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      await this.createMap();
      this.startLocationWatch();
    } catch (e) {
      this.presentToast('Please enable GPS permissions', 'warning');
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
    this.watchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: true,
      timeout: 10000 
    }, (pos) => {
      if (pos) {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;
        this.updateMarker();
        this.updateAddress(this.currentLat, this.currentLng);
      }
    });
  }

  async updateMarker() {
    if (!this.newMap) return;
    if (this.markerId) await this.newMap.removeMarkers([this.markerId]);
    this.markerId = await this.newMap.addMarker({ 
      coordinate: { lat: this.currentLat, lng: this.currentLng } 
    });
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      this.currentAddress = data.results[0]?.formatted_address || 'Location detected';
    } catch (err) { this.currentAddress = 'Location detected'; }
  }

  // --- MISSING METHODS RE-ADDED BELOW ---

  goBack() {
    this.navCtrl.back();
  }

  setMode(val: boolean) {
    this.isEntry = val;
  }

  // --------------------------------------

  async submitAttendance() {
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Syncing Attendance...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

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
      next: () => {
        loader.dismiss();
        this.presentToast('Attendance Success!', 'success');
        this.navCtrl.back();
      },
      error: (err) => {
        loader.dismiss();
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

  ngOnDestroy() { 
    if (this.watchId) Geolocation.clearWatch({ id: this.watchId }); 
  }
}