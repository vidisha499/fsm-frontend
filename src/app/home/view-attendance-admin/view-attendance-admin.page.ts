import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-view-attendance-admin',
  templateUrl: './view-attendance-admin.page.html',
  styleUrls: ['./view-attendance-admin.page.scss'],
  standalone: false
})
export class ViewAttendanceAdminPage implements OnInit {

  isModalOpen: boolean = false;
  activeTab: string = 'all'; // Default tab
  
  // Filter object for the date pickers
  filters = {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

  // Mock data - This will be replaced by your NeonDB/PostgreSQL data later
  attendanceLogs = [
    { rangerName: 'Ishika', rangerId: 'R-101', time: '09:00 AM', date: '16 March 2026', status: 'Present' },
    { rangerName: 'Rahul Sharma', rangerId: 'R-105', time: '08:45 AM', date: '16 March 2026', status: 'Present' },
    { rangerName: 'Amit Kumar', rangerId: 'R-112', time: '09:15 AM', date: '16 March 2026', status: 'Late' },
    { rangerName: 'Priya Singh', rangerId: 'R-103', time: '08:30 AM', date: '16 March 2026', status: 'Present' },
  ];

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    // This is where you will call your dataService.getAttendance()
  }

  // Closes the modal and returns to the Super Admin dashboard
  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Logic for the Filter Modal buttons
  applyFilters() {
    console.log('Filtering from:', this.filters.fromDate, 'to:', this.filters.toDate);
    this.isModalOpen = false;
    // Add your backend filtering logic here
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
}