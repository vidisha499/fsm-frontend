// import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
// import { NavController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// import { Geolocation } from '@capacitor/geolocation';
// import { GoogleMap } from '@capacitor/google-maps';
// import { firstValueFrom } from 'rxjs';
// import { environment } from 'src/environments/environment';

// @Component({
//   selector: 'app-onsite',
//   templateUrl: './onsite-attendance.page.html',
//   styleUrls: ['./onsite-attendance.page.scss'],
//   standalone: false
// })
// export class OnsiteAttendancePage implements OnInit, OnDestroy {
//   @ViewChild('map') mapRef!: ElementRef;
//   newMap!: GoogleMap;

//   public capturedPhoto: string | undefined = undefined;
//   public rangerName: string = 'Loading...';
//   public currentAddress: string = 'Detecting location...';
//   public currentLat: number = 0;
//   public currentLng: number = 0;
  
//   public isSubmitting: boolean = false;
//   public mapLoaded: boolean = false; // Flag for map status

//   private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
//   private apiUrl: string = `${environment.apiUrl}/onsite-attendance`;

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private actionSheetCtrl: ActionSheetController,
//     private http: HttpClient,
//     private platform: Platform
//   ) {}

//   ngOnInit() {
//     this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
//   }

//   async ionViewDidEnter() {
//     await this.platform.ready();
//     await this.initMap();
//   }

//   async initMap() {
//     try {
//       const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
//       this.currentLat = pos.coords.latitude;
//       this.currentLng = pos.coords.longitude;

//       await this.createMap();
//       this.fetchAddress(this.currentLat, this.currentLng);
//     } catch (e) {
//       this.presentToast('Location error. Check GPS.', 'danger');
//     }
//   }

//   async createMap() {
//     if (!this.mapRef) return;

//     this.newMap = await GoogleMap.create({
//       id: 'onsite-map-unique-id',
//       element: this.mapRef.nativeElement,
//       apiKey: this.googleApiKey,
//       config: {
//         center: { lat: this.currentLat, lng: this.currentLng },
//         zoom: 16,
//       },
//     });

//     await this.newMap.addMarker({
//       coordinate: { lat: this.currentLat, lng: this.currentLng },
//       title: 'You are here',
//     });

//     this.mapLoaded = true; // Map is now ready
//   }

//   async fetchAddress(lat: number, lng: number) {
//     const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
//     try {
//       const data: any = await firstValueFrom(this.http.get(url));
//       this.currentAddress = data.results[0]?.formatted_address || 'Address Found';
//     } catch (error) {
//       this.currentAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
//     }
//   }

//   async captureImage(source: CameraSource) {
//     try {
//       const image = await Camera.getPhoto({ 
//         quality: 50, 
//         resultType: CameraResultType.Base64, 
//         source 
//       });
//       if (image.base64String) {
//         this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
//       }
//     } catch (error) { 
//       console.log('User cancelled camera'); 
//     }
//   }

//   async submit() {
//     if (!this.capturedPhoto) {
//       this.presentToast('Please capture a photo first.', 'warning');
//       return;
//     }

//     this.isSubmitting = true;

//     const onsiteData = {
//       ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
//       type: 'ON-SITE',
//       photo: this.capturedPhoto,
//       ranger: this.rangerName,
//       geofence: this.currentAddress, 
//       latitude: this.currentLat,
//       longitude: this.currentLng
//     };

//     this.http.post(this.apiUrl, onsiteData).subscribe({
//       next: () => {
//         setTimeout(() => {
//           this.presentToast('ATTENDANCE MARKED & SYNCED', 'success');
//           setTimeout(() => this.navCtrl.navigateRoot('/home'), 1000);
//         }, 800);
//       },
//       error: () => {
//         this.isSubmitting = false;
//         this.presentToast('Submission Failed. Please try again.', 'danger');
//       }
//     });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({ 
//       message, duration: 2500, color, mode: 'ios', position: 'bottom'
//     });
//     toast.present();
//   }
  
//   async ngOnDestroy() {
//     if (this.newMap) {
//       await this.newMap.destroy();
//     }
//   }

//   goBack() { 
//     this.navCtrl.back(); 
//   }

//   async presentImageSourceOptions() {
//     const actionSheet = await this.actionSheetCtrl.create({
//       header: 'Capture ID Photo',
//       mode: 'ios',
//       buttons: [
//         { text: 'Take Photo', icon: 'camera', handler: () => this.captureImage(CameraSource.Camera) },
//         { text: 'Select from Gallery', icon: 'image', handler: () => this.captureImage(CameraSource.Photos) },
//         { text: 'Cancel', role: 'cancel' }
//       ]
//     });
//     await actionSheet.present();
//   }
// }



