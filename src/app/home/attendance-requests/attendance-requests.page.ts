import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController, LoadingController } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-attendance-requests',
  templateUrl: './attendance-requests.page.html',
  styleUrls: ['./attendance-requests.page.scss'],
  standalone: false
})
export class AttendanceRequestsPage implements OnInit {
  pendingRequests: any[] = [];
  companyId = localStorage.getItem('company_id');

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
     private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  goBack() {
  // Ye seedha Admin Dashboard par le jayega
  this.navCtrl.navigateRoot('/home/admin'); 
}
  async loadPendingRequests() {
    const loader = await this.loadingCtrl.create({ message: 'Fetching requests...' });
    await loader.present();

    // API Call: Sirf is company ki pending requests lao
    this.http.get<any[]>(`${environment.apiUrl}/onsite-attendance/company/${this.companyId}/pending`).subscribe({
      next: (data) => {
        this.pendingRequests = data;
        loader.dismiss();
      },
      error: () => loader.dismiss()
    });
  }

  async updateStatus(id: number, newStatus: string) {
    const loader = await this.loadingCtrl.create({ message: 'Updating...' });
    await loader.present();

    this.http.patch(`${environment.apiUrl}/onsite-attendance/${id}/status`, { status: newStatus }).subscribe({
      next: () => {
        loader.dismiss();
        this.presentToast(`Attendance ${newStatus} successfully!`, 'success');
        this.loadPendingRequests(); // List refresh karo
      },
      error: () => loader.dismiss()
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color });
    toast.present();
  }

  // attendance-requests.page.ts mein
async loadRequests() {
  const loader = await this.loadingCtrl.create({ message: 'Fetching requests...' });
  await loader.present();

  const companyId = localStorage.getItem('company_id') || '1';
  
  // DataService ka naya function call karein
  this.dataService.getPendingOnsiteRequests(companyId).subscribe({
    next: (res: any) => {
      this.pendingRequests = res;
      console.log("Onsite Data Loaded:", res);
      loader.dismiss();
    },
    error: (err) => {
      console.error("Error fetching onsite data", err);
      loader.dismiss();
      this.presentToast('Failed to load data', 'danger');
    }
  });
}
}