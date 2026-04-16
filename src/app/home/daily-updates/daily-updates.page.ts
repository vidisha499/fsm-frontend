import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/data.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-daily-updates',
  templateUrl: './daily-updates.page.html',
  styleUrls: ['./daily-updates.page.scss'],
  standalone: false
})
export class DailyUpdatesPage implements OnInit {
  updates: any[] = [];
  newUpdate: string = '';
  isFetching: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private dataService: DataService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadUpdates();
  }

  loadUpdates() {
    this.isFetching = true;
    this.errorMessage = '';
    this.dataService.getUpdates().subscribe({
      next: (res: any) => {
        this.isFetching = false;
        this.updates = res.data || res || [];
      },
      error: (err) => {
        this.isFetching = false;
        console.error('getUpdates error:', err);
        this.errorMessage = 'Server is not responding. This feature will be available once the API is active.';
      }
    });
  }

  async submitUpdate() {
    if (!this.newUpdate.trim()) return;
    this.isSubmitting = true;

    const payload = {
      message: this.newUpdate,
      company_id: localStorage.getItem('company_id') || '',
      user_id: localStorage.getItem('ranger_id') || ''
    };

    this.dataService.postUpdate(payload).subscribe({
      next: async (res: any) => {
        this.isSubmitting = false;
        this.newUpdate = '';
        
        const toast = await this.toastCtrl.create({
          message: 'Update posted successfully!',
          duration: 2000,
          color: 'success',
          position: 'top',
          mode: 'ios'
        });
        toast.present();
        
        // Refresh list
        this.loadUpdates();
      },
      error: async (err) => {
        this.isSubmitting = false;
        console.error('postUpdate error:', err);
        const toast = await this.toastCtrl.create({
          message: 'Failed to post update. Server may be unavailable.',
          duration: 2500,
          color: 'danger',
          position: 'top',
          mode: 'ios'
        });
        toast.present();
      }
    });
  }
}
