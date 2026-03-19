// import { Component, OnInit } from '@angular/core';
// import { NavController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { DataService } from 'src/app/data.service';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-todays-patrols-admin',
//   templateUrl: './todays-patrols-admin.page.html',
//   styleUrls: ['./todays-patrols-admin.page.scss'],
//   standalone: false
// })
// export class TodaysPatrolsAdminPage implements OnInit {
//   allPatrols: any[] = [];
//   filteredPatrols: any[] = [];
//   isLoading: boolean = true;

//   constructor(
//     private navCtrl: NavController,
//     private http: HttpClient,
//     private dataService: DataService,
//     private router: Router
//   ) {}

//   ngOnInit() {
//     this.loadTodayPatrols();
//   }

//   ionViewWillEnter() {
//     this.loadTodayPatrols();
//   }



//  loadTodayPatrols() {
//   const companyId = localStorage.getItem('company_id');
//   const todayDateStr = new Date().toISOString().split('T')[0]; 

//   if (companyId) {
//     this.isLoading = true;
//     this.dataService.getPatrolsByCompany(Number(companyId)).subscribe({
//       next: (data: any) => {
//         this.filteredPatrols = data.filter((p: any) => {
//           // 1. Check Company (Allowing null for now so you can see your data)
//           const isCompany = !p.companyId || Number(p.companyId) === Number(companyId);
          
//           // 2. Use 'createdAt' (matching your console log) instead of 'created_at'
//           const patrolDate = p.createdAt ? p.createdAt.split('T')[0] : 
//                             (p.created_at ? p.created_at.split('T')[0] : 'No Date');
          
//           const isToday = patrolDate === todayDateStr;
          
//           return isCompany && isToday;
//         }).sort((a: any, b: any) => b.id - a.id);
        
//         this.isLoading = false;
//       },
//       error: () => this.isLoading = false
//     });
//   }
// }
  
// goBack() {
//   // navigateBack ensures the transition goes from Left to Right
//   this.navCtrl.navigateBack('/admin', {
//     animated: true,
//     animationDirection: 'back'
//   });
// }




//   doRefresh(event: any) {
//     this.loadTodayPatrols();
//     setTimeout(() => event.target.complete(), 1000);
//   }
//   // Add this inside your TodaysPatrolsAdminPage class
// viewPatrolDetails(patrolId: number) {
//   // This navigates to the details page and passes the ID in the URL
//   this.navCtrl.navigateForward([`/todays-patrol-details-admin/${patrolId}`]);
// }

//   // Helper to calculate patrol duration
//   calculateDuration(start: string, end: string) {
//     if (!start || !end) return 'Active';
//     const startTime = new Date(start).getTime();
//     const endTime = new Date(end).getTime();
//     const minutes = Math.floor((endTime - startTime) / 60000);
//     return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
//   }
// }


import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { DataService } from 'src/app/data.service';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-todays-patrols-admin',
  templateUrl: './todays-patrols-admin.page.html',
  styleUrls: ['./todays-patrols-admin.page.scss'],
  standalone: false
})
export class TodaysPatrolsAdminPage implements OnInit {
  allPatrols: any[] = [];
  filteredPatrols: any[] = [];
  isLoading: boolean = true;

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private dataService: DataService,
    private router: Router,
    private modalCtrl: ModalController,
  ) {}

  ngOnInit() {
    this.loadTodayPatrols();
    
  }

  ionViewWillEnter() {
    this.loadTodayPatrols();
  console.log('--- Details Page: ionViewWillEnter (Page is about to show) ---');

  }

  ionViewDidEnter() {
  console.log('--- Details Page: ionViewDidEnter (Page is now visible) ---');
}

  loadTodayPatrols() {
    const companyId = localStorage.getItem('company_id');
    const todayDateStr = new Date().toISOString().split('T')[0]; 

    if (companyId) {
      this.isLoading = true;
      this.dataService.getPatrolsByCompany(Number(companyId)).subscribe({
        next: (data: any) => {
          this.filteredPatrols = data.filter((p: any) => {
            const isCompany = !p.companyId || Number(p.companyId) === Number(companyId);
            const patrolDate = p.createdAt ? p.createdAt.split('T')[0] : 
                              (p.created_at ? p.created_at.split('T')[0] : 'No Date');
            
            const isToday = patrolDate === todayDateStr;
            return isCompany && isToday;
          }).sort((a: any, b: any) => b.id - a.id);
          
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
    }
  }
  
// goBack(event?: any) {
//   if (event) {
//     event.stopPropagation(); // Prevents the click from hitting layers underneath
//   }
//   this.navCtrl.navigateBack('/home/admin', {
//     animated: true,
//     animationDirection: 'back'
//   });
// }

 dismiss() {
    this.modalCtrl.dismiss();
  }

  doRefresh(event: any) {
    this.loadTodayPatrols();
    setTimeout(() => event.target.complete(), 1000);
  }

viewPatrolDetails(patrolId: number) {
  // Use a string with a leading slash to ensure it's treated as a root-relative path
  this.navCtrl.navigateForward(`/home/todays-patrols-details-admin/${patrolId}`);
}

// viewPatrolDetails(patrolId: number) {
//   const targetUrl = `/home/todays-patrols-details-admin/${patrolId}`;
//   console.log('--- Navigation Start ---');
//   console.log('Target ID:', patrolId);
//   console.log('Target URL:', targetUrl);

//   this.navCtrl.navigateForward(targetUrl).then((res) => {
//     console.log('Navigation Result (Success?):', res);
//   }).catch(err => {
//     console.error('Navigation Error:', err);
//   });
// }

  calculateDuration(start: string, end: string) {
    if (!start || !end) return 'Active';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const minutes = Math.floor((endTime - startTime) / 60000);
    return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  }
}