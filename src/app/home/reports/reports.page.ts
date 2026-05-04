import { Component, OnInit } from '@angular/core'; // OnInit add kiya
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: false
})
export class ReportsPage implements OnInit { // OnInit implement karo
  isModalOpen = false;
  activeReport = '';
  selectedClient = 'all'; 
  startDate: any;
  endDate: any;
  maxDate: string = new Date().toISOString();
  userRole: string = ''; 
  isAttendanceOpen: boolean = false;
  isIncidenceOpen: boolean = false;
  isTourOpen: boolean = false;
  isVisitorOpen: boolean = false;
  isAdminOpen: boolean = false;
  sites: any[] = [];
  
  // Patrol Specific Filters (Dynamic)
  patrolType = 'all';
  patrolMethod = 'all';
  logType = 'all';
  
  patrolMethods: any[] = [];
  patrolTypes: any[] = [];
  logCategories: any[] = [];
  
  // Attendance Specific
  attendanceStatus = 'all';
  
  // Performance Specific
  performanceCategory = 'all';
  performanceMetric = 'all';


  reportEndpointMap: { [key: string]: string } = {
    // Attendance
    'Employee Attendance': 'userAttendanceReport',
    'Employee Attendance with Site/Beat': 'siteWiseGuardReport',
    'On-site/beat Attendance': 'siteWiseGuardReport',
    'Forgot to Exit': 'forgotExitReport',
    'Absent Report': 'absentAttendanceReport',
    'Performance Report': 'userPerformanceReport',
    'Emergency Attendance': 'emergencyAttendanceReport',
    
    // Tour
    'Daily Tour Report': 'dailyTourReport',
    'User Tour Report': 'userTourReport',
    'Tour Summary Report': 'tourSummaryReport',
    'Tour Diary': 'tourDiaryReport',
    'Advance Tour Diary': 'tourDiaryAdvanceReport',

    // Visitor
    'Visitor Daily Report': 'visitorDailyReport',
    'Visitor Summary Report': 'visitorSummaryReport',

    // Incidence
    'incidence_report': 'singleDayIncidenceReport',
    'incidence_summary': 'incidenceSummaryReport',
    'Patrol Report': 'reports/patrol',
    'Field Visit Report': 'reports/field-visit',

    // Admin/Guard
    'Company Performance': 'companyWiseGuardReport',
    'Site Performance': 'siteWiseGuardReport',
    'Supervisor Performance': 'supervisorWiseGuardReport',
    'Jal Shakti Report': 'getJalShaktiReport'
  };

  // Options ke liye data array
  attendanceOptions = [
    'Employee Attendance',
    'Employee Attendance with Site/Beat',
    'On-site/beat Attendance',
    'Working Summary',
    'Forgot to Exit',
    'Supervisor Attendance'
  ];

  constructor(private navCtrl: NavController, private router: Router , private dataService: DataService) {}

  ngOnInit() {
    let rawRole = localStorage.getItem('user_role');
    
    // Fallback: Agar user_role nahi hai toh user_data se nikalo (existing sessions ke liye)
    if (!rawRole) {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          rawRole = user.role_id ? user.role_id.toString() : null;
        } catch (e) {
          console.error("Error parsing user_data for role:", e);
        }
      }
    }

    // Final fallback to Ranger
    rawRole = rawRole || '4';
    
    if (rawRole === '1' || rawRole === '2') {
      this.userRole = 'admin';
    } else {
      this.userRole = 'ranger';
    }

    console.log("DEBUG: Final rawRole:", rawRole);
    console.log("DEBUG: Mapped userRole:", this.userRole);
    this.resetFilters();
    if (this.userRole === 'admin') {
      this.fetchSites();
    }
    this.fetchPatrolMetadata();
  }

  fetchPatrolMetadata() {
    // 1. Fetch Patrol Methods
    this.dataService.getPatrolMethods().subscribe({
      next: (res: any) => {
        this.patrolMethods = res?.data || res || [];
        console.log('Patrol Methods:', this.patrolMethods);
      },
      error: () => {
        // Fallback if API fails
        this.patrolMethods = ['On Foot', 'Vehicle', 'E-Bike', 'Night Patrol'];
      }
    });

    // 2. Fetch Patrol Types
    this.dataService.getPatrolTypes().subscribe({
      next: (res: any) => {
        this.patrolTypes = res?.data || res || [];
        console.log('Patrol Types:', this.patrolTypes);
      },
      error: () => {
        this.patrolTypes = ['Regular', 'Special', 'Emergency'];
      }
    });

    // 3. Fetch Log Categories
    this.dataService.getLogCategories().subscribe({
      next: (res: any) => {
        this.logCategories = res?.data || res || [];
        console.log('Log Categories:', this.logCategories);
      },
      error: () => {
        this.logCategories = ['Standard', 'Alert', 'Incident', 'Observation'];
      }
    });
  }

  fetchSites() {
    const companyId = localStorage.getItem('company_id') || '1';
    this.dataService.getSitesList(companyId).subscribe({
      next: (res: any) => {
        this.sites = res?.data || res || [];
        console.log('Sites fetched for reports:', this.sites);
      },
      error: (err) => console.error('Error fetching sites:', err)
    });
  }

