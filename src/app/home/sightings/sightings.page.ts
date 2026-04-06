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
    
    // Check URL first
    const idFromUrl = params['patrolId'];
    // Check localStorage as fallback
    const idFromStorage = localStorage.getItem('active_patrol_id');
    
    // Force conversion to number
    if (idFromUrl) {
      this.patrolId = Number(idFromUrl);
    } else if (idFromStorage) {
      this.patrolId = Number(idFromStorage);
    }

    console.log("Verified Patrol ID for Sighting:", this.patrolId);
  });
}

  toggleGender(type: string) {
    this.obsData.genderMale = (type === 'male');
    this.obsData.genderFemale = (type === 'female');
    this.obsData.genderUnknown = (type === 'unknown');
  }

 


async saveSighting() {
   
    const finalPatrolId = this.patrolId || Number(localStorage.getItem('active_patrol_id'));

  if (!finalPatrolId || isNaN(finalPatrolId)) {
    this.showToast("Error: No Active Patrol ID. Please restart patrol.");
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
      // 1. Get Location
      const pos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 3000 
      });

      // 2. Build the Payload (Matching your backend Entity/DTO)
     const payload = {
      
    patrolId: finalPatrolId, // Use the verified number here
    category: this.category,
    sightingType: this.obsData.sightingType,
    species: this.obsData.species || this.category,
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    count: Number(this.obsData.count || 1),
    notes: this.obsData.notes || '',
    photos: this.obsData.photos || [],
    companyId: Number(localStorage.getItem('company_id')),
    gender: {
      male: this.obsData.genderMale,
      female: this.obsData.genderFemale,
      unknown: this.obsData.genderUnknown
    }
  };

      console.log("Sending Sighting Payload:", payload);

      // 3. API Call
      this.dataService.saveSighting(payload).subscribe({
        next: async (res) => {
          console.log("Sighting saved successfully:", res);
          await loader.dismiss();
          this.showToast("Sighting recorded successfully!");
          
          // Small delay before going back
          setTimeout(() => {
            this.navCtrl.back();
          }, 600);
        },
        error: async (err) => {
          console.error("DATABASE SAVE ERROR:", err);
          await loader.dismiss();
          this.resetSlider();
          
          // Specific error feedback from backend
          const msg = err.error?.message || "Check network connection.";
          this.showToast(`Save failed: ${msg}`);
        }
      });

    } catch (e) {
      console.error("LOCATION ERROR:", e);
      await loader.dismiss();
      this.resetSlider();
      this.showToast("GPS Error: Please ensure Location/GPS is turned ON.");
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