
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController, ToastController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';
// 1. Import TranslateService
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
  public capturedPhoto: string = ''; // This will hold the Base64 string for the backend
  public previewImage: string = '';  // This will hold the UI preview
  public rangerName: string = 'Loading...';
  public rangerRegion: string = 'Washim';
  public currentAddress: string = 'Detecting location...';

  public currentLat: number = 0;
  public currentLng: number = 0;
  private watchId: string | null = null;
  private markerId: string | null = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';

  // ✅ Ensure this IP is your computer's actual IPv4 address
  private apiUrl: string = 'http://10.160.145.89:3000/api/attendance/beat-attendance';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    // 2. Inject TranslateService
    private translate: TranslateService 
  ) {}

  // ngOnInit() {
  //   this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  //   this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
  //   this.initMapAndTracking();
  // }

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'vidisha';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    this.initMapAndTracking();
  }

  async initMapAndTracking() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true,
        maximumAge: 0 
      });
      
      this.currentLat = coordinates.coords.latitude;
      this.currentLng = coordinates.coords.longitude;

      await this.createMap();
      this.startLocationWatch();
    } catch (e) {
      this.presentToast('Please enable GPS to proceed', 'danger');
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
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      (position) => {
        if (position && position.coords) {
          this.currentLat = position.coords.latitude;
          this.currentLng = position.coords.longitude;
          
          this.updateAddress(this.currentLat, this.currentLng);
          this.updateMarker();

          // Move the camera to track the user live
          if (this.newMap) {
            this.newMap.setCamera({
              coordinate: { lat: this.currentLat, lng: this.currentLng },
              zoom: 17,
              animate: true
            });
          }
        }
      }
    );
  }

  async updateMarker() {
    if (!this.newMap) return;

    // Remove old marker to prevent a trail of pins
    if (this.markerId) {
      await this.newMap.removeMarkers([this.markerId]);
    }

    // Add a marker to show the live location
    const result = await this.newMap.addMarker({
      coordinate: { lat: this.currentLat, lng: this.currentLng },
      title: 'Your Location'
    });
    
    this.markerId = result;
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.results && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      }
    } catch (error) {
      this.currentAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  }

  async presentImageSourceOptions() {
    // 3. Translate Action Sheet labels
    const header = await firstValueFrom(this.translate.get('ATTENDANCE.CAPTURE_ID'));
    const takePhoto = await firstValueFrom(this.translate.get('ATTENDANCE.TAKE_PHOTO'));
    const gallery = await firstValueFrom(this.translate.get('ATTENDANCE.FROM_GALLERY'));
    const cancel = await firstValueFrom(this.translate.get('COMMON.CANCEL'));

    const actionSheet = await this.actionSheetCtrl.create({
      header: header,
      buttons: [
        { text: takePhoto, icon: 'camera', handler: () => this.captureImage(CameraSource.Camera) },
        { text: gallery, icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
        { text: cancel, role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

 async captureImage(source: CameraSource) {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false, // Set to false for faster testing
      source: source,
      resultType: CameraResultType.Base64, // ✅ Crucial for backend sync
    });

    if (photo.base64String) {
      // This saves the image for both the UI preview and the DB upload
      this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
    }
  } catch (error) {
    console.error('Camera error:', error);
    this.presentToast('Camera closed or failed', 'warning');
  }
}

  goBack() {
    if (this.watchId) Geolocation.clearWatch({ id: this.watchId });
    this.navCtrl.back();
  }

  setMode(entry: boolean) { this.isEntry = entry; }

async submitAttendance() {
  const rangerId = localStorage.getItem('ranger_id');
  
  if (!this.capturedPhoto) {
    this.presentToast('Please capture a photo first', 'warning');
    return;
  }

  const attendanceData = {
    ranger_id: Number(rangerId),
    ranger_name: this.rangerName,     // ✅ Matches your DB requirement
    photo: this.capturedPhoto,
    type: this.isEntry ? 'ENTRY' : 'EXIT',
    latitude: this.currentLat,
    longitude: this.currentLng,
    site_name: this.currentAddress,  // ✅ Matches your Geofence requirement
    timestamp: new Date().toISOString()
  };

  // Ensure port 3000 is included if that's where NestJS is running
  const url = 'http://10.160.145.89:3000/api/attendance/beat-attendance';

  this.http.post(url, attendanceData).subscribe({
    next: () => {
      this.presentToast('Attendance Marked!', 'success');
      this.navCtrl.back();
    },
    error: (err) => {
      console.error('Sync Error:', err);
      this.presentToast('Sync Failed. Check Server Connection.', 'danger');
    }
  });
}

  // 4. Enhanced Toast with Translation support
  async presentToast(key: string, color: string) {
    // Attempt to get translated text; if key not found, it returns the key string
    const message = await firstValueFrom(this.translate.get(key));
    const toast = await this.toastCtrl.create({
      message, 
      duration: 2500, 
      color, 
      mode: 'ios', 
      position: 'bottom'
    });
    toast.present();
  }

  ngOnDestroy() {
    // This cleans up resources when the page is closed
    console.log('Attendance page destroyed');
  }
}