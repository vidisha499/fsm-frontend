


import { Component, OnInit } from '@angular/core'; 
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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

  // --- FIXED: Path must include /patrols ---
private apiUrl = 'https://forest-backend-pi.vercel.app/api/patrols/sightings';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.category = params['type'] || 'Sighting';
      this.patrolId = params['patrolId'] ? Number(params['patrolId']) : Number(localStorage.getItem('active_patrol_id'));
    });
  }

  // --- FIXED: Added missing function for HTML checkbox ---
  toggleGender(type: string) {
    this.obsData.genderMale = (type === 'male');
    this.obsData.genderFemale = (type === 'female');
    this.obsData.genderUnknown = (type === 'unknown');
  }

  async saveSighting() {
    if (!this.patrolId) {
      this.showToast("No Active Patrol Session Found!");
      return;
    }

    this.isSaving = true;
    const loader = await this.loadingCtrl.create({ message: 'Saving to Database...', mode: 'ios' });
    await loader.present();

    const payload = {
      patrol_id: this.patrolId,
      sighting_type: this.category,
      species: this.obsData.species || this.category,
      count: this.obsData.count,
      gender: { 
        male: this.obsData.genderMale, 
        female: this.obsData.genderFemale, 
        unknown: this.obsData.genderUnknown 
      },
      photos: this.obsData.photos,
      notes: this.obsData.notes
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: () => {
        loader.dismiss();
        this.showToast(`${this.category} saved in Database!`);
        this.navCtrl.back();
      },
      error: (err) => {
        loader.dismiss();
        this.isSaving = false;
        console.error("Path Error 404:", err);
        this.showToast('404 Error: Make sure backend is deployed with /patrols/sightings');
      }
    });
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
}