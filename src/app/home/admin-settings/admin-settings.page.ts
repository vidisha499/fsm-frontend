import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

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
    initials: '??'
  };

ngOnInit() {
  this.loadUserData();
  
  const savedPrefs = localStorage.getItem('admin_notification_settings');
  if (savedPrefs) {
    this.notifications = JSON.parse(savedPrefs);
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

  constructor(private navCtrl: NavController, private toast: ToastController) {}



  openExport() { console.log('Opening export options...'); }
  changeSync() { console.log('Opening sync settings...'); }



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
  // 1. Toggle the UI state (the toggle button itself)
  // Note: If you are using ion-toggle with [(ngModel)], 
  // you might not need this line as NgModel toggles it for you.
  // item.enabled = !item.enabled; 

  // 2. Persist to LocalStorage
  // We save the entire array. The Admin Dashboard reads this 
  // to decide which alerts to show or hide.
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
