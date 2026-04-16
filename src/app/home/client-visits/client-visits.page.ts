import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/data.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-client-visits',
  templateUrl: './client-visits.page.html',
  styleUrls: ['./client-visits.page.scss'],
  standalone: false
})
export class ClientVisitsPage implements OnInit {
  visits: any[] = [];
  followUps: any[] = [];
  isFetching: boolean = false;
  errorMessage: string = '';
  activeTab: string = 'visits'; // 'visits' | 'followups'
  
  // New Visit Form
  showForm: boolean = false;
  newVisit: any = {
    client_name: '',
    location: '',
    purpose: '',
    notes: ''
  };
  isSubmitting: boolean = false;

  constructor(
    private dataService: DataService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.loadVisits();
  }

  loadVisits() {
    this.isFetching = true;
    this.errorMessage = '';
    this.dataService.getClientVisits().subscribe({
      next: (res: any) => {
        this.isFetching = false;
        this.visits = res.data || res || [];
      },
      error: (err) => {
        this.isFetching = false;
        console.error('getClientVisits error:', err);
        this.errorMessage = 'Server is not responding. This feature will be available once the API is active.';
      }
    });
  }

  loadFollowUps() {
    this.isFetching = true;
    this.errorMessage = '';
    this.dataService.getClientFollowUps().subscribe({
      next: (res: any) => {
        this.isFetching = false;
        this.followUps = res.data || res || [];
      },
      error: (err) => {
        this.isFetching = false;
        console.error('getClientFollowUps error:', err);
        this.errorMessage = 'Server is not responding.';
      }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.errorMessage = '';
    if (tab === 'visits') this.loadVisits();
    else this.loadFollowUps();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.newVisit = { client_name: '', location: '', purpose: '', notes: '' };
    }
  }

  async submitVisit() {
    if (!this.newVisit.client_name?.trim()) return;
    this.isSubmitting = true;

    this.dataService.addClientVisit(this.newVisit).subscribe({
      next: async (res: any) => {
        this.isSubmitting = false;
        this.showForm = false;
        const toast = await this.toastCtrl.create({
          message: 'Visit added successfully!', duration: 2000, color: 'success', position: 'top', mode: 'ios'
        });
        toast.present();
        this.loadVisits();
      },
      error: async (err) => {
        this.isSubmitting = false;
        console.error('addClientVisit error:', err);
        const toast = await this.toastCtrl.create({
          message: 'Failed to add visit. Server may be unavailable.',
          duration: 2500, color: 'danger', position: 'top', mode: 'ios'
        });
        toast.present();
      }
    });
  }

  async confirmDelete(visit: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Visit',
      message: 'Are you sure you want to delete this visit record?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', cssClass: 'danger', handler: () => this.deleteVisit(visit) }
      ]
    });
    await alert.present();
  }

  deleteVisit(visit: any) {
    this.dataService.deleteFieldVisit(visit.id).subscribe({
      next: () => this.loadVisits(),
      error: (err) => console.error('deleteFieldVisit error:', err)
    });
  }
}
