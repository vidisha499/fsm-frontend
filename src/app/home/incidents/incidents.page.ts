import { Component , OnInit, ViewChild} from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DataService } from '../../data.service';
import { TranslateService } from '@ngx-translate/core'; // Added
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-incident',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  standalone: false,
})
export class IncidentsPage {
  @ViewChild('filterModal') modal!: IonModal;
  public statusFilter: string = 'pending';
  public incidents: any[] = [];
  public startDate: string = '';
public endDate: string = '';
public isFilterOpen: boolean = false;
maxDate: string = new Date().toISOString();
allIncidents: any[] = []; // Isme hamesha original poora data rahega
  filteredIncidents: any[] = [];

  
  filters = {
    location: '',
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

  isModalOpen: boolean = false; // Modal toggle error fix
  today: string = new Date().toISOString(); 

  
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
    this.startDate = new Date().toISOString();
    this.endDate = new Date().toISOString();
    this.apiUrl = this.vercelUrl;
  }

  ionViewWillEnter() {
    this.loadIncidents();
  }

  // async loadIncidents() {
  //   const rangerId = localStorage.getItem('ranger_id');
  //   if (!rangerId) return;

  //   const msg = await this.translate.get('INCIDENTS.FETCHING').toPromise();
  //   const loader = await this.loadingCtrl.create({
  //     message: msg,
  //     spinner: 'crescent',
  //     mode: 'ios'
  //   });
  //   await loader.present();

  //   this.http.get(`${this.apiUrl}/my-reports/${rangerId}`)
  //     .subscribe({
  //       next: (data: any) => { 
  //         this.incidents = data.map((incident: any) => {
  //           return {
  //             ...incident,
  //             photos: Array.isArray(incident.photos) ? incident.photos : JSON.parse(incident.photos || '[]')
  //           };
  //         }); 
  //         loader.dismiss(); 
  //       },
  //       error: (err) => { 
  //         loader.dismiss();
  //         this.translate.get('INCIDENTS.LOAD_ERROR').subscribe(m => this.presentToast(m, 'warning'));
  //       }
  //     });
  // }

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
        const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 mins

        const mappedData = data.map((incident: any) => {
          // Asli Fix: Backend time se 5.5 hours minus karke IST par laao
          const utcDate = new Date(incident.createdAt);
          const localTimeAdjusted = new Date(utcDate.getTime() - IST_OFFSET);
          
          return {
            ...incident,
            // Ab ye localDate filter aur display dono ke liye "Feb 23" dikhayegi
            createdAt: localTimeAdjusted.toISOString(), 
            localDate: localTimeAdjusted,
            photos: Array.isArray(incident.photos) ? incident.photos : JSON.parse(incident.photos || '[]')
          };
        }); 
        
        this.allIncidents = [...mappedData]; 
        this.incidents = [...mappedData]; 
        
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
  
  // 1. Trim aur UpperCase karein
  // 2. Spaces ko underscore se badlein
  // 3. Dot (.) ko underscore se badlein (Kyunki translation keys mein dots problem karte hain)
  return val.toString().trim().toUpperCase().replace(/\s+/g, '_').replace(/\./g, '_');
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

  // formatDate(dateString: string) {
  //   if (!dateString) return '';
  //   const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  //   return new Date(dateString).toLocaleDateString(undefined, options);
  // }

formatDate(dateString: string) {
  if (!dateString) return '';
  
  let date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  // Offset hatayein kyunki loadIncidents() ne pehle hi adjust kar diya hai
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-IN', options);
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


toggleFilter() {
  this.isFilterOpen = !this.isFilterOpen;
}

// 2. applyFilter function ko aise update karo
applyFilters() {
  const start = new Date(this.startDate);
  start.setHours(0, 0, 0, 0); // Din ki shuruat

  const end = new Date(this.endDate);
  end.setHours(23, 59, 59, 999); // Din ka anth (taaki raat ke reports miss na hon)

  this.incidents = this.allIncidents.filter(item => {
    // item.localDate ab 100% India ke time par set hai
    const itemDate = new Date(item.localDate);
    return itemDate >= start && itemDate <= end;
  });

  if (this.modal) {
    this.modal.dismiss();
  }
}


// 3. clearFilter function ko aise update karo
resetFilters() {
  this.startDate = new Date().toISOString();
  this.endDate = new Date().toISOString();
  // Wapas saara data 'incidents' mein daal do
  this.incidents = [...this.allIncidents];
  if (this.modal) {
    this.modal.dismiss();
  }
}

}