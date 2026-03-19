// import { Component, OnInit ,ChangeDetectorRef} from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { environment } from 'src/environments/environment';
// import { ToastController, LoadingController, NavController } from '@ionic/angular';
// import { DataService } from 'src/app/data.service';

// @Component({
//   selector: 'app-attendance-requests',
//   templateUrl: './attendance-requests.page.html',
//   styleUrls: ['./attendance-requests.page.scss'],
//   standalone: false
// })
// export class AttendanceRequestsPage implements OnInit {
//   pendingRequests: any[] = [];

//   constructor(
//     private http: HttpClient,
//     private toastCtrl: ToastController,
//     private loadingCtrl: LoadingController,
//     private navCtrl: NavController,
//     private dataService: DataService,
//     private cdr: ChangeDetectorRef
//   ) {}

//   ngOnInit() {
//     this.loadRequests();
//   }

//   goBack() {
//     this.navCtrl.navigateRoot('/home/admin'); 
//   }

//   async loadRequests() {
//     const loader = await this.loadingCtrl.create({ message: 'Fetching requests...' });
//     await loader.present();

//     const companyId = localStorage.getItem('company_id'); 
//     console.log("Fetching for Company ID:", companyId);

//     if (!companyId) {
//       loader.dismiss();
//       this.presentToast('No Company ID found', 'warning');
//       return;
//     }

//     this.dataService.getPendingOnsiteRequests(companyId).subscribe({
//       next: (res: any) => {
//         console.log("Data Loaded into pendingRequests:", res);
//         // Data ko sort kar rahe hain taaki naya wala sabse upar dikhe
//         this.cdr.detectChanges();
//         this.pendingRequests = res.sort((a: any, b: any) => {
//           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//         });
//         loader.dismiss();
//       },
//       error: (err) => {
//         console.error("API Error:", err);
//         loader.dismiss();
//         this.presentToast('Failed to load data', 'danger');
//       }
//     });
//   }

//   async updateStatus(id: number, newStatus: string) {
//     const loader = await this.loadingCtrl.create({ message: `Marking as ${newStatus}...` });
//     await loader.present();

//     // Backend URL confirm karein: onsite-attendance/:id/status
//     this.http.patch(`${environment.apiUrl}/onsite-attendance/${id}/status`, { status: newStatus }).subscribe({
//       next: () => {
//         loader.dismiss();
//         this.presentToast(`Attendance ${newStatus} successfully!`, 'success');
//         // FIX: Purane function ki jagah naya loadRequests() call karein
//         this.loadRequests(); 
//       },
//       error: (err) => {
//         console.error("Update Error:", err);
//         loader.dismiss();
//         this.presentToast('Failed to update status', 'danger');
//       }
//     });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({ message, duration: 2000, color });
//     toast.present();
//   }
// }

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController, LoadingController, NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-attendance-requests',
  templateUrl: './attendance-requests.page.html',
  styleUrls: ['./attendance-requests.page.scss'],
  standalone: false
})
export class AttendanceRequestsPage implements OnInit {
  pendingRequests: any[] = [];

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private dataService: DataService,
    private cdr: ChangeDetectorRef // Required for forcing UI update
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  // Page refresh hone par bhi data load ho
  ionViewWillEnter() {
    
  console.log("Page entered, refreshing data...");
  this.loadRequests();
   
  }

  goBack() {
    this.navCtrl.navigateRoot('/home/admin'); 
  }

  async loadRequests() {
    const loader = await this.loadingCtrl.create({ message: 'Fetching requests...' });
    await loader.present();

    const companyId = localStorage.getItem('company_id'); 
    
    if (!companyId) {
      loader.dismiss();
      this.presentToast('No Company ID found', 'warning');
      return;
    }

    this.dataService.getPendingOnsiteRequests(companyId).subscribe({
      next: (res: any) => {
        console.log("1. Raw Data from API:", res);
        
        // Data assignment
        const sortedData = Array.isArray(res) ? res : [];
        this.pendingRequests = sortedData.sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        console.log("2. Assigned to variable:", this.pendingRequests.length);

        // --- CRITICAL FIX START ---
        setTimeout(() => {
          this.cdr.detectChanges(); // Force Angular to re-render the *ngFor
          console.log("3. UI Change Detection Triggered");
        }, 100);
        // --- CRITICAL FIX END ---

        loader.dismiss();
      },
      error: (err) => {
        console.error("API Error:", err);
        loader.dismiss();
        this.presentToast('Failed to load data', 'danger');
      }
    });
  }

  async updateStatus(id: number, newStatus: string) {
    const loader = await this.loadingCtrl.create({ message: `Processing...` });
    await loader.present();

    // DataService ka hi function use karein taaki clean rahe
    this.dataService.updateOnsiteStatus(id, newStatus as any).subscribe({
      next: () => {
        loader.dismiss();
        this.presentToast(`Attendance ${newStatus} successfully!`, 'success');
        this.loadRequests(); // Refresh the list
      },
      error: (err) => {
        console.error("Update Error:", err);
        loader.dismiss();
        this.presentToast('Failed to update status', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color });
    toast.present();
  }
}