import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { NavController, ToastController, ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  newMap!: GoogleMap;

  public attendanceType: string = 'entry';
  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Loading...';
  public currentAddress: string = 'Detecting location...';
  public currentLat: number = 0;
  public currentLng: number = 0;
  
  // Animation aur UI state control ke liye
  public isSubmitting: boolean = false;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/onsite-attendance`;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private platform: Platform,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    // Ranger ka naam local storage se fetch karna
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  }

  async ionViewDidEnter() {
    await this.platform.ready();
    await this.initMap();
  }

  async initMap() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      await this.createMap();
      this.fetchAddress(this.currentLat, this.currentLng);
    } catch (e) {
      this.presentToast('Location error. Check GPS.', 'danger');
    }
  }

  async createMap() {
    if (!this.mapRef) return;

    this.newMap = await GoogleMap.create({
      id: 'onsite-map-unique-id',
      element: this.mapRef.nativeElement,
      apiKey: this.googleApiKey,
      config: {
        center: { lat: this.currentLat, lng: this.currentLng },
        zoom: 16,
      },
    });

    await this.newMap.addMarker({
      coordinate: { lat: this.currentLat, lng: this.currentLng },
      title: 'You are here',
    });
  }

  async fetchAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      this.currentAddress = data.results[0]?.formatted_address || 'Address Found';
    } catch (error) {
      this.currentAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  }

  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({ 
        quality: 40, 
        resultType: CameraResultType.Base64, 
        source 
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) { 
      console.log('User cancelled camera'); 
    }
  }

  async submit() {
    // 1. Photo validation
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo first.', 'warning');
      return;
    }

    // 2. Slider Animation Start (Knob move karega aur text change hoga)
    this.isSubmitting = true;

    const onsiteData = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      type: 'ON-SITE',
      photo: this.capturedPhoto,
      ranger: this.rangerName,
      geofence: this.currentAddress, 
      attendance_type: this.attendanceType.toUpperCase(),
      latitude: this.currentLat,
      longitude: this.currentLng
    };

    // 3. API Call with delay for smooth animation
    this.http.post(this.apiUrl, onsiteData).subscribe({
      next: async () => {
        // Animation finish hone ka wait karein (800ms)
        setTimeout(async () => {
          this.presentToast('ATTENDANCE MARKED & SYNCED', 'success');
          
          // Home page par redirect karein
          setTimeout(() => {
            this.navCtrl.navigateRoot('/home');
          }, 1200);
        }, 800);
      },
      error: (err) => {
        console.error('Submission error:', err);
        this.isSubmitting = false; // Error par slider reset karein
        this.presentToast('Submission Failed. Please try again.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration: 2500, 
      color, 
      mode: 'ios',
      position: 'bottom'
    });
    toast.present();
  }
  
  async ngOnDestroy() {
    if (this.newMap) {
      await this.newMap.destroy();
    }
  }

  goBack() { 
    this.navCtrl.navigateRoot('/home'); 
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Capture ID Photo',
      mode: 'ios',
      buttons: [
        { 
          text: 'Take Photo', 
          icon: 'camera', 
          handler: () => this.captureImage(CameraSource.Camera) 
        },
        { 
          text: 'Select from Gallery', 
          icon: 'image', 
          handler: () => this.captureImage(CameraSource.Photos) 
        },
        { 
          text: 'Cancel', 
          role: 'cancel' 
        }
      ]
    });
    await actionSheet.present();
  }
}