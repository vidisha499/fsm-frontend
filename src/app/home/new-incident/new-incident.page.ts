
import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
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

  // 2. Update your constructor to include 'private http: HttpClient'
  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient 
  ) { }

  ngOnInit() { }

  goBack() {
    this.navCtrl.back();
  }

  // 3. Keep ONLY THIS ONE submitReport function. Delete any other copies!
  async submitReport() {
    const rangerId = localStorage.getItem('ranger_id');
    
    if (!rangerId) {
      this.presentToast('Session expired. Please login.', 'danger');
      return;
    }

    const payload = {
      rangerId: +rangerId,
      photo: this.capturedPhoto, 
      responsePriority: this.incidentData.priority,
      incidentCriteria: this.incidentData.criteria,
      rootCause: this.incidentData.cause,
      fieldObservation: this.incidentData.observation
    };

    // Note: We use (err: any) to fix the 'implicitly has an any type' error
    this.http.post('http://localhost:3000/api/incidents', payload).subscribe({
      next: () => {
        this.presentToast('Incident reported successfully!', 'success');
        this.navCtrl.back();
      },
      error: (err: any) => { 
        console.error('Upload failed', err);
        this.presentToast('Server Error: Could not save incident.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Get image as a string
        source: CameraSource.Prompt // Asks user: Gallery or Camera?
      });

      // Save for preview and payload
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
    } catch (error) {
      console.error('Camera closed or failed', error);
    }
  }
}