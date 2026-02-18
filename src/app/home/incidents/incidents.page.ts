


import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; // 1. Added Router
import { DataService } from '../../data.service'; // 2. Added DataService

@Component({
  selector: 'app-incident',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  standalone: false,
})
export class IncidentsPage {
  public statusFilter: string = 'pending';
  public incidents: any[] = [];
  
  private vercelUrl: string = 'https://forest-backend-pi.vercel.app/api/incidents';
  private apiUrl: string = '';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform,
    private router: Router,       // 3. Inject Router
    private dataService: DataService // 4. Inject DataService
  ) {
    this.apiUrl = this.vercelUrl;
  }

  // // --- NEW FUNCTION: NAVIGATE TO DETAILS ---
  // viewDetails(incident: any) {
  //   console.log('Passing this data:', incident);
  //   // Save the full incident object (including the photo) to the service
  //   this.dataService.setSelectedIncident(incident);
  //   // Navigate to the detail page
  //   // this.router.navigate(['/incident-detail']);
  //   this.router.navigate([`/incident-detail/${incident.id}`]);
  // }

  // --- EXISTING LOGIC ---
  ionViewWillEnter() {
    this.loadIncidents();
  }

  // async loadIncidents() {
  //   const rangerId = localStorage.getItem('ranger_id');
  //   if (!rangerId) return;

  //   const loader = await this.loadingCtrl.create({
  //     message: 'Fetching reports...',
  //     spinner: 'crescent',
  //     mode: 'ios'
  //   });
  //   await loader.present();

  //   this.http.get(`${this.apiUrl}/my-reports/${rangerId}`)
  //     .subscribe({
  //       next: (data: any) => { 
  //         this.incidents = data; 
  //         loader.dismiss(); 
  //       },
  //       error: (err) => { 
  //         console.error('Fetch failed', err); 
  //         loader.dismiss();
  //         this.presentToast('Could not load reports.', 'warning');
  //       }
  //     });
  // }

  async loadIncidents() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    const loader = await this.loadingCtrl.create({
      message: 'Fetching reports...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/my-reports/${rangerId}`)
      .subscribe({
        next: (data: any) => { 
          // Ensure photos are treated as an array for each incident
          this.incidents = data.map((incident: any) => {
            return {
              ...incident,
              // If your DB stores it as a string, parse it; otherwise, ensure it's an array
              photos: Array.isArray(incident.photos) ? incident.photos : JSON.parse(incident.photos || '[]')
              
            };
          }); 
          loader.dismiss(); 
        },
        error: (err) => { 
          console.error('Fetch failed', err); 
          loader.dismiss();
          this.presentToast('Could not load reports.', 'warning');
        }
      });
  }

 async confirmDelete(event: Event, incidentId: number) {
  event.stopPropagation(); // This prevents the card's (click) from firing
  
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
          this.presentToast('Failed to delete record.', 'warning');
        }
      });
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }

  formatDate(dateString: string) {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, color, position: 'bottom', mode: 'ios'
    });
    toast.present();
  }

  viewDetails(incident: any) {
    // This incident now has the full photos array attached
    this.dataService.setSelectedIncident(incident);
    this.router.navigate([`/incident-detail/${incident.id}`]);
  }
}