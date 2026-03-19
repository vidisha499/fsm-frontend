



import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { MenuController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
// Ensure this path matches where you created the new page

import { EventsTriggeredAdminPage } from '../events-triggered-admin/events-triggered-admin.page';
import { ViewAttendanceAdminPage } from '../view-attendance-admin/view-attendance-admin.page';
import { TodaysPatrolsAdminPage } from '../todays-patrols-admin/todays-patrols-admin.page';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false,
})
// Change SuperAdminPage to AdminPage
export class AdminPage implements OnInit {
  unreadAlertCount: number = 0;
  attendanceCount: number = 0;
  public displayName: string = ''; // Generic name variable
  totalRangers: number = 0;
  attendancePercentage: number = 0;
  // public displayRole: string = '';
  // public userPhoto: string | null = null;
  public rangerName: string = '';
  public rangerDivision: string = '';
  public userPhoto: string | null = null;
  public companyId: string | null = null;


  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private menuCtrl: MenuController ,// Added ModalController
    private cdr: ChangeDetectorRef,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.fetchDashboardStats();
  }

  ionViewWillEnter() {
    this.loadUserData();
    this.fetchDashboardStats();
  }

// admin.page.ts mein fetchDashboardStats update karein
// fetchDashboardStats() {
//   const companyId = localStorage.getItem('company_id');
//   if (!companyId) return;

//   // 1. Total Rangers fetch karein
//   this.dataService.getRangersByCompany(companyId).subscribe({
//     next: (rangers: any) => {
//       this.totalRangers = rangers.length || 0;
      
//       // 2. Attendance fetch karein (Sirf jab rangers mil jayein)
//       this.dataService.getAttendanceByCompany(companyId).subscribe({
//         next: (attendance: any) => {
//           this.attendanceCount = attendance.length || 0;
          
//           // 3. Percentage Calculation
//           if (this.totalRangers > 0) {
//             this.attendancePercentage = Math.round((this.attendanceCount / this.totalRangers) * 100);
//           } else {
//             this.attendancePercentage = 0;
//           }
//           this.cdr.detectChanges();
//         }
//       });
//     },
//     error: (err) => {
//       console.error("Dashboard error:", err);
//       // Agar API fail ho jaye toh 0 dikhaye, page white na ho
//       this.totalRangers = 0;
//       this.attendancePercentage = 0;
//       this.cdr.detectChanges();
//     }
//   });
// }

fetchDashboardStats() {
  const companyId = localStorage.getItem('company_id');
  if (!companyId) return;

  // 1. Total Rangers fetch karein
  this.dataService.getRangersByCompany(companyId).subscribe({
    next: (rangers: any) => {
      this.totalRangers = rangers.length || 0;
      
      // 2. Regular Attendance fetch karein
      this.dataService.getAttendanceByCompany(companyId).subscribe({
        next: (regAttendance: any) => {
          const regCount = Array.isArray(regAttendance) ? regAttendance.length : 0;

          // 3. Approved Onsite Attendance fetch karein
          // Note: Backend endpoint match hona chahiye (/pending hata kar)
          this.dataService.getApprovedOnsiteByCompany(companyId).subscribe({
            next: (onsiteAttendance: any) => {
              const onsiteData = Array.isArray(onsiteAttendance) ? onsiteAttendance : [];
              // Sirf 'approved' wale count karein
              const approvedOnsiteCount = onsiteData.filter((log: any) => log.status === 'approved').length;

              // 4. Total Calculation (Regular + Approved Onsite)
              this.attendanceCount = regCount + approvedOnsiteCount;
              
              if (this.totalRangers > 0) {
                this.attendancePercentage = Math.round((this.attendanceCount / this.totalRangers) * 100);
              } else {
                this.attendancePercentage = 0;
              }

              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error("Onsite count error:", err);
              // Agar onsite fail ho toh sirf regular dikhaye
              this.attendanceCount = regCount;
              this.cdr.detectChanges();
            }
          });
        }
      });
    },
    error: (err) => {
      console.error("Dashboard error:", err);
      this.totalRangers = 0;
      this.attendancePercentage = 0;
      this.cdr.detectChanges();
    }
  });
}

toggleMenu() {
    // This 'main-menu' now matches the ID we added above
    this.menuCtrl.open('main-menu'); 
}

  goToPage(path: string) {
    this.router.navigate([`/home/admin/${path}`]);
  }

  // loadUserData() {
  //   // Login ke waqt set kiya gaya data fetch karein
  //   this.rangerName = localStorage.getItem('ranger_username') || 'User';
  //   this.rangerDivision = localStorage.getItem('ranger_division') || 'Forest Dept';
  //   this.userPhoto = localStorage.getItem('user_photo');
  //   this.companyId = localStorage.getItem('company_id');

  //   console.log("Logged in user:", this.rangerName);
  //   this.cdr.detectChanges(); // UI update force karne ke liye
  // }

  loadUserData() {
  // Same key use karni hai jo app.component mein hai
  this.rangerName = localStorage.getItem('ranger_username') || 'Admin';
  this.rangerDivision = localStorage.getItem('ranger_division') || 'Forest Dept';
  this.companyId = localStorage.getItem('company_id');
  this.cdr.detectChanges();
}

  openSettings() {
    // Logic to show settings view
  }

  openProfile() {
    // Logic to show profile
  }


 async openEvents() {
    const modal = await this.modalCtrl.create({
      component: EventsTriggeredAdminPage,
      cssClass: 'custom-modal-canvas'
    });
    return await modal.present();
  }

  async openPatrols() {
    const modal = await this.modalCtrl.create({
      component: TodaysPatrolsAdminPage,
      cssClass: 'custom-modal-canvas' 
    });
    return await modal.present();
  }

  getFirstLetter(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?';
}

getAvatarColor(name: string): string {
  const colors = ['#0d9488', '#1e293b', '#4338ca', '#b91c1c', '#c2410c'];
  if (!name) return colors[0];
  const index = name.length % colors.length;
  return colors[index];
}

async openAttendance() {
  const modal = await this.modalCtrl.create({
    component: ViewAttendanceAdminPage,
    cssClass: 'attendance-modal',
    componentProps: {
      adminCompanyId: this.companyId// 👈 Ye dashboard se uthayi hui ID bhej raha hai
    }
  });
  
  return await modal.present();
}


}