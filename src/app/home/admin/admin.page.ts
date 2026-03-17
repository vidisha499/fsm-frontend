



import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { MenuController } from '@ionic/angular';
// Ensure this path matches where you created the new page

import { EventsTriggeredAdminPage } from '../events-triggered-admin/events-triggered-admin.page';
import { ViewAttendanceAdminPage } from '../view-attendance-admin/view-attendance-admin.page';
import { TodaysPatrolsAdminPage } from '../todays-patrols-admin/todays-patrols-admin.page';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false,
})
// Change SuperAdminPage to AdminPage
export class AdminPage implements OnInit {
  unreadAlertCount: number = 0;

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private menuCtrl: MenuController // Added ModalController
  ) { }

  ngOnInit() {
  }

toggleMenu() {
    // This 'main-menu' now matches the ID we added above
    this.menuCtrl.open('main-menu'); 
}

  goToPage(path: string) {
    this.router.navigate([`/home/admin/${path}`]);
  }

  openSettings() {
    // Logic to show settings view
  }

  openProfile() {
    // Logic to show profile
  }

  async openAttendance() {
    const modal = await this.modalCtrl.create({
      component: ViewAttendanceAdminPage,
      cssClass: 'attendance-modal' 
    });
    
    return await modal.present();
  }

 async openEvents() {
    const modal = await this.modalCtrl.create({
      component: EventsTriggeredAdminPage,
      cssClass: 'custom-modal-canvas'
    });
    return await modal.present();
  }

  async openPatrols() {
    const modal = await this.modalCtrl.create({
      component: TodaysPatrolsAdminPage,
      cssClass: 'custom-modal-canvas' 
    });
    return await modal.present();
  }
}