import { Component , OnInit, ViewChild} from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DataService } from '../../data.service';
import { TranslateService } from '@ngx-translate/core'; // Added
import { IonModal } from '@ionic/angular';
import { environment } from 'src/environments/environment';

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
  }

  ionViewWillEnter() {
    this.loadIncidents();
  }



async loadIncidents() {
  const companyId = localStorage.getItem('company_id');
  if (!companyId) return;

  const msg = await this.translate.get('INCIDENTS.FETCHING').toPromise();
  const loader = await this.loadingCtrl.create({
    message: msg,
    spinner: 'crescent',
    mode: 'ios'
  });
  await loader.present();

  this.dataService.getForestReports()
    .subscribe({
      next: (res: any) => { 
        const incidentsList = Array.isArray(res) ? res : (res.data || []);
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const mappedData = incidentsList.map((incident: any) => {
          const utcDate = new Date(incident.createdAt);
          const localTimeAdjusted = new Date(utcDate.getTime() - IST_OFFSET);
          
          // --- IMAGE PREFIX LOGIC ---
          let rawPhotos = Array.isArray(incident.photos) ? incident.photos : JSON.parse(incident.photos || '[]');
          
          // Har thumbnail ke aage prefix lagao agar missing hai
          const formattedPhotos = rawPhotos.map((p: string) => 
            p.startsWith('data:image') ? p : `data:image/jpeg;base64,${p}`
          );

          return {
            ...incident,
            createdAt: localTimeAdjusted.toISOString(), 
            localDate: localTimeAdjusted,
            photos: formattedPhotos,
            thumbnail: formattedPhotos[0] || null // List mein dikhane ke liye pehli photo
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

    this.dataService.deleteForestReport(id).subscribe({
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

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }

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