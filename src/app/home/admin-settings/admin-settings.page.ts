import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.page.html',
  styleUrls: ['./admin-settings.page.scss'],
  standalone: false
})
export class AdminSettingsPage implements OnInit {

  adminUser = {
    name: 'Loading...',
    role: 'Admin',
    ranges: 'All Ranges',
    initials: '??',
    // company_id: 1
    company_id: Number(localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data')!).company_id : 1)
  };

  syncInterval: number = 5; // Default 5 minutes

  ngOnInit() {
    this.loadUserData();
    
    // Load notification prefs
    const savedPrefs = localStorage.getItem('admin_notification_settings');
    if (savedPrefs) {
      this.notifications = JSON.parse(savedPrefs);
    }

    // Load sync interval
    const savedSync = localStorage.getItem('admin_sync_interval');
    if (savedSync) {
      this.syncInterval = parseInt(savedSync);
    }
  }
  

  // notifications = [
  //   { label: 'Fire Alerts', desc: 'Instant push for fire incidents', icon: '🔥', bg: '#fff1f2', enabled: true },
  //   { label: 'Criminal Activity', desc: 'Poaching & felling alerts', icon: '⚠️', bg: '#fff1f2', enabled: true },
  //   { label: 'Illegal Felling', desc: 'Alerts for unauthorized tree cutting', icon: '🪓', bg: '#fef3c7', enabled: true },
  //   { label: 'Animal Poaching', desc: 'Critical alerts for wildlife threats', icon: '🏹', bg: '#f0fdfa', enabled: true},
  //   // { label: 'Daily Reports', desc: 'Morning summary digest', icon: '📊', bg: '#eff6ff', enabled: true }
  // ];

  notifications = [
  { 
    label: 'Fire Alerts', 
    desc: 'Instant push for fire incidents', 
    icon: '🔥', 
    bg: '#fff1f2', 
    enabled: true 
  },
  { 
    label: 'Criminal Activity', // This matches the .includes('CRIMINAL') check
    desc: 'General illegal activity alerts', 
    icon: '⚠️', 
    bg: '#fef2f2', 
    enabled: true 
  },
  { 
    label: 'Illegal Felling', // This matches the .includes('FELL') check
    desc: 'Alerts for unauthorized tree cutting', 
    icon: '🪓', 
    bg: '#fef3c7', 
    enabled: true 
  },
  { 
    label: 'Animal Poaching', // This matches the .includes('POACH') check
    desc: 'Critical alerts for wildlife threats', 
    icon: '🏹', 
    bg: '#f0fdfa', 
    enabled: true 
  }
];

   constructor(
    private navCtrl: NavController, 
    private toast: ToastController,
    private alertCtrl: AlertController,
    private dataService: DataService
  ) {}



  //  async openExport() {
  //   const dateAlert = await this.alertCtrl.create({
  //     header: 'Export Reports',
  //     subHeader: 'Select date range',
  //     inputs: [
  //       { name: 'from', type: 'date', label: 'From', value: new Date().toISOString().split('T')[0] },
  //       { name: 'to', type: 'date', label: 'To', value: new Date().toISOString().split('T')[0] }
  //     ],
  //     buttons: [
  //       { text: 'Cancel', role: 'cancel' },
  //       {
  //         text: 'Next',
  //         handler: (data) => {
  //           if (data.from && data.to) {
  //             this.chooseFormat(data.from, data.to);
  //           } else {
  //             this.showToast('Please select both dates', 'warning');
  //           }
  //         }
  //       }
  //     ]
  //   });
  //   await dateAlert.present();
  // }

  async chooseFormat(from: string, to: string) {
    const alert = await this.alertCtrl.create({
      header: 'Choose Format',
      message: `Export data from ${from} to ${to}`,
      buttons: [
        {
          text: 'Excel (.xlsx)',
          cssClass: 'excel-btn',
          handler: () => this.performExport(from, to, 'xlsx')
        },
        {
          text: 'PDF (.pdf)',
          cssClass: 'pdf-btn',
          handler: () => this.performExport(from, to, 'pdf')
        },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await alert.present();
  }

  async performExport(from: string, to: string, format: 'pdf' | 'xlsx') {
    const t = await this.toast.create({ message: `Generating ${format.toUpperCase()}...`, duration: 3000 });
    await t.present();

    // Fetching Patrol Logs as sample data for export
    (this.dataService.getPatrolsByCompany(this.adminUser.company_id, from) as any).subscribe({
      next: (logs: any[]) => {
        // Since getPatrolsByCompany filters by single date in logic, we might need a better API 
        // but for now we follow the user's date range as a filter on frontend results
        const filteredLogs = Array.isArray(logs) ? logs.filter(l => {
          const lDate = new Date(l.startTime).toISOString().split('T')[0];
          return lDate >= from && lDate <= to;
        }) : [];

        if (filteredLogs.length === 0) {
          t.dismiss();
          this.showToast('No data found for selected range', 'medium');
          return;
        }

        if (format === 'xlsx') this.exportToExcel(filteredLogs, from, to);
        else this.exportToPDF(filteredLogs, from, to);
        
        t.dismiss();
      },
      error: (err: any) => {
        t.dismiss();
        this.showToast('Fetch failed', 'danger');
      }
    });
  }

  exportToExcel(data: any[], from: string, to: string) {
    const worksheet = XLSX.utils.json_to_sheet(data.map(l => ({
      ID: l.id,
      Ranger: l.rangerName || l.ranger?.name,
      Beat: l.beat,
      Type: l.type,
      Start: l.startTime,
      End: l.endTime,
      Status: l.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PatrolLogs");
    XLSX.writeFile(workbook, `ForestReport_${from}_to_${to}.xlsx`);
  }

  exportToPDF(data: any[], from: string, to: string) {
    const doc = new jsPDF();
    doc.text(`Forest Management - Patrol Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${from} to ${to}`, 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['Ranger', 'Beat', 'Type', 'Start Time', 'Status']],
      body: data.map(l => [
        l.rangerName || l.ranger?.name || 'N/A',
        l.beat || 'N/A',
        l.type || 'Regular',
        new Date(l.startTime).toLocaleString(),
        l.status || 'Completed'
      ]),
    });
    
    doc.save(`ForestReport_${from}_to_${to}.pdf`);
  }

  async changeSync() {
    const alert = await this.alertCtrl.create({
      header: 'Sync Interval',
      message: 'Set how often the dashboard refreshes',
      inputs: [
        { type: 'radio', label: '1 Minute (Fast)', value: 1, checked: this.syncInterval === 1 },
        { type: 'radio', label: '5 Minutes (Standard)', value: 5, checked: this.syncInterval === 5 },
        { type: 'radio', label: '15 Minutes', value: 15, checked: this.syncInterval === 15 },
        { type: 'radio', label: '30 Minutes', value: 30, checked: this.syncInterval === 30 }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (val) => {
            this.syncInterval = val;
            localStorage.setItem('admin_sync_interval', val.toString());
            this.showToast(`Sync interval set to ${val} minutes`, 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  manageUsers() {
    // Navigating to enroll page as a temporary user management portal
    this.navCtrl.navigateForward('/enroll');
  }

  private async showToast(msg: string, color: string) {
    const t = await this.toast.create({ message: msg, duration: 2000, color, position: 'top' });
    await t.present();
  }

  goToReports() {
    // Ye 'reports' wahi naam hona chahiye jo tune app-routing.module.ts mein rakha hai
    this.navCtrl.navigateForward('/reports');
  }



  goBack() {
    // This will take the user back to admin-analytics or the previous view
    this.navCtrl.back();
  }

loadUserData() {
    // Pulling from 'user_data' key saved in your LoginPage
    const savedData = localStorage.getItem('user_data');
    
    if (savedData) {
      const userData = JSON.parse(savedData);
      
      if (userData.name) {
        this.adminUser.name = userData.name;
        
        // Generate Initials (e.g., "Vidisha C" -> "VC")
        const nameParts = userData.name.trim().split(' ');
        this.adminUser.initials = nameParts.length > 1 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : nameParts[0][0].toUpperCase();

        // Role ID 2 is Admin from your Roles table
        this.adminUser.role = userData.role_id === 2 ? 'Admin' : 'Super Admin';
        
        // Use division if present, otherwise default to All Ranges
        this.adminUser.ranges = userData.division || 'All Ranges';
        this.adminUser.company_id = userData.company_id || 1;
      }
    }
  }

  // Add this method to your AdminSettingsPage class in admin-settings.page.ts

// async toggleNotification(item: any) {
//   // 1. Toggle the UI state
//   item.enabled = !item.enabled;

//   // 2. Persist to LocalStorage (as per your requirement)
//   // We save the entire array so the ON/OFF positions stay the same when you return
//   localStorage.setItem('admin_notification_settings', JSON.stringify(this.notifications));

//   // 3. Optional: Show a small toast to confirm
//   const t = await this.toast.create({
//     message: `${item.label} ${item.enabled ? 'Enabled' : 'Disabled'}`,
//     duration: 1500,
//     position: 'bottom',
//     color: item.enabled ? 'success' : 'medium'
//   });
//   await t.present();

//   // 4. API Call (Optional - if you want to sync across devices)
//   // this.dataService.updateNotificationPrefs(this.adminUser.id, this.notifications).subscribe();
// }

async toggleNotification(item: any) {
  // 1. Toggle the UI state
  item.enabled = !item.enabled; 

  // 2. Persist to LocalStorage
  localStorage.setItem('admin_notification_settings', JSON.stringify(this.notifications));

  // 3. Show a small toast to confirm the action to the Admin
  const t = await this.toast.create({
    message: `${item.label} is now ${item.enabled ? 'Enabled' : 'Disabled'}`,
    duration: 1500,
    position: 'bottom',
    cssClass: 'custom-toast', // Optional: for custom styling
    color: item.enabled ? 'success' : 'medium',
    buttons: [
      {
        text: 'Dismiss',
        role: 'cancel'
      }
    ]
  });
  await t.present();

  // 4. Optional: Sync with Backend
  // If you want settings to persist across different browsers/devices
  /*
  const adminId = localStorage.getItem('user_id');
  if (adminId) {
    this.dataService.updateNotificationPrefs(Number(adminId), this.notifications)
      .subscribe({
        error: (err) => console.error('Sync failed', err)
      });
  }
  */
}



  async logout() {
    const t = await this.toast.create({
      message: 'Signing out...',
      duration: 1000,
      color: 'dark'
    });
    await t.present();
    
    // Clear all storage for security
    localStorage.clear();
    
    setTimeout(() => this.navCtrl.navigateRoot('/login'), 1000);
  }
 
}
