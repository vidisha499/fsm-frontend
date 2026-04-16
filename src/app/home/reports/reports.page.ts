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
  const rawRole = localStorage.getItem('user_role') || ''; 
  
  // Agar role '2' aa raha hai toh usko 'admin' set kar do logic ke liye
  if (rawRole == '2') {
    this.userRole = 'admin';
  } else if (rawRole == '1') {
    this.userRole = 'ranger';
  } else {
    this.userRole = rawRole.trim().toLowerCase();
  }

  console.log("Mapped Role for HTML:", this.userRole);
  this.resetFilters();
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
  

  goBack() {
    // Role check logic (lowercase ensure karta hai ki 'Admin' bhi match ho jaye)
    if (this.userRole === 'admin') {
      this.navCtrl.navigateBack('/admin-dashboard');
    } else {
      this.navCtrl.navigateBack('/ranger-dashboard');
    }
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
    
    // Create FormData as Sir's API expects multipart/form-data
    const formData = new FormData();
    // formData.append('api_token', localStorage.getItem('api_token') || ''); // Interceptor handles this
    formData.append('company_id', localStorage.getItem('company_id') || '');
    formData.append('user_id', localStorage.getItem('ranger_id') || '');
    formData.append('from', this.startDate.split('T')[0]); 
    formData.append('to', this.endDate.split('T')[0]);
    formData.append('format', format);

    console.log('Requesting Report from:', endpoint, 'using FormData');

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
                // Open the URL directly in a new tab for download
                window.open(resObj.fileurl, '_blank');
                this.isModalOpen = false;
              } else {
                console.error('Server Error (JSON):', resObj);
                alert('Server Error: ' + (resObj.message || 'Report generate nahi ho saka.'));
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
}