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
  public currentTranslateX: number = 0;
public textOpacity: number = 1;
private startX: number = 0;
private maxSlide: number = 0;
  
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

  // async initMapAndTracking() {
  //   try {
  //     const permissions = await Geolocation.checkPermissions();
  //     if (permissions.location !== 'granted') await Geolocation.requestPermissions();

  //     const pos = await Geolocation.getCurrentPosition({ 
  //       enableHighAccuracy: true,
  //       timeout: 120000 
  //     });
      
  //     this.currentLat = pos.coords.latitude;
  //     this.currentLng = pos.coords.longitude;

  //     await this.createMap();
  //     this.startLocationWatch();
  //     // Wait a bit to ensure GPS is stable before geocoding
  //     setTimeout(() => this.updateAddress(this.currentLat, this.currentLng), 1000);
  //   } catch (e) {
  //     this.presentToast('Please enable GPS and permissions', 'warning');
  //   }
  // }

  // async createMap() {
  //   if (!this.mapRef) return;
  //   this.newMap = await GoogleMap.create({
  //     id: 'attendance-map-unique',
  //     element: this.mapRef.nativeElement,
  //     apiKey: this.googleApiKey,
  //     config: { center: { lat: this.currentLat, lng: this.currentLng }, zoom: 17 },
  //   });
  //   this.updateMarker();
  // }

  // async startLocationWatch() {
  //   this.watchId = await Geolocation.watchPosition({ 
  //       enableHighAccuracy: true, 
  //       timeout: 10000 
  //   }, (pos) => {
  //     if (pos) {
  //       this.currentLat = pos.coords.latitude;
  //       this.currentLng = pos.coords.longitude;
  //       this.updateMarker();
  //     }
  //   });
  // }

async initMapAndTracking() {
  try {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      await Geolocation.requestPermissions();
    }

    // Fresh location lene ke liye maximumAge: 0 add kiya hai
    const pos = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: true,
      timeout: 30000, // 30s timeout for better accuracy
      maximumAge: 0    
    }).catch(err => {
      console.warn("Location timeout, using defaults", err);
      // Agar timeout ho toh Washim default rahega
      return { coords: { latitude: 20.1013, longitude: 77.1337 } }; 
    });
    
    this.currentLat = pos.coords.latitude;
    this.currentLng = pos.coords.longitude;

    // 1. Map create karein
    await this.createMap();

    // 2. Map ko current location par move/center karein
    if (this.newMap) {
      await this.newMap.setCamera({
        coordinate: { lat: this.currentLat, lng: this.currentLng },
        zoom: 15,
        animate: true
      });
    }

    // 3. Address aur Marker update karein
    this.updateAddress(this.currentLat, this.currentLng);
    this.updateMarker();
    
    // 4. Real-time tracking shuru karein
    this.startLocationWatch();

  } catch (e) {
    this.presentToast('Please enable GPS and permissions', 'warning');
  }
}
  async createMap() {
    if (!this.mapRef) return;

    // IMPORTANT: ID must match the HTML element ID
    this.newMap = await GoogleMap.create({
      id: 'map', 
      element: this.mapRef.nativeElement,
      apiKey: this.googleApiKey,
      config: { 
        center: { lat: this.currentLat, lng: this.currentLng }, 
        zoom: 15,
        androidLiteMode: false // Set to true if performance is slow
      },
    });

    await this.updateMarker();
  }

  async startLocationWatch() {
    // Save watch ID properly to clear it later
    const callback = (pos: any) => {
      if (pos && pos.coords) {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;
        this.updateMarker();
      }
    };

    this.watchId = await Geolocation.watchPosition({ 
        enableHighAccuracy: true, 
        timeout: 30000 ,
        maximumAge: 0
    }, callback);
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

  // 1. Start the sliding animation/loading state
  this.isSubmitting = true;
  this.cdr.detectChanges(); 

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
      // 2. Success: Show the toast immediately
      this.presentToast('Attendance Success!', 'success');
      
      // 3. Wait 1 second so they see the success state, then redirect home
      setTimeout(() => {
        this.isSubmitting = false;
        this.goBack(); // This handles the redirect to /home
      }, 1000); 
    },
    error: () => {
      // Reset immediately on error so they can try again
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

  onDragStart(event: TouchEvent) {
  if (this.isSubmitting) return;
  this.startX = event.touches[0].clientX - this.currentTranslateX;
  
  const container = document.querySelector('.slider-track');
  if (container) {
    // 50px handle width + 10px total padding (5px left + 5px right)
    this.maxSlide = container.clientWidth - 60; 
  }
}

onDragMove(event: TouchEvent) {
  if (this.isSubmitting) return;

  let moveX = event.touches[0].clientX - this.startX;

  if (moveX < 0) moveX = 0;
  if (moveX > this.maxSlide) moveX = this.maxSlide;

  this.currentTranslateX = moveX;
  this.textOpacity = 1 - (moveX / this.maxSlide);
  this.cdr.detectChanges();
}

onDragEnd() {
  if (this.isSubmitting) return;

  // If slid past 85%, snap to end and submit
  if (this.currentTranslateX >= this.maxSlide * 0.85) {
    this.currentTranslateX = this.maxSlide;
    this.textOpacity = 0;
    this.submitAttendance();
  } else {
    // Snap back to start
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }
  this.cdr.detectChanges();
}
}