import { Component, OnInit, ElementRef, ViewChild, OnDestroy , ChangeDetectorRef } from '@angular/core';
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

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private platform: Platform,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  }

  async ionViewDidEnter() {
    await this.platform.ready();
    await this.initMap();
  }


  onDragStart(event: TouchEvent) {
  if (this.isSubmitting) return;
  this.startX = event.touches[0].clientX - this.currentTranslateX;
}

onDragMove(event: TouchEvent) {
  if (this.isSubmitting) return;

  const x = event.touches[0].clientX;
  let moveX = x - this.startX;

  // Calculate max distance (Screen width - knob width - margins)
  const maxSlide = window.innerWidth - 115; 

  if (moveX < 0) moveX = 0;
  if (moveX > maxSlide) moveX = maxSlide;

  this.currentTranslateX = moveX;
  
  // Fade out text as the knob moves over it
  this.textOpacity = 1 - (moveX / maxSlide);
}

onDragEnd() {
  if (this.isSubmitting) return;

  const maxSlide = window.innerWidth - 115;

  // If slid more than 80%, complete the action
  if (this.currentTranslateX > maxSlide * 0.8) {
    this.currentTranslateX = maxSlide;
    this.submit(); // Your existing function that redirects home
  } else {
    // Reset position if not slid far enough
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }
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

  // Capability to capture via Camera or select from Gallery
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

  // async presentImageSourceOptions() {
  //   const actionSheet = await this.actionSheetCtrl.create({
  //     header: 'CHOOSE PHOTO SOURCE',
  //     mode: 'ios',
  //     buttons: [
  //       { 
  //         text: 'TAKE NEW PHOTO', 
  //         icon: 'camera-outline', 
  //         handler: () => this.captureImage(CameraSource.Camera) 
  //       },
  //       { 
  //         text: 'SELECT FROM GALLERY', 
  //         icon: 'image-outline', 
  //         handler: () => this.captureImage(CameraSource.Photos) 
  //       },
  //       { text: 'CANCEL', role: 'cancel' }
  //     ]
  //   });
  //   await actionSheet.present();
  // }

  async presentImageSourceOptions() {
  const actionSheet = await this.actionSheetCtrl.create({
    header: 'Select Photo Source',
    mode: 'md',
    cssClass: 'custom-action-sheet', // This key connects to the CSS below
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
      { text: 'Cancel', 
          role: 'cancel',
          icon: 'close' }
    ]
  });
  await actionSheet.present();
}
async submit() {
  // 1. Check if photo is captured
  if (!this.capturedPhoto) {
    this.presentToast('Please capture a photo first.', 'warning');
    // Snap the slider back so they can try again
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
    return;
  }

  // 2. Calculate maxSlide if it hasn't been set yet
  // This ensures the knob knows exactly how far right to go
  const container = document.querySelector('.slider-track');
  if (container) {
    this.maxSlide = container.clientWidth - 60; // Track width minus knob (50px) and padding
  }

  // 3. Lock the UI states for the "Active" animation
  this.isSubmitting = true;
  this.textOpacity = 0; 
  this.currentTranslateX = this.maxSlide; // LOCK handle at the end (Right Side)
  this.cdr.detectChanges(); 

  const onsiteData = {
    ranger_id: Number(localStorage.getItem('ranger_id')) || 1,
    type: 'ON-SITE',
    photo: this.capturedPhoto,
    ranger: this.rangerName,
    geofence: this.currentAddress, 
    latitude: this.currentLat,
    longitude: this.currentLng
  };

  this.http.post(this.apiUrl, onsiteData).subscribe({
    next: () => {
      // 4. Success: Show the Sync animation/Toast
      // The knob remains green and spinning at the RIGHT side here
      setTimeout(() => {
        this.presentToast('ATTENDANCE MARKED & SYNCED', 'success');
        
        // 5. Final Redirect to Home
        setTimeout(() => {
          this.isSubmitting = false;
          this.navCtrl.navigateRoot('/home');
        }, 1000);
      }, 800);
    },
    error: () => {
      // 6. Failure: Reset slider so the user can physically slide it again
      this.isSubmitting = false;
      this.currentTranslateX = 0; // Snap back to LEFT
      this.textOpacity = 1;
      this.presentToast('Submission Failed. Please try again.', 'danger');
      this.cdr.detectChanges();
    }
  });
}
  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, duration: 2500, color, mode: 'ios', position: 'bottom'
    });
    toast.present();
  }
  
  async ngOnDestroy() {
    if (this.newMap) {
      await this.newMap.destroy();
    }
  }

  goBack() { 
    this.navCtrl.back(); 
  }
}