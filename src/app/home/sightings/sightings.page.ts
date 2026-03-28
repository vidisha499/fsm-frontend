import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DataService } from 'src/app/data.service';
import { TranslateService } from '@ngx-translate/core'; // Added
import { firstValueFrom } from 'rxjs'; // Added
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-sightings',
  templateUrl: './sightings.page.html',
  styleUrls: ['./sightings.page.scss'],
  standalone: false
})
export class SightingsPage implements OnInit {
  patrolId: number | null = null;
  category: string = 'Sighting';
  isSaving = false;
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  public isSubmitting: boolean = false;
  private startX: number = 0;
  private maxSlide: number = 0;

  obsData = {
    sightingType: 'Direct',
    species: '',
    count: 1,
    genderMale: false,
    genderFemale: false,
    genderUnknown: true,
    notes: '',
    photos: [] as string[]
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService // Added
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.category = params['type'] || 'Sighting';
      const idFromUrl = params['patrolId'];
      const idFromStorage = localStorage.getItem('active_patrol_id');
      this.patrolId = idFromUrl ? Number(idFromUrl) : Number(idFromStorage);
    });
  }

  toggleGender(type: string) {
    this.obsData.genderMale = (type === 'male');
    this.obsData.genderFemale = (type === 'female');
    this.obsData.genderUnknown = (type === 'unknown');
  }

 // sightings.page.ts

// async saveSighting() {
//   if (!this.patrolId) {
//     this.showToast("No Active Patrol Session Found!");
//     this.resetSlider();
//     return;
//   }

//   this.isSaving = true;
//   this.isSubmitting = true; 
  
//   const loader = await this.loadingCtrl.create({ 
//     message: 'Saving sighting...', 
//     mode: 'ios'
//   });
//   await loader.present();

//   try {
//     // This line captures the location for the map
//     const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

//     const payload = {
//   patrol_id: Number(this.patrolId),
//   sighting_type: this.obsData.sightingType, // Ensure this field exists in obsData
//   species: this.obsData.species || this.category,
  
//   // FIX: Match the Entity/SQL column names exactly
//   latitude: pos.coords.latitude, 
//   longitude: pos.coords.longitude,
  
//   count: this.obsData.count,
//   notes: this.obsData.notes,
//   photos: this.obsData.photos,
//   gender: {
//     male: this.obsData.genderMale,
//     female: this.obsData.genderFemale,
//     unknown: this.obsData.genderUnknown
//   }
// };

// this.dataService.saveSighting(payload).subscribe({
//       next: async (res) => {
//         console.log("Sighting saved to DB:", res);
//         await loader.dismiss();
//         this.showToast("Sighting saved successfully!");
        
//         // Short delay so user sees the success toast before navigating back
//         setTimeout(() => {
//           this.navCtrl.back();
//         }, 500);
//       },
//       error: async (err) => {
//         console.error("DATABASE SAVE ERROR:", err); // CHECK YOUR TERMINAL FOR THIS
//         await loader.dismiss();
//         this.resetSlider();
        
//         // More descriptive error message
//         const errorMsg = err.error?.message || "Check network or database.";
//         this.showToast(`Save failed: ${errorMsg}`);
//       }
//     });

//   } catch (e) {
//     console.error("LOCATION ERROR:", e);
//     await loader.dismiss();
//     this.resetSlider();
//     this.showToast("Location error. Please enable GPS and Permissions.");
//   }
// }


// async saveSighting() {
//   if (!this.patrolId) {
//     this.showToast("No Active Patrol Session Found!");
//     this.resetSlider();
//     return;
//   }

//   this.isSaving = true;
//   this.isSubmitting = true; 
  
//   const loader = await this.loadingCtrl.create({ 
//     message: 'Saving sighting...', 
//     mode: 'ios'
//   });
//   await loader.present();

//   try {
//     // FIX: Added timeout: 5000 (5 seconds) and maximumAge
//     // This prevents the infinite spinning loader
//     const pos = await Geolocation.getCurrentPosition({ 
//       enableHighAccuracy: true, 
//       timeout: 5000, 
//       maximumAge: 3000 
//     });

//  // Inside saveSighting() in sightings.page.ts
// const payload = {
//   patrol_id: Number(this.patrolId),
//   sightingType: this.obsData.sightingType, // MATCH ENTITY: sightingType (not sighting_type)
//   species: this.obsData.species || this.category,
//   latitude: pos.coords.latitude, 
//   longitude: pos.coords.longitude,
//   count: this.obsData.count,
//   notes: this.obsData.notes,
//   photos: this.obsData.photos,
//   gender: {
//     male: this.obsData.genderMale,
//     female: this.obsData.genderFemale,
//     unknown: this.obsData.genderUnknown
//   }
// };

