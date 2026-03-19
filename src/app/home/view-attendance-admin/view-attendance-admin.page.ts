import { Component, OnInit , Input } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { DataService } from 'src/app/data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-view-attendance-admin',
  templateUrl: './view-attendance-admin.page.html',
  styleUrls: ['./view-attendance-admin.page.scss'],
  standalone: false
})
export class ViewAttendanceAdminPage implements OnInit {

// @Input() adminCompanyId: string;
@Input() adminCompanyId!: string;


  isModalOpen: boolean = false;
  activeTab: string = 'all'; // Default tab
  
  attendanceLogs: any[] = []; // UI mein dikhne wala data
allMergedLogs: any[] = []; // Backup for filtering
  
  allLogs: any[] = [];
  
  // Filter object for the date pickers
  filters = {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

  // Mock data - This will be replaced by your NeonDB/PostgreSQL data later
  // attendanceLogs = [
  //   { rangerName: 'Ishika', rangerId: 'R-101', time: '09:00 AM', date: '16 March 2026', status: 'Present' },
  //   { rangerName: 'Rahul Sharma', rangerId: 'R-105', time: '08:45 AM', date: '16 March 2026', status: 'Present' },
  //   { rangerName: 'Amit Kumar', rangerId: 'R-112', time: '09:15 AM', date: '16 March 2026', status: 'Late' },
  //   { rangerName: 'Priya Singh', rangerId: 'R-103', time: '08:30 AM', date: '16 March 2026', status: 'Present' },
  // ];

  constructor(private modalCtrl: ModalController,
    private http: HttpClient,
    private dataService: DataService,
     private loadingCtrl: LoadingController,
  ) { }

  ngOnInit() {
    // this.fetchAttendanceData();
    this.fetchAllData();
  }

  // Closes the modal and returns to the Super Admin dashboard
  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Logic for the Filter Modal buttons

  applyFilters() {
  const from = new Date(this.filters.fromDate);
  const to = new Date(this.filters.toDate);
  
  // Time ko zero kar dete hain taaki sirf Date match ho
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  this.attendanceLogs = this.allMergedLogs.filter(log => {
    const logDate = new Date(log.created_at || log.date).getTime();
    return logDate >= from.getTime() && logDate <= to.getTime();
  });

  console.log('Filtered Count:', this.attendanceLogs.length);
  this.isModalOpen = false; // Modal band karne ke liye
}

  resetFilters() {
    this.filters.fromDate = new Date().toISOString();
    this.filters.toDate = new Date().toISOString();
    this.isModalOpen = false;
  }

  // Helper to format dates if needed
  formatDate(dateString: string) {
    const options: any = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  ionViewWillEnter() {
    console.log("Modal Entered. Received ID:", this.adminCompanyId);
    
    // Check agar Input se ID nahi aayi, toh localStorage se uthao (Backup Plan)
    if (!this.adminCompanyId || this.adminCompanyId === 'undefined') {
      this.adminCompanyId = localStorage.getItem('company_id') || '';
      console.log("Falling back to localStorage ID:", this.adminCompanyId);
    }

    this.fetchAllData();
  }

  // 3. Backend call jo sirf is company ka data laye
fetchAllData() {
  if (!this.adminCompanyId || this.adminCompanyId === '0') return;

  // 1. Regular Attendance Fetch
  this.dataService.getAttendanceByCompany(this.adminCompanyId).subscribe({
    next: (regLogs: any) => {
      const regularData = Array.isArray(regLogs) ? regLogs : [];
      const regular = regularData.map((log: any) => ({
        ...log,
        logType: 'regular',
        // Mapping keys to avoid undefined
        displayId: log.ranger_id || log.rangerId || 'N/A',
        displayName: log.ranger_name || log.rangerName || 'Unknown',
        displayTime: log.time || new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        displayDate: log.date || new Date(log.created_at).toLocaleDateString()
      }));

      // 2. Onsite Attendance Fetch - REMOVED '/pending' to get approved logs
      this.http.get<any>(`${environment.apiUrl}/onsite-attendance/company/${this.adminCompanyId}`).subscribe({
        next: (onsiteLogs: any) => {
          const onsiteData = Array.isArray(onsiteLogs) ? onsiteLogs : [];
          
          // Filtering approved and mapping keys
          const approvedOnsite = onsiteData
            .filter((log: any) => log.status === 'approved')
            .map((log: any) => ({
              ...log,
              logType: 'onsite',
              displayName: log.ranger || log.ranger_name || 'Unknown',
              displayTime: new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              displayDate: new Date(log.created_at).toLocaleDateString()
            }));

          // 3. Merge both and Sort
          this.allMergedLogs = [...regular, ...approvedOnsite].sort((a, b) => {
             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          this.filterByTab();
        },
        error: (err) => console.error("Onsite Fetch Error:", err)
      });
    },
    error: (err) => console.error("Regular Fetch Error:", err)
  });
}
// filterByTab() {
//   if (this.activeTab === 'attendance') {
//     this.attendanceLogs = this.allMergedLogs.filter(log => log.logType === 'regular');
//   } else {
//     this.attendanceLogs = this.allMergedLogs.filter(log => log.logType === 'onsite');
//   }
// }

// Tab change function
setTab(tab: string) {
  this.activeTab = tab;
  this.filterByTab();
}

filterByTab() {
    if (this.activeTab === 'all') {
      this.attendanceLogs = [...this.allMergedLogs];
    } else if (this.activeTab === 'regular') {
      this.attendanceLogs = this.allMergedLogs.filter(log => log.logType === 'regular');
    } else if (this.activeTab === 'onsite') {
      this.attendanceLogs = this.allMergedLogs.filter(log => log.logType === 'onsite');
    }
  }
}