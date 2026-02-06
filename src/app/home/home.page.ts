import { Component, Renderer2, OnInit } from '@angular/core'; 
import { Router } from '@angular/router';
import { DataService } from '../data.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit { 
  // Navigation State
  currentPage: string = 'home';
  activeTab: string = 'info';
  
  // Variable to store the name for the UI
  rangerName: string = 'Ranger'; 

  constructor(
    private router: Router, 
    private renderer: Renderer2, 
    private dataService: DataService 
  ) {}

  // Load the name when the component first creates
  ngOnInit() {
    this.loadRangerData();
  }

  // Refresh the name every time the user navigates back to this screen
  ionViewWillEnter() {
    this.loadRangerData();
  }

  loadRangerData() {
    // Matches the key set in login.page.ts
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) {
      this.rangerName = storedName;
    } else {
      this.rangerName = 'Ranger'; // Default fallback
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
        // Clear storage on logout so names don't persist for the next user
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