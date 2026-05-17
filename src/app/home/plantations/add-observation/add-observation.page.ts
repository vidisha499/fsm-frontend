import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, ToastController, ActionSheetController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../../data.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-add-observation',
  templateUrl: './add-observation.page.html',
  styleUrls: ['./add-observation.page.scss'],
  standalone: false
})
export class AddObservationPage implements OnInit {
  plantationId: string | null = null;
  
  formData = {
    visitDate: new Date().toISOString().split('T')[0],
    remark: '',
    photo: null
  };

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) { }

  ngOnInit() {
    this.plantationId = this.route.snapshot.paramMap.get('id');
  }

  goBack() {
    this.navCtrl.back();
  }

  async capturePhoto() {
    this.getPicture(CameraSource.Camera);
  }

  async getPicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      // Save base64 image data to form
      this.formData.photo = image.dataUrl as any;
    } catch (error) {
      console.error('Error getting picture', error);
    }
  }

  async submitObservation() {
    const loader = await this.loadingCtrl.create({
      message: 'Submitting observation...'
    });
    await loader.present();

    const payload = {
      plantation_id: this.plantationId,
      visit_date: this.formData.visitDate,
      remark: this.formData.remark,
      photo: this.formData.photo || ''
    };

    this.dataService.addPlantationObservation(payload).subscribe({
      next: async (res: any) => {
        loader.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Observation submitted successfully!',
          duration: 2000,
          color: 'success'
        });
        toast.present();
        this.goBack();
      },
      error: async (err: any) => {
        loader.dismiss();
        console.error("API failed", err);
        const toast = await this.toastCtrl.create({
          message: 'Failed to submit observation.',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
}
