import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { NavController, ToastController, ActionSheetController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;

  public attendanceType: string = 'entry';
  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Loading...';
  public currentAddress: string = 'Detecting location...';
  public currentCoords: any;

  // Use your existing API Key
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = 'http://localhost:3000/api/onsite-attendance';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Get the ranger name saved during login
    this.rangerName = localStorage.getItem('ranger_username') || 'Unknown Ranger';
  }

  async ionViewDidEnter() {
    await this.createMap();
  }

  async createMap() {
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.currentCoords = position.coords;

      this.newMap = await GoogleMap.create({
        id: 'onsite-map-instance',
        element: this.mapRef.nativeElement,
        apiKey: this.googleApiKey,
        config: {
          center: { lat: this.currentCoords.latitude, lng: this.currentCoords.longitude },
          zoom: 16,
        },
      });

      await this.newMap.addMarker({
        coordinate: { lat: this.currentCoords.latitude, lng: this.currentCoords.longitude },
        title: 'Current Location',
      });

      // Fetch the address for the Geofence field
      this.fetchAddress(this.currentCoords.latitude, this.currentCoords.longitude);

    } catch (e) {
      console.error('Map Initialization Error:', e);
      this.presentToast('Failed to load Map.', 'danger');
    }
  }

  async fetchAddress(lat: number, lng: number) {
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
        { text: 'Select from Gallery', icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 40,
        resultType: CameraResultType.Base64,
        source: source
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) {
      console.log('User cancelled image selection');
    }
  }

  async submit() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!this.capturedPhoto) {
      this.presentToast('Please capture or select a photo.', 'warning');
      return;
    }

    // Body matched to your onsite_attendance SQL columns
    const onsiteData = {
      ranger_id: Number(rangerId),
      type: 'ON-SITE',
      photo: this.capturedPhoto,
      ranger: this.rangerName,
      geofence: this.currentAddress, 
      attendance_type: this.attendanceType.toUpperCase()
    };

    this.http.post(this.apiUrl, onsiteData).subscribe({
      next: () => {
        this.presentToast('On-Site Attendance Logged!', 'success');
        this.navCtrl.back();
      },
      error: (err) => {
        console.error('Submission Error:', err);
        this.presentToast('Database Sync Failed.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }

  ngOnDestroy() {
    if (this.newMap) this.newMap.destroy();
  }

  goBack() { this.navCtrl.back(); }
}