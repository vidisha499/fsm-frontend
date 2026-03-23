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
  } 
  

  notifications = [
    { label: 'Fire Alerts', desc: 'Instant push for fire incidents', icon: '🔥', bg: '#fff1f2', enabled: true },
    { label: 'Criminal Activity', desc: 'Poaching & felling alerts', icon: '⚠️', bg: '#fff1f2', enabled: true },
    { label: 'Wildlife Sightings', desc: 'Animal movement near boundary', icon: '🦌', bg: '#f0fdfa', enabled: false },
    { label: 'Daily Reports', desc: 'Morning summary digest', icon: '📊', bg: '#eff6ff', enabled: true }
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
