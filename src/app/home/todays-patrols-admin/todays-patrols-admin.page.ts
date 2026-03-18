import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { DataService } from 'src/app/data.service';

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
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadTodayPatrols();
  }

  ionViewWillEnter() {
    this.loadTodayPatrols();
  }

  // loadTodayPatrols() {
  //   const companyId = localStorage.getItem('company_id');
  //   const today = new Date().toISOString().split('T')[0];
  //   if (!companyId) return;
    

  //   this.isLoading = true;
  //   // Update this URL to match your patrol endpoint
  //   const url = `https://forest-backend-pi.vercel.app/api/patrols/company/${companyId}`;

  //   this.http.get<any[]>(url).subscribe({
  //     next: (data) => {
  //       const today = new Date().toISOString().split('T')[0];
        
  //       // 1. Sort by ID Descending (Newest first)
  //       this.allPatrols = data.sort((a, b) => b.id - a.id);
        
  //       // 2. Filter for today's date only
  //       this.filteredPatrols = this.allPatrols.filter(p => 
  //         p.createdAt && p.createdAt.split('T')[0] === today
  //       );

  //       this.isLoading = false;
  //     },
  //     error: (err) => {
  //       console.error('Error loading patrols', err);
  //       this.isLoading = false;
  //     }
  //   });
  // }


  loadTodayPatrols() {
  const companyId = localStorage.getItem('company_id');
  // Ensures we match the date part of the timestamp: 2026-03-18
  const todayDateStr = new Date().toISOString().split('T')[0]; 

  if (companyId) {
    this.isLoading = true;
    this.dataService.getPatrolsByCompany(Number(companyId)).subscribe({
      next: (data: any) => {
        this.filteredPatrols = data.filter((p: any) => {
          // 1. Check Company Match
          const isCompany = Number(p.companyId) === Number(companyId);
          // 2. Check Date Match (created_at from your DB)
          const isToday = p.created_at && p.created_at.split('T')[0] === todayDateStr;
          
          return isCompany && isToday;
        }).sort((a: any, b: any) => b.id - a.id);
        
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }
}

  goBack() {
    this.navCtrl.back();
  }

  doRefresh(event: any) {
    this.loadTodayPatrols();
    setTimeout(() => event.target.complete(), 1000);
  }

  // Helper to calculate patrol duration
  calculateDuration(start: string, end: string) {
    if (!start || !end) return 'Active';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const minutes = Math.floor((endTime - startTime) / 60000);
    return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  }
}