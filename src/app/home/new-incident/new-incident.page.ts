import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {

  public capturedPhoto: string | null = null;
  public incidentData = {
    priority: 'High Priority',
    criteria: 'Fire Warning',
    cause: 'Short Circuit',
    observation: ''
  };

  // 1. Updated Vercel URL
  private apiUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/incidents';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private loadingCtrl: LoadingController // Added for better UX
  ) { }

  ngOnInit() { }

  goBack() {
    this.navCtrl.back();
  }

  async submitReport() {
    const rangerId = localStorage.getItem('ranger_id');
    
    if (!rangerId) {
      this.presentToast('Session expired. Please login.', 'danger');
      return;
    }

    // 2. Add a loader so the user knows the "heavy" photo is uploading to Vercel
    const loader = await this.loadingCtrl.create({
      message: 'Uploading report to server...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    const payload = {
      rangerId: +rangerId,
      photo: this.capturedPhoto, 
      responsePriority: this.incidentData.priority,
      incidentCriteria: this.incidentData.criteria,
      rootCause: this.incidentData.cause,
      fieldObservation: this.incidentData.observation
    };

    // 3. Using the Vercel URL instead of localhost
    this.http.post(this.apiUrl, payload).subscribe({
      next: () => {
        loader.dismiss();
        this.presentToast('Incident reported successfully!', 'success');
        this.navCtrl.back();
      },
      error: (err: any) => { 
        loader.dismiss();
        console.error('Upload failed', err);
        this.presentToast('Upload Failed: Check internet or Vercel logs.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 50, // Reduced quality slightly to speed up Vercel upload
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt
      });

      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
    } catch (error) {
      console.error('Camera closed or failed', error);
    }
  }
}