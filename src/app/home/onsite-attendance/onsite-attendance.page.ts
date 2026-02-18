import { Component, OnInit, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  newMap!: GoogleMap;
  private maxSlide: number = 0;
  private startX: number = 0;
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;

  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Loading...';
  public currentAddress: string = 'Detecting location...';
  public currentLat: number = 0;
  public currentLng: number = 0;
  
  public isSubmitting: boolean = false;
  public mapLoaded: boolean = false;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  private apiUrl: string = `${environment.apiUrl}/onsite-attendance`;

  public currentDateTime: string = '';
  private timer: any;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private platform: Platform,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.updateClock(); // Turant time dikhane ke liye
    this.timer = setInterval(() => {
      this.updateClock();
    }, 60000);

    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  }

  async ionViewDidEnter() {
    await this.platform.ready();
    await this.initMap();
  }

  // --- Slider Logic ---
  onDragStart(event: TouchEvent) {
    if (this.isSubmitting) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting) return;
    const x = event.touches[0].clientX;
    let moveX = x - this.startX;
    const maxSlide = window.innerWidth - 115; 
    if (moveX < 0) moveX = 0;
    if (moveX > maxSlide) moveX = maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / maxSlide);
  }

  onDragEnd() {
    if (this.isSubmitting) return;
    const maxSlide = window.innerWidth - 115;
    if (this.currentTranslateX > maxSlide * 0.8) {
      this.currentTranslateX = maxSlide;
      this.submit(); 
    } else {
      this.currentTranslateX = 0;
      this.textOpacity = 1;
    }
  }

  // --- Map & Location Logic ---
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
    this.mapLoaded = true;
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

  // --- Photo Logic ---
  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({ 
        quality: 50, 
        resultType: CameraResultType.Base64, 
        source 
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) { 
      console.log('User cancelled selection'); 
    }
  }

  async presentImageSourceOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Photo Source',
      mode: 'md',
      cssClass: 'custom-action-sheet',
      buttons: [
        { text: 'Camera', icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: 'Gallery', icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: 'Cancel', role: 'cancel', icon: 'close' }
      ]
    });
    await actionSheet.present();
  }

  // --- Database Submission ---
  async submit() {
    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo first.', 'warning');
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.cdr.detectChanges();
      return;
    }

    const container = document.querySelector('.slider-track');
    if (container) {
      this.maxSlide = container.clientWidth - 60;
    }

    this.isSubmitting = true;
    this.textOpacity = 0; 
    this.currentTranslateX = this.maxSlide;
    this.cdr.detectChanges(); 

    // Refreshing currentDateTime to ensure it's not empty
    this.updateClock();

 const onsiteData = {
      ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
      ranger: this.rangerName,
      geofence: this.currentAddress, 
      attendance_type: 'ON-SITE',
      photo: this.capturedPhoto,
      latitude: this.currentLat,
      longitude: this.currentLng,
      // CHANGE THIS LINE:
      created_at: new Date().toISOString() 
    };

    this.http.post(this.apiUrl, onsiteData).subscribe({
      next: () => {
        setTimeout(() => {
          this.presentToast('ATTENDANCE MARKED & SYNCED', 'success');
          setTimeout(() => {
            this.isSubmitting = false;
            this.navCtrl.navigateRoot('/home');
          }, 1000);
        }, 800);
      },
      error: (err) => {
        console.error('Server Error:', err);
        this.isSubmitting = false;
        this.currentTranslateX = 0;
        this.textOpacity = 1;
        this.presentToast('Submission Failed. Please try again.', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // --- Utilities ---
  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, duration: 2500, color, mode: 'ios', position: 'bottom'
    });
    toast.present();
  }
  
  goBack() { 
    this.navCtrl.back(); 
  }

  updateClock() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(now);
    this.currentDateTime = formatted.replace(',', ' •');
  }

  async ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.newMap) await this.newMap.destroy();
  }
}