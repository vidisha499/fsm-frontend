import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DataService } from '../../data.service';
import { TranslateService } from '@ngx-translate/core'; // Added

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
    private router: Router,
    private dataService: DataService,
    private translate: TranslateService // Injected
  ) {
    this.apiUrl = this.vercelUrl;
  }

  ionViewWillEnter() {
    this.loadIncidents();
  }

  async loadIncidents() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    const msg = await this.translate.get('INCIDENTS.FETCHING').toPromise();
    const loader = await this.loadingCtrl.create({
      message: msg,
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/my-reports/${rangerId}`)
      .subscribe({
        next: (data: any) => { 
          this.incidents = data.map((incident: any) => {
            return {
              ...incident,
              photos: Array.isArray(incident.photos) ? incident.photos : JSON.parse(incident.photos || '[]')
            };
          }); 
          loader.dismiss(); 
        },
        error: (err) => { 
          loader.dismiss();
          this.translate.get('INCIDENTS.LOAD_ERROR').subscribe(m => this.presentToast(m, 'warning'));
        }
      });
  }

  // Helper for DB Value Mapping
getTranslationKey(val: string) {
  if (!val) return 'UNKNOWN';
  // Example: "High Priority" -> "HIGH_PRIORITY"
  return val.toUpperCase().replace(/\s+/g, '_');
}

  async confirmDelete(event: Event, incidentId: number) {
    event.stopPropagation();
    
    const header = await this.translate.get('INCIDENTS.CONFIRM_DELETE_HDR').toPromise();
    const message = await this.translate.get('INCIDENTS.CONFIRM_DELETE_MSG').toPromise();
    const cancel = await this.translate.get('INCIDENTS.CANCEL').toPromise();
    const delText = await this.translate.get('INCIDENTS.DELETE').toPromise();

    const alert = await this.alertCtrl.create({
      header: header,
      message: message,
      buttons: [
        { text: cancel, role: 'cancel' },
        {
          text: delText,
          role: 'destructive',
          handler: () => { this.deleteIncident(incidentId); }
        }
      ]
    });
    await alert.present();
  }

  async deleteIncident(id: number) {
    const msg = await this.translate.get('INCIDENTS.DELETING').toPromise();
    const loader = await this.loadingCtrl.create({
      message: msg, spinner: 'circular', mode: 'ios'
    });
    await loader.present();

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: async () => {
        await loader.dismiss();
        this.incidents = this.incidents.filter(item => item.id !== id);
        const successMsg = await this.translate.get('INCIDENTS.DELETE_SUCCESS').toPromise();
        this.presentToast(successMsg, 'danger');
      },
      error: async () => { 
        await loader.dismiss();
        const errMsg = await this.translate.get('INCIDENTS.DELETE_ERROR').toPromise();
        this.presentToast(errMsg, 'warning');
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
    this.dataService.setSelectedIncident(incident);
    this.router.navigate([`/incident-detail/${incident.id}`]);
  }
}