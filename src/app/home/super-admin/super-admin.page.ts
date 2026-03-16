// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-super-admin',
//   templateUrl: './super-admin.page.html',
//   styleUrls: ['./super-admin.page.scss'],
//   standalone: false,
// })
// export class SuperAdminPage implements OnInit {
//   unreadAlertCount: number = 0;

//   constructor(private router: Router) { }

//   ngOnInit() {
//   }

//   toggleMenu(isOpen: boolean) {
//     const sideMenu = document.getElementById('side-menu');
//     const overlay = document.getElementById('side-menu-overlay');

//     if (isOpen) {
//       sideMenu?.classList.remove('-translate-x-full');
//       overlay?.classList.remove('hidden');
//     } else {
//       sideMenu?.classList.add('-translate-x-full');
//       overlay?.classList.add('hidden');
//     }
//   }

//   goToPage(path: string) {
//   this.router.navigate([`/home/super-admin/${path}`]);
// }

// openSettings() {
//   // Logic to show the premium settings view you provided in your SCSS
//   // (e.g., setting a visibility flag or navigating to settings)
// }

// openProfile(){

// }
// async openAttendance() {
//     const modal = await this.modalCtrl.create({
//       component: ViewAttendanceAdminPage,
//       // Optional: Add a CSS class if you want a custom size
//       cssClass: 'attendance-modal' 
//     });
    
//     return await modal.present();
//   }
// }



import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
// Ensure this path matches where you created the new page

import { EventsTriggeredAdminPage } from '../events-triggered-admin/events-triggered-admin.page';
import { ViewAttendanceAdminPage } from '../view-attendance-admin/view-attendance-admin.page';
import { TodaysPatrolsAdminPage } from '../todays-patrols-admin/todays-patrols-admin.page';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.page.html',
  styleUrls: ['./super-admin.page.scss'],
  standalone: false,
})
export class SuperAdminPage implements OnInit {
  unreadAlertCount: number = 0;

  constructor(
    private router: Router,
    private modalCtrl: ModalController // Added ModalController
  ) { }

  ngOnInit() {
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