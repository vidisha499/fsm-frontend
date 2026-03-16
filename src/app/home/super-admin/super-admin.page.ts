import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.page.html',
  styleUrls: ['./super-admin.page.scss'],
  standalone: false,
})
export class SuperAdminPage implements OnInit {

  constructor(private router: Router) { }

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
  // Logic to show the premium settings view you provided in your SCSS
  // (e.g., setting a visibility flag or navigating to settings)
}

openProfile(){

}
}
