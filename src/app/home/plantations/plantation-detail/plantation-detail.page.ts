import { Component, OnInit, ViewChild } from '@angular/core';
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
  userRole: any = localStorage.getItem('user_role');

  milestones = [
    { id: 'IDENTIFICATION', label: 'IDENTIFICATION' },
    { id: 'PLANNING', label: 'PLANNING' },
    { id: 'PLANTING', label: 'PLANTING' },
    { id: 'FENCING', label: 'FENCING' },
    { id: 'COMPLETED', label: 'COMPLETED' }
  ];

  constructor(
    private route: ActivatedRoute,
    public dataService: DataService,
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
    this.dataService.getPlantationDetail(this.plantationId).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          // If data is an array (e.g., res.data[0]), take the first element, else take the object directly
          this.plantation = Array.isArray(res.data) ? res.data[0] : res.data;
        } else {
          this.plantation = {};
          this.toastCtrl.create({ message: 'No data found for this plantation.', duration: 3000 }).then(t => t.present());
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error("API failed to fetch real data", err);
        this.plantation = {};
        this.loading = false;
        this.toastCtrl.create({ message: 'Failed to fetch real data from server.', duration: 3000, color: 'danger' }).then(t => t.present());
      }
    });
  }

  getMockData() {
    return {
      siteName: 'B12 TEST',
      plantation_code: 'PLT006',
      status: 'IDENTIFICATION',
      totalArea: '9.00',
      soilType: 'Laterite',
      species: '',
      plant_count: '0',
      latitude: 21.1157,
      longitude: 79.0160,
      created_at: '2026-05-11T00:00:00Z',
      fencing_status: 'PENDING',
      observations: []
    };
  }

  getCurrentMilestoneIndex() {
    if (!this.plantation?.status) return 0;
    const idx = this.milestones.findIndex(m => m.id === this.plantation.status);
    return idx === -1 ? 0 : idx;
  }

  showSuccessModal: boolean = false;
  successModalMessage: string = '';

  async handleAction(action: 'APPROVE' | 'REJECT') {
    const loader = await this.loadingCtrl.create({
      message: `${action === 'APPROVE' ? 'Approving' : 'Rejecting'} plantation...`
    });
    await loader.present();

    try {
      if (action === 'APPROVE') {
        await this.dataService.approvePlantation(this.plantationId).toPromise();
      } else {
        await this.dataService.rejectPlantation(this.plantationId).toPromise();
      }

      loader.dismiss();
      
      // Update local state
      if(this.plantation) {
        this.plantation.status = action === 'APPROVE' ? 'Approved' : 'Rejected';
      }

      // Show the new success popup instead of a toast
      this.successModalMessage = `Plantation ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`;
      this.showSuccessModal = true;

    } catch (error) {
      loader.dismiss();
      console.error("Error updating status", error);
      const toast = await this.toastCtrl.create({
        message: `Failed to ${action === 'APPROVE' ? 'approve' : 'reject'} plantation.`,
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  addObservation() {
    this.navCtrl.navigateForward(`/add-observation/${this.plantationId}`);
  }

  @ViewChild('swipeThumb', { static: false }) swipeThumb: any;
  startX: number = 0;
  currentX: number = 0;
  maxSwipe: number = 0;
  isSwiping: boolean = false;

  goBack() {
    this.navCtrl.back();
  }

  refreshData() {
    this.loadDetails();
  }

  // --- SWIPE GESTURE LOGIC ---
  onSwipeStart(event: any) {
    // ONLY ALLOW SWIPE IF APPROVED
    const isApproved = this.plantation?.status === 'Approved' || 
                       this.plantation?.status === 'APPROVED' || 
                       this.plantation?.status === 'APPROVE' || 
                       this.plantation?.status === 1 || 
                       this.plantation?.status === '1' || 
                       this.plantation?.is_approved == 1 || 
                       this.plantation?.is_approved == '1';

    if (!isApproved) {
      this.presentToast('Please wait for Admin approval before updating progress.', 'warning');
      this.isSwiping = false;
      return;
    }

    this.isSwiping = true;
    this.startX = event.touches[0].clientX;
    const containerWidth = event.target.parentElement.offsetWidth;
    const thumbWidth = event.target.offsetWidth;
    this.maxSwipe = containerWidth - thumbWidth - 10; 
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }

  onSwipeMove(event: any) {
    if (!this.isSwiping) return;
    this.currentX = event.touches[0].clientX - this.startX;
    if (this.currentX < 0) this.currentX = 0;
    if (this.currentX > this.maxSwipe) this.currentX = this.maxSwipe;
    
    this.swipeThumb.nativeElement.style.transform = `translateX(${this.currentX}px)`;
  }

  onSwipeEnd(event: any) {
    this.isSwiping = false;
    if (this.currentX >= this.maxSwipe * 0.8) {
      this.swipeThumb.nativeElement.style.transform = `translateX(${this.maxSwipe}px)`;
      setTimeout(() => {
        this.navigateToUpdate();
        // Reset thumb back to start
        this.swipeThumb.nativeElement.style.transform = `translateX(0px)`;
      }, 300);
    } else {
      this.swipeThumb.nativeElement.style.transform = `translateX(0px)`;
    }
  }

  navigateToUpdate() {
    // Pass current plantation data to Add Plantation page for editing
    this.navCtrl.navigateForward('/add-plantation', {
      state: { plantationData: this.plantation }
    });
  }
}
