import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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
export class AttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  newMap!: GoogleMap;

  public isEntry: boolean = true;
  public capturedPhoto: string = ''; 
  public rangerName: string = 'Loading...';
  public rangerRegion: string = 'Washim';
  public currentAddress: string = 'Detecting location...';

  public currentLat: number = 0;
  public currentLng: number = 0;
  private watchId: string | null = null;
  private markerId: string | null = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = 'http://localhost:3000/api/attendance/beat-attendance';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Unknown Ranger';
    this.rangerRegion = localStorage.getItem('ranger_region') || 'Washim';
    this.initMapAndTracking();
  }

  ngOnDestroy() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
    }
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
      this.presentToast('Please enable GPS', 'danger');
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
        quality: 40,
        allowEditing: false,
        source: source,
        resultType: CameraResultType.Base64,
      });

      if (photo.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
      }
    } catch (error) {
      this.presentToast('Image capture cancelled', 'warning');
    }
  }

  async submitAttendance() {
    const rangerId = localStorage.getItem('ranger_id');
    
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo first', 'warning');
      return;
    }

    const attendanceData = {
      ranger_id: Number(rangerId),
      ranger: this.rangerName,
      photo: this.capturedPhoto,
      geofence: this.currentAddress,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      latitude: this.currentLat,
      longitude: this.currentLng
    };

    this.http.post(this.apiUrl, attendanceData).subscribe({
      next: () => {
        this.presentToast('Attendance Marked Successfully!', 'success');
        this.navCtrl.back();
      },
      error: (err) => {
        console.error('Sync Error Details:', err);
        this.presentToast('Database Sync Failed.', 'danger');
      }
    });
  }

  goBack() { this.navCtrl.back(); }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, color, mode: 'ios', position: 'bottom'
    });
    toast.present();
  }
}