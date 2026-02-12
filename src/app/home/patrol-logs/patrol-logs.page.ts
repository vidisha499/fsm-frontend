import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController } from '@ionic/angular';
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
    private translate: TranslateService
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadPatrolLogs();
  }

  loadPatrolLogs() {
    this.http.get(`${this.apiUrl}/logs`)
      .subscribe({
        next: (data: any) => { this.patrolLogs = data; },
        error: (err) => { console.error('Error fetching logs', err); }
      });
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.selectedMethod = '';
      this.selectedType = '';
    }
  }

  /**
   * Validates selections and navigates.
   * Modal is closed explicitly here to ensure it disappears.
   */
  async savePatrol() {
    // 1. Validation check
    if (!this.selectedMethod || !this.selectedType) {
      const toast = await this.toastCtrl.create({
        message: 'Please select both Method and Type before starting.',
        duration: 2000,
        color: 'warning',
        position: 'bottom'
      });
      await toast.present();
      return; 
    }

    // 2. Prepare data
    const patrolName = `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`;
    localStorage.setItem('temp_patrol_name', patrolName);
    
    // 3. Close the modal FIRST
    // This triggers the dismissal of the ion-modal UI component
    this.isModalOpen = false;

    // 4. Navigate to the active patrol page
    // We use a slight delay or the router promise to ensure smooth transition
    this.router.navigate(['/patrol-active']).then(() => {
      // Optional: Reset selections for when the user eventually returns
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
            this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
              next: async () => {
                this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
                const toast = await this.toastCtrl.create({
                  message: 'Log deleted successfully',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
              },
              error: (err) => console.error('Delete failed', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() { this.navCtrl.back(); }
}