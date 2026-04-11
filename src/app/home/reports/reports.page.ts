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
    this.isModalOpen = true;
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
    const payload = {
      type: this.activeReport,
      range: this.selectedClient,
      start: this.startDate,
      end: this.endDate,
      format: format,
      // Backend ko user info bhej rahe hain security/filtering ke liye
      user_id: localStorage.getItem('ranger_id'),
      user_role: this.userRole // Jo tune map kiya tha (admin/ranger)
    };

    console.log('Sending Payload:', payload);

    this.dataService.downloadReport(payload).subscribe({
      next: (response: any) => {
        // 1. Blob se URL create karo
        const blob = new Blob([response.body], { type: response.headers.get('content-type') });
        const url = window.URL.createObjectURL(blob);
        
        // 2. Virtual link banakar download trigger karo
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        
        // 3. Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isModalOpen = false;
      },
      error: (err) => {
        console.error('Download Error:', err);
        alert('Report download fail ho gayi!');
        
      }
    });
    
  }
}