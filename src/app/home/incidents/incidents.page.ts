import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-incident',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  standalone: false,
})
export class IncidentsPage {
  public statusFilter: string = 'pending';
  public incidents: any[] = [];
  
  // 1. Updated Vercel link
  private vercelUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/incidents';
  private apiUrl: string = '';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform
  ) {
    // 2. Consistent URL logic across all platforms
    this.apiUrl = this.vercelUrl;
  }

  ionViewWillEnter() {
    this.loadIncidents();
  }

  async loadIncidents() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    const loader = await this.loadingCtrl.create({
      message: 'Fetching reports from Vercel...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/my-reports/${rangerId}`)
      .subscribe({
        next: (data: any) => { 
          this.incidents = data; 
          loader.dismiss(); 
        },
        error: (err) => { 
          console.error('Fetch failed', err); 
          loader.dismiss();
          this.presentToast('Could not load reports. Is the server live?', 'warning');
        }
      });
  }

  async confirmDelete(incidentId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to remove this report from the database?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => { this.deleteIncident(incidentId); }
        }
      ]
    });
    await alert.present();
  }

  async deleteIncident(id: number) {
    const loader = await this.loadingCtrl.create({
      message: 'Deleting report...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

    this.http.delete(`${this.apiUrl}/${id}`)
      .subscribe({
        next: async (res: any) => {
          await loader.dismiss();
          this.incidents = this.incidents.filter(item => item.id !== id);
          this.presentToast('Incident deleted successfully', 'danger');
        },
        error: async (err) => { 
          await loader.dismiss();
          console.error('Delete failed', err); 
          this.presentToast('Failed to delete record. Check server connection.', 'warning');
        }
      });
  }

  goBack() { this.navCtrl.back(); }

  formatDate(dateString: string) {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Helper for consistent feedback
  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }
}