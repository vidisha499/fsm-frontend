import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps'; // ✅ Import Google Maps

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;

  public locationType: string = 'site';
  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Ranger';
  public currentCoords: any;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) this.rangerName = storedName;
  }

  // Use ionViewDidEnter to ensure the element is ready
  async ionViewDidEnter() {
    await this.createMap();
  }

  async createMap() {
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.currentCoords = position.coords;

      this.newMap = await GoogleMap.create({
        id: 'my-cool-map',
        element: this.mapRef.nativeElement,
        apiKey: 'YOUR_GOOGLE_MAPS_API_KEY_HERE', // 🔑 Replace with your API Key
        config: {
          center: {
            lat: this.currentCoords.latitude,
            lng: this.currentCoords.longitude,
          },
          zoom: 15,
        },
      });

      // Add a marker at your location
      await this.newMap.addMarker({
        coordinate: {
          lat: this.currentCoords.latitude,
          lng: this.currentCoords.longitude,
        },
        title: 'You are here',
      });
    } catch (e) {
      console.error('Google Maps Error', e);
    }
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 30,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) {
      this.presentToast('Camera cancelled.', 'warning');
    }
  }

  async submit() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!this.capturedPhoto) {
      this.presentToast('Please take a photo first.', 'warning');
      return;
    }

    const onsiteData = {
      ranger_id: rangerId,
      type: this.locationType,
      photo: this.capturedPhoto,
      ranger: this.rangerName,
      geofence: 'Panna Site Sector 2',
      latitude: this.currentCoords?.latitude,
      longitude: this.currentCoords?.longitude
    };

    this.http.post('http://localhost:3000/api/onsite/mark', onsiteData)
      .subscribe({
        next: () => {
          this.presentToast('On-Site Attendance Logged!', 'success');
          setTimeout(() => this.navCtrl.back(), 2000);
        },
        error: () => this.presentToast('Sync Failed!', 'danger')
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }

  ngOnDestroy() {
    if (this.newMap) {
      this.newMap.destroy();
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}