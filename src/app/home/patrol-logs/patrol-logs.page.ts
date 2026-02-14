import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-patrol-logs',
  templateUrl: './patrol-logs.page.html',
  styleUrls: ['./patrol-logs.page.scss'],
  standalone: false
})
export class PatrolLogsPage implements OnInit {
  public patrolLogs: any[] = [];
  public isModalOpen = false;
  public selectedMethod = '';
  public selectedType = '';

  // 1. Updated Vercel URL
  // private vercelUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/patrols';
  private vercelUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';
  private apiUrl: string = '';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
    private platform: Platform
  ) {
    // 2. Set API URL to Vercel for all platforms
    this.apiUrl = this.vercelUrl;
  }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadPatrolLogs();
  }

  async loadPatrolLogs() {
    // Show loader for fetching data from Vercel
    const loader = await this.loadingCtrl.create({
      message: 'Fetching patrol history...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/logs`)
      .subscribe({
        next: (data: any) => { 
          this.patrolLogs = data; 
          loader.dismiss(); 
        },
        error: (err) => { 
          console.error('Error fetching logs', err); 
          loader.dismiss(); 
          this.presentToast('Could not load logs. Is the server live?', 'danger');
        }
      });
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.selectedMethod = '';
      this.selectedType = '';
    }
  }

  async savePatrol() {
    if (!this.selectedMethod || !this.selectedType) {
      this.presentToast('Please select both Method and Type before starting.', 'warning');
      return; 
    }

    const patrolName = `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`;
    localStorage.setItem('temp_patrol_name', patrolName);
    
    this.isModalOpen = false;

    this.router.navigate(['/patrol-active']).then(() => {
      this.selectedMethod = '';
      this.selectedType = '';
    });
  }

  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: 'Are you sure you want to remove this record from the database?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.processDelete(id);
          }
        }
      ]
    });
    await alert.present();
  }

  private async processDelete(id: number) {
    const loader = await this.loadingCtrl.create({
      message: 'Deleting log from Vercel...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

    this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
      next: async () => {
        loader.dismiss();
        this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
        this.presentToast('Log deleted successfully', 'success');
      },
      error: (err) => {
        loader.dismiss();
        console.error('Delete failed', err);
        this.presentToast('Delete failed. Please try again.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }

 goBack() {
  // navigateRoot ensures /home becomes the top of the stack
  this.navCtrl.navigateRoot('/home'); 
}
}