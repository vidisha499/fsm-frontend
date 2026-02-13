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
  private apiUrl = 'http://localhost:3000/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController, // 1. Inject LoadingController
    private translate: TranslateService,
    private platform: Platform
  ) {
    // Set Dynamic API URL for Browser vs Mobile
    this.apiUrl = this.platform.is('hybrid') 
      ? 'http://10.60.250.89:3000/api/patrols' 
      : 'http://localhost:3000/api/patrols';
  }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadPatrolLogs();
  }

  async loadPatrolLogs() {
    // 2. Add loader for fetching data
    const loader = await this.loadingCtrl.create({
      message: 'Loading patrol history...',
      spinner: 'crescent'
    });
    await loader.present();

    this.http.get(`${this.apiUrl}/logs`)
      .subscribe({
        next: (data: any) => { 
          this.patrolLogs = data; 
          loader.dismiss(); // Stop loader on success
        },
        error: (err) => { 
          console.error('Error fetching logs', err); 
          loader.dismiss(); // Stop loader on error
          this.presentToast('Could not load logs. Check connection.', 'danger');
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

    // Navigation usually doesn't need a loader as it's instant, 
    // but the next page (PatrolActive) will handle its own initialization.
    this.router.navigate(['/patrol-active']).then(() => {
      this.selectedMethod = '';
      this.selectedType = '';
    });
  }

  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: 'Are you sure you want to delete this patrol record?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.processDelete(id); // Move logic to separate function for cleaner loader handling
          }
        }
      ]
    });
    await alert.present();
  }

  private async processDelete(id: number) {
    // 3. Add loader for the delete request
    const loader = await this.loadingCtrl.create({
      message: 'Deleting log...',
      spinner: 'circular',
      mode: 'ios'
    });
    await loader.present();

    this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
      next: async () => {
        loader.dismiss(); // Stop loader
        this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
        this.presentToast('Log deleted successfully', 'success');
      },
      error: (err) => {
        loader.dismiss(); // Stop loader
        console.error('Delete failed', err);
        this.presentToast('Delete failed. Please try again.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack() { this.navCtrl.back(); }
}