



import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
// Ensure this path matches where you created the new page

// import { EventsTriggeredAdminPage } from '../events-triggered-admin/events-triggered-admin.page';
// import { ViewAttendanceAdminPage } from '../view-attendance-admin/view-attendance-admin.page';
// import { TodaysPatrolsAdminPage } from '../todays-patrols-admin/todays-patrols-admin.page';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.page.html',
  styleUrls: ['./super-admin.page.scss'],
  standalone: false,
})
export class SuperAdminPage implements OnInit {
  unreadAlertCount: number = 0;
  companyId: string | null = '';

  constructor(
    private router: Router,
    private modalCtrl: ModalController // Added ModalController
  ) { }

  ngOnInit() {
    this.companyId = localStorage.getItem('company_id');
    console.log('Admin for Company:', this.companyId);
  }

  toggleMenu(isOpen: boolean) {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');

    if (isOpen) {
      sideMenu?.classList.remove('-translate-x-full');
      overlay?.classList.remove('hidden');
    } else {
      sideMenu?.classList.add('-translate-x-full');
      overlay?.classList.add('hidden');
    }
  }

  goToPage(path: string) {
    this.router.navigate([`/home/super-admin/${path}`]);
  }

  openSettings() {
    // Logic to show settings view
  }

  openProfile() {
    // Logic to show profile
  }

  async openAttendance() {
    // const modal = await this.modalCtrl.create({
    //   component: ViewAttendanceAdminPage,
    //   cssClass: 'attendance-modal' 
    // });
    // return await modal.present();
    console.warn('ViewAttendanceAdminPage is missing');
  }

  async openEvents() {
    // const modal = await this.modalCtrl.create({
    //   component: EventsTriggeredAdminPage,
    //   cssClass: 'custom-modal-canvas'
    // });
    // return await modal.present();
    console.warn('EventsTriggeredAdminPage is missing');
  }

  async openPatrols() {
    // const modal = await this.modalCtrl.create({
    //   component: TodaysPatrolsAdminPage,
    //   cssClass: 'custom-modal-canvas' 
    // });
    // return await modal.present();
    console.warn('TodaysPatrolsAdminPage is missing');
  }
}