toggleAttendance() {
    this.isAttendanceOpen = !this.isAttendanceOpen;
  }

  toggleIncidence() {
    this.isIncidenceOpen = !this.isIncidenceOpen;
    // Optional: Agar ek khule toh dusra band ho jaye
    if (this.isIncidenceOpen) this.isAttendanceOpen = false;
  }

  onOptionSelect(option: string) {
    console.log('Selected:', option);
    this.openFilterModal(option);
  }

  toggleSection(section: string) {
    this.isAttendanceOpen = section === 'attendance' ? !this.isAttendanceOpen : false;
    this.isIncidenceOpen = section === 'incidence' ? !this.isIncidenceOpen : false;
    this.isTourOpen = section === 'tour' ? !this.isTourOpen : false;
    this.isVisitorOpen = section === 'visitor' ? !this.isVisitorOpen : false;
    this.isAdminOpen = section === 'admin' ? !this.isAdminOpen : false;
  }
  



  resetFilters() {
    this.selectedClient = 'all';
    this.startDate = new Date().toISOString();
    this.endDate = new Date().toISOString();
  }
openFilterModal(type: string) {
  // HTML check ke liye hum 'type' ko store karenge
  this.activeReport = type; 
  this.isModalOpen = true; //
  console.log('Modal opened for report type:', type);
}
  // generateReport(format: 'pdf' | 'excel') {
  //   const reportData = {
  //     type: this.activeReport,
  //     client: this.selectedClient,
  //     start: this.startDate,
  //     end: this.endDate,
  //     format: format
  //   };

  //   console.log('Sending to API:', reportData);
  //   this.isModalOpen = false;
  // }

  generateReport(format: 'pdf' | 'excel') {
    const endpoint = this.reportEndpointMap[this.activeReport] || 'reports/forest-patrol';
    
    // Get IDs correctly from DataService/LocalStorage
    const companyId = this.dataService.getUserCompanyId() || localStorage.getItem('company_id') || '';
    const rangerId = this.dataService.getRangerId() || localStorage.getItem('ranger_id') || '';
    const token = localStorage.getItem('api_token') || '';
    
    // Split date to get YYYY-MM-DD
    const from = this.startDate ? this.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const to = this.endDate ? this.endDate.split('T')[0] : new Date().toISOString().split('T')[0];

    // Create FormData as Sir's API expects multipart/form-data
    const formData = new FormData();
    
    // Body token (Critical for Sir's legacy PHP backend)
    formData.append('api_token', token);
    
    // Company keys
    formData.append('company_id', String(companyId));
    formData.append('companyId', String(companyId));

    // User keys
    formData.append('user_id', String(rangerId));
    formData.append('ranger_id', String(rangerId));
    formData.append('guard_id', String(rangerId));
    formData.append('id', String(rangerId));

    // Date keys (Comprehensive set for all endpoint variants)
    formData.append('from', from);
    formData.append('to', to);
    formData.append('from_date', from);
    formData.append('to_date', to);
    formData.append('startDate', from);
    formData.append('endDate', to);
    formData.append('start_date', from);
    formData.append('end_date', to);
    formData.append('date_from', from);
    formData.append('date_to', to);

    if (this.selectedClient && this.selectedClient !== 'all') {
      formData.append('client', String(this.selectedClient));
      formData.append('client_id', String(this.selectedClient));
    }

    // Add Patrol specific fields
    if (this.activeReport === 'Patrol Report') {
      if (this.patrolType && this.patrolType !== 'all') formData.append('patrol_type', this.patrolType);
      if (this.patrolMethod && this.patrolMethod !== 'all') formData.append('patrol_method', this.patrolMethod);
      if (this.logType && this.logType !== 'all') formData.append('log_type', this.logType);
    }

    // Add Attendance specific fields
    if (this.activeReport === 'Employee Attendance') {
      if (this.attendanceStatus && this.attendanceStatus !== 'all') formData.append('status', this.attendanceStatus);
    }

    // Add Performance specific fields
    if (this.activeReport === 'Performance Report') {
      if (this.performanceCategory && this.performanceCategory !== 'all') formData.append('category', this.performanceCategory);
      if (this.performanceMetric && this.performanceMetric !== 'all') formData.append('metric', this.performanceMetric);
    }

    formData.append('format', format);

    console.log('Requesting Report from:', endpoint, 'with params:', { from, to, companyId, rangerId, selectedClient: this.selectedClient });

    this.dataService.downloadReport(endpoint, formData).subscribe({
      next: (response: any) => {
        const contentType = response.headers.get('content-type');

        // Check if the response is JSON (Success with link or Error message)
        if (contentType && contentType.includes('application/json')) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const resObj = JSON.parse(reader.result as string);
              
              if (resObj.status === 'SUCCESS' && resObj.fileurl) {
                console.log('Report generated! Opening link:', resObj.fileurl);
                window.open(resObj.fileurl, '_blank');
                this.isModalOpen = false;
              } else if (resObj.message === 'No records found') {
                // User friendly message for empty data
                alert('Chune gaye Ranger aur Dates ke liye koi record nahi mila (No records found).');
              } else {
                console.error('Server Error (JSON):', resObj);
                alert('Report generate nahi ho saka: ' + (resObj.message || 'Server returned failure.'));
              }
            } catch (e) {
              console.error('Raw Server Response:', reader.result);
              alert('Server ne invalid data bheja hai.');
            }
          };
          reader.readAsText(response.body);
          return;
        }

        // --- OLD BLOB LOGIC (for direct file streams) ---
        const blob = new Blob([response.body], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isModalOpen = false;
      },
      error: (err) => {
        console.error('Network Error:', err);
        alert('API se connect nahi ho sake!');
      }
    });
    
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}