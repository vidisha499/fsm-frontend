import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { DataService } from '../../../data.service';

@Component({
  selector: 'app-plantation-detail',
  templateUrl: './plantation-detail.page.html',
  styleUrls: ['./plantation-detail.page.scss'],
  standalone: false
})
export class PlantationDetailPage implements OnInit {
  plantationId: any = null;
  plantation: any = null;
  loading: boolean = true;
  userRole: any = localStorage.getItem('role_id');

  milestones = [
    { id: 'IDENTIFICATION', label: 'IDENTIFICATION' },
    { id: 'PLANNING', label: 'PLANNING' },
    { id: 'PLANTING', label: 'PLANTING' },
    { id: 'FENCING', label: 'FENCING' },
    { id: 'COMPLETED', label: 'COMPLETED' }
  ];

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.plantationId = this.route.snapshot.paramMap.get('id');
    if (this.plantationId) {
      this.loadDetails();
    }
  }

  async loadDetails() {
    this.loading = true;
    this.dataService.getPlantationDetails(this.plantationId).subscribe({
      next: (res: any) => {
        this.plantation = res?.data || res;
        this.loading = false;
      },
      error: (err: any) => {
        console.error("Error loading details", err);
        this.loading = false;
      }
    });
  }

  getCurrentMilestoneIndex() {
    if (!this.plantation?.status) return 0;
    const idx = this.milestones.findIndex(m => m.id === this.plantation.status);
    return idx === -1 ? 0 : idx;
  }

  async handleAction(action: 'APPROVE' | 'REJECT') {
    const loader = await this.loadingCtrl.create({
      message: `${action === 'APPROVE' ? 'Approving' : 'Rejecting'} plantation...`
    });
    await loader.present();

    this.dataService.updatePlantationStatus(this.plantationId, action === 'APPROVE' ? 'Approved' : 'Rejected').subscribe({
      next: async (res: any) => {
        loader.dismiss();
        const toast = await this.toastCtrl.create({
          message: `Plantation ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully!`,
          duration: 2000,
          color: action === 'APPROVE' ? 'success' : 'danger'
        });
        toast.present();
        this.loadDetails();
      },
      error: (err: any) => {
        loader.dismiss();
        console.error("Error updating status", err);
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  refreshData() {
    this.loadDetails();
  }
}
