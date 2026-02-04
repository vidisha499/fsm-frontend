

// import { Component, Renderer2 } from '@angular/core';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-home',
//   templateUrl: 'home.page.html',
//   styleUrls: ['home.page.scss'],
//   standalone: false
// })
// export class HomePage {
//   // Navigation State
//   currentPage: string = 'home';
//   activeTab: string = 'info';

//   constructor(private router: Router, private renderer: Renderer2) {}

//   toggleMenu(isOpen: boolean) {
//     const menu = document.getElementById('side-menu');
//     const overlay = document.getElementById('side-menu-overlay');

//     if (!menu || !overlay) return;

//     if (isOpen) {
//       this.renderer.removeClass(menu, '-translate-x-full');
//       this.renderer.removeClass(overlay, 'hidden');
//       this.renderer.setStyle(overlay, 'display', 'block');
//     } else {
//       this.renderer.addClass(menu, '-translate-x-full');
//       this.renderer.addClass(overlay, 'hidden');
//       this.renderer.setStyle(overlay, 'display', 'none');
//     }
//   }

//   goToPage(path: string) {
//     this.toggleMenu(false);

//     // Give a slight delay for the menu transition to complete
//     setTimeout(() => {
//       console.log('Attempting navigation to:', path);
      
//       // 1. Internal View Switching (only for home and settings)
//       if (path === 'home') {
//         this.currentPage = 'home';
//       } 
//       else if (path === 'settings') {
//         this.currentPage = 'settings';
//       } 
//       // 2. Routing to separate pages (Attendance, Onsite, Patrol, etc.)
//       else {
//         // We use an absolute path to ensure the router finds the module correctly
//         this.router.navigate(['/', path]).catch(err => {
//           console.error('Navigation Error:', err);
//         });
//       }
//     }, 150); 
//   }
// }

import { Component, Renderer2, OnInit } from '@angular/core'; // Added OnInit
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit { // Implemented OnInit
  // Navigation State
  currentPage: string = 'home';
  activeTab: string = 'info';
  
  // 1. Create a variable to store the name
  rangerName: string = 'Ranger'; 

  constructor(private router: Router, private renderer: Renderer2) {}

  // 2. Load the name when the component initializes
  ngOnInit() {
    this.loadRangerData();
  }

  // Use ionViewWillEnter to ensure it refreshes if you navigate back to home
  ionViewWillEnter() {
    this.loadRangerData();
  }

  loadRangerData() {
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) {
      this.rangerName = storedName;
    }
  }

  toggleMenu(isOpen: boolean) {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');

    if (!menu || !overlay) return;

    if (isOpen) {
      this.renderer.removeClass(menu, '-translate-x-full');
      this.renderer.removeClass(overlay, 'hidden');
      this.renderer.setStyle(overlay, 'display', 'block');
    } else {
      this.renderer.addClass(menu, '-translate-x-full');
      this.renderer.addClass(overlay, 'hidden');
      this.renderer.setStyle(overlay, 'display', 'none');
    }
  }

  goToPage(path: string) {
    this.toggleMenu(false);

    setTimeout(() => {
      if (path === 'home') {
        this.currentPage = 'home';
      } 
      else if (path === 'settings') {
        this.currentPage = 'settings';
      } 
      else if (path === 'login') {
        // Clear storage on logout
        localStorage.clear();
        this.router.navigate(['/login']);
      }
      else {
        this.router.navigate(['/', path]).catch(err => {
          console.error('Navigation Error:', err);
        });
      }
    }, 150); 
  }
}