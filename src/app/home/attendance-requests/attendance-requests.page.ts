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
    const roleId = localStorage.getItem('user_role');
    // If Admin/SuperAdmin, go to /admin. Otherwise /home.
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
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
        
        // Data assignment - Handling both raw array and status/data object
        let sortedData: any[] = [];
        if (Array.isArray(res)) {
          sortedData = res;
        } else if (res) {
          const reqs = Array.isArray(res.requests) ? res.requests : [];
          const onsites = Array.isArray(res.onsite) ? res.onsite : [];
          const dataArr = Array.isArray(res.data) ? res.data : [];
          
          if (reqs.length > 0 || onsites.length > 0) {
            sortedData = [...reqs, ...onsites];
          } else if (dataArr.length > 0) {
            sortedData = dataArr;
          } else {
            const firstArray = Object.values(res).find(v => Array.isArray(v)) as any[];
            if (firstArray) sortedData = firstArray;
          }
        }
        
        this.pendingRequests = sortedData.filter((req: any) => {
          const status = (req.status || '').toLowerCase();
          const remark = (req.remark || '').toLowerCase();
          
          // 1. Show all pending or requested items
          if (status === 'pending' || status === 'requested' || status === '' || status === 'success') {
            return true;
          }

          // 2. Auto-approved requests stay in the list (so admin can still Reject them if needed)
          // 3. Manually approved requests (remark: 'onsite attendance') will now disappear from this list
          if (status === 'approved') {
            return remark !== 'onsite attendance'; 
          }

          return false;
        }).map((req: any) => {
          // --- 📍 DIRECT DATABASE MAPPING ---
          // Just ensure it's lowercase for our UI checks
          req.status = (req.status || 'pending').toLowerCase();
          
          req.displayName = req.guard_name || 'Officer';
          req.displayLocation = req.location || 'Current Location';
          req.displayTime = req.time || 'N/A';
          req.pipeDate = req.entryDateTime || req.timestamp || req.date; 

          return req;
        }).sort((a: any, b: any) => {
          return new Date(b.pipeDate).getTime() - new Date(a.pipeDate).getTime();
        });

        console.log("2. Total Pending Requests:", this.pendingRequests.length);
        console.log("3. UI Mapping Done for:", this.pendingRequests.length, "items");

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

  approveRequest(req: any) {
    const payload = {
      ...req,
      status: 'approved',
      remark: 'Onsite Attendance'
    };

    this.dataService.updateAttendanceRequestStatus(payload).subscribe({
      next: (res: any) => {
        console.log('✅ Update Success:', res);
        this.presentToast('Attendance Approved Successfully', 'success');
        this.loadRequests();
      },
      error: (err: any) => {
        console.error('❌ Update Error:', err);
        this.presentToast('Failed to approve attendance', 'danger');
      }
    });
  }

  rejectRequest(req: any) {
    const payload = {
      ...req,
      status: 'rejected',
      remark: 'Rejected by Admin'
    };

    this.dataService.updateAttendanceRequestStatus(payload).subscribe({
      next: (res: any) => {
        this.presentToast('Attendance Rejected Successfully', 'warning');
        this.loadRequests();
      },
      error: (err: any) => {
        this.presentToast('Failed to reject attendance', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color });
    toast.present();
  }
}