//     this.dataService.saveSighting(payload).subscribe({
//       next: async (res) => {
//         await loader.dismiss();
//         this.showToast("Sighting saved!");
//         setTimeout(() => this.navCtrl.back(), 500);
//       },
//       error: async (err) => {
//         await loader.dismiss();
//         this.resetSlider();
//         this.showToast("Server Error: Could not save.");
//       }
//     });

//   } catch (e) {
//     // This block runs if GPS times out or is turned off
//     console.error("GPS ERROR:", e);
//     await loader.dismiss();
//     this.resetSlider();
//     this.showToast("GPS Timeout. Stand near a window or check permissions.");
//   }
// }

async saveSighting() {
  if (!this.patrolId) {
    this.showToast("No Active Patrol Session Found!");
    this.resetSlider();
    return;
  }

  this.isSaving = true;
  this.isSubmitting = true; 
  
  const loader = await this.loadingCtrl.create({ 
    message: 'Saving sighting...', 
    mode: 'ios'
  });
  await loader.present();

  try {
    // 1. Get Location with a fallback/timeout to prevent infinite loading
    const pos = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: true, 
      timeout: 8000, // 8 seconds is safer for outdoor use
      maximumAge: 3000 
    });

    // 2. Build the Payload
    // 2. Build the Payload
const payload = {
  patrolId: Number(this.patrolId), // Match entity property name
  category: this.category, 
  sightingType: this.obsData.sightingType, 
  species: this.obsData.species || this.category,
  latitude: pos.coords.latitude,   // Match SQL column
  longitude: pos.coords.longitude, // Match SQL column
  count: Number(this.obsData.count || 1),
  notes: this.obsData.notes || '',
  photos: this.obsData.photos || [],
  gender: {
    male: this.obsData.genderMale,
    female: this.obsData.genderFemale,
    unknown: this.obsData.genderUnknown
  }
};
    // const payload = {
    //   patrol_id: Number(this.patrolId),
    //   category: this.category, // e.g., 'Animal', 'Water', 'Felling'
    //   sightingType: this.obsData.sightingType, 
    //   species: this.obsData.species || this.category,
    //   latitude: pos.coords.latitude, 
    //   longitude: pos.coords.longitude,
    //   count: Number(this.obsData.count || 1),
    //   notes: this.obsData.notes || '',
    //   photos: this.obsData.photos || [],
    //   gender: {
    //     male: this.obsData.genderMale,
    //     female: this.obsData.genderFemale,
    //     unknown: this.obsData.genderUnknown
    //   }
    // };

    // 3. Send to Backend
    this.dataService.saveSighting(payload).subscribe({
      next: async (res) => {
        console.log("Sighting saved successfully:", res);
        await loader.dismiss();
        this.showToast("Sighting saved successfully!");
        
        // Return to the active patrol page
        setTimeout(() => {
          this.navCtrl.back();
        }, 500);
      },
      error: async (err) => {
        console.error("DATABASE SAVE ERROR:", err);
        await loader.dismiss();
        this.resetSlider();
        
        // Better error feedback
        const msg = err.error?.message || "Check network connection.";
        this.showToast(`Save failed: ${msg}`);
      }
    });

  } catch (e) {
    // This handles GPS Timeouts or Permission Denied
    console.error("LOCATION ERROR:", e);
    await loader.dismiss();
    this.resetSlider();
    this.showToast("GPS Error: Please ensure Location is ON and you are outdoors.");
  }
}

  resetSlider() {
    this.isSaving = false;
    this.isSubmitting = false;
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 50,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        saveToGallery: true
      });
      if (image.dataUrl) {
        this.obsData.photos.push(image.dataUrl);
      }
    } catch (e) { console.warn('User cancelled photo selection'); }
  }

  removePhoto(index: number) { this.obsData.photos.splice(index, 1); }
  goBack() { this.navCtrl.back(); }
  
  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2500, mode: 'ios' });
    await toast.present();
  }

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting || this.isSaving) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 64; 
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting || this.isSaving) return;
    let moveX = event.touches[0].clientX - this.startX;
    if (moveX < 0) moveX = 0;
    if (moveX > this.maxSlide) moveX = this.maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / this.maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting || this.isSaving) return;
    if (this.currentTranslateX >= this.maxSlide * 0.85) {
      this.currentTranslateX = this.maxSlide;
      this.saveSighting(); 
    } else {
      this.currentTranslateX = 0;
      this.textOpacity = 1;
    }
    this.cdr.detectChanges();
  }
}