import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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

  public isEntry: boolean = true;
  public capturedPhoto: string = ''; 
  public rangerName: string = '';
  public rangerRegion: string = '';
  public currentAddress: string = 'Detecting location...';

  public currentLat: number = 0;
  public currentLng: number = 0;
  private watchId: any = null;
  private markerId: string | null = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

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
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
  }

  async ionViewDidEnter() {
    await this.platform.ready();
    await this.initMapAndTracking();
  }

  async initMapAndTracking() {
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
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
      this.updateAddress(this.currentLat, this.currentLng);
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

  setMode(val: boolean) { this.isEntry = val; }

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
        this.navCtrl.navigateRoot('/home');
      },
      error: (err) => {
        loader.dismiss();
        this.presentToast('Sync Failed. Check Internet.', 'danger');
      }
    });
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Capture Photo',
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
      const photo = await Camera.getPhoto({ quality: 40, source, resultType: CameraResultType.Base64 });
      if (photo.base64String) this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
    } catch (e) { console.log('Camera cancelled'); }
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