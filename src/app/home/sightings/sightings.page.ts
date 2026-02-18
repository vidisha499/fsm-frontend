

import { Component, OnInit , ChangeDetectorRef} from '@angular/core'; 
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DataService } from 'src/app/data.service';

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
    private cdr: ChangeDetectorRef
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

  async saveSighting() {
    if (!this.patrolId) {
      this.showToast("No Active Patrol Session Found!");
      this.resetSlider();
      return;
    }

    this.isSaving = true;
    this.isSubmitting = true; 
    this.textOpacity = 0;
    
    const loader = await this.loadingCtrl.create({ 
      message: 'Saving Sighting...', 
      mode: 'ios',
      spinner: 'crescent'
    });
    await loader.present();

    // Payload updated to include 'category' for frontend icon logic
    const payload = {
      patrol_id: Number(this.patrolId),
      category: this.category, // Required for log.category icons
      sighting_type: this.obsData.sightingType,
      species: this.obsData.species || this.category,
      count: this.obsData.count,
      gender: { 
        male: this.obsData.genderMale, 
        female: this.obsData.genderFemale, 
        unknown: this.obsData.genderUnknown 
      },
      photos: this.obsData.photos,
      notes: this.obsData.notes,
      timestamp: new Date().toISOString()
    };

    this.dataService.saveSighting(payload).subscribe({
      next: () => {
        loader.dismiss();
        this.showToast(`${this.category} saved successfully!`);
        setTimeout(() => {
          this.isSubmitting = false;
          this.navCtrl.back();
        }, 1000);
      },
      error: (err) => {
        loader.dismiss();
        this.resetSlider();
        this.showToast(`Error: ${err.status}`);
        this.cdr.detectChanges();
      }
    });
  }

  resetSlider() {
    this.isSaving = false;
    this.isSubmitting = false;
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({ quality: 50, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      if (image.dataUrl) this.obsData.photos.push(image.dataUrl);
    } catch (e) { console.warn('User cancelled camera'); }
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