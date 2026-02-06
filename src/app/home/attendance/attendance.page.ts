import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit {
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
  private watchId: any;
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';

  // ✅ Ensure this IP is your computer's actual IPv4 address
  private apiUrl: string = 'http://10.160.145.89:3000/api/attendance/beat-attendance';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'vidisha';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    this.initMapAndTracking();
  }

  async initMapAndTracking() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
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
        zoom: 16,
      },
    });

    await this.newMap.addMarker({
      coordinate: { lat: this.currentLat, lng: this.currentLng },
      title: 'Current Position',
    });
  }

  async startLocationWatch() {
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      (position) => {
        if (position) {
          this.currentLat = position.coords.latitude;
          this.currentLng = position.coords.longitude;
          this.updateAddress(this.currentLat, this.currentLng);

          if (this.newMap) {
            this.newMap.setCamera({
              coordinate: { lat: this.currentLat, lng: this.currentLng }
            });
          }
        }
      }
    );
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.results && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      }
    } catch (error) {
      this.currentAddress = "Location identified";
    }
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Capture ID Photo',
      buttons: [
        { text: 'Take Photo', icon: 'camera', handler: () => this.captureImage(CameraSource.Camera) },
        { text: 'From Gallery', icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', role: 'cancel' }
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

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, color, mode: 'ios', position: 'bottom'
    });
    toast.present();
  }
}