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
  
  // Dynamic API URL logic
  private apiUrl: string = 'http://localhost:3000/api/incidents';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController, // 1. Inject LoadingController
    private platform: Platform
  ) {
    // Set API URL based on platform
    this.apiUrl = this.platform.is('hybrid') 
      ? 'http://10.60.250.89:3000/api/incidents' 
      : 'http://localhost:3000/api/incidents';
  }

  ionViewWillEnter() {
    this.loadIncidents();
  }

  async loadIncidents() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    // Optional: Add loader for fetching as well
    const loader = await this.loadingCtrl.create({
      message: 'Fetching reports...',
      spinner: 'crescent'
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
        }
      });
  }

  async confirmDelete(incidentId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to remove this report?',
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
    // 2. Create and show loader
    const loader = await this.loadingCtrl.create({
      message: 'Deleting report...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

    this.http.delete(`${this.apiUrl}/${id}`)
      .subscribe({
        next: async (res: any) => {
          // 3. Dismiss loader on success
          await loader.dismiss();
          
          this.incidents = this.incidents.filter(item => item.id !== id);
          
          const toast = await this.toastCtrl.create({
            message: 'Incident deleted successfully',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          toast.present();
        },
        error: async (err) => { 
          // 4. Dismiss loader on error
          await loader.dismiss();
          console.error('Delete failed', err); 
          
          const toast = await this.toastCtrl.create({
            message: 'Failed to delete record. Check connection.',
            duration: 2000,
            color: 'warning'
          });
          toast.present();
        }
      });
  }

  goBack() { this.navCtrl.back(); }

  formatDate(dateString: string) {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
}