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
        // 🔍 DEBUG: Print all statuses to see what backend returns
        console.log('🔍 All record statuses:', sortedData.map((r: any) => ({ id: r.id, status: r.status, type: typeof r.status })));
        
        // Show ALL requests - admin should see everything
        // 1. No Filter - Show everything from API
        const filtered = sortedData;
        console.log("🔍 After Filter (No Filter):", filtered.length);

        // 2. Map Step
        const mapped = filtered.map((req: any) => {
          const raw = String(req.status || 'pending').toLowerCase().trim();
          if (raw === 'approved') {
            req.status = 'approved';
          } else if (raw === 'rejected' || raw === '0') {
            req.status = 'rejected';
          } else {
            req.status = 'pending';
          }
          
          req.displayName = req.guard_name || req.name || 'Officer';
          req.displayLocation = this.parseLocation(req.location) || 'Current Location';
          req.displayTime = req.time || req.entry_time || 'N/A';
          req.pipeDate = req.entryDateTime || req.timestamp || req.date || new Date().toISOString(); 

          return req;
        });
        console.log("🔍 After Map:", mapped.length);

        // 3. Sort Step
        this.pendingRequests = mapped.sort((a: any, b: any) => {
          const timeA = new Date(a.pipeDate).getTime() || 0;
          const timeB = new Date(b.pipeDate).getTime() || 0;
          return timeB - timeA;
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

  private parseLocation(loc: any): string {
    if (!loc) return '';
    if (typeof loc !== 'string') return String(loc);
    try {
      const parsed = JSON.parse(loc);
      return parsed.name || parsed.address || `${parsed.lat}, ${parsed.lng}`;
    } catch (e) {
      return loc;
    }
  }
}