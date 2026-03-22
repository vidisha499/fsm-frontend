import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.page.html',
  styleUrls: ['./admin-settings.page.scss'],
  standalone: false
})
export class AdminSettingsPage implements OnInit {

  

  ngOnInit() {
  }

  notifications = [
    { label: 'Fire Alerts', desc: 'Instant push for fire incidents', icon: '🔥', bg: '#fff1f2', enabled: true },
    { label: 'Criminal Activity', desc: 'Poaching & felling alerts', icon: '⚠️', bg: '#fff1f2', enabled: true },
    { label: 'Wildlife Sightings', desc: 'Animal movement near boundary', icon: '🦌', bg: '#f0fdfa', enabled: false },
    { label: 'Daily Reports', desc: 'Morning summary digest', icon: '📊', bg: '#eff6ff', enabled: true }
  ];

  constructor(private navCtrl: NavController, private toast: ToastController) {}

  async logout() {
    const t = await this.toast.create({
      message: 'Signing out...',
      duration: 1000,
      color: 'dark'
    });
    await t.present();
    setTimeout(() => this.navCtrl.navigateRoot('/login'), 1000);
  }

  openExport() { console.log('Opening export options...'); }
  changeSync() { console.log('Opening sync settings...'); }

  goBack() {
    // This will take the user back to admin-analytics or the previous view
    this.navCtrl.back();
  }
}
