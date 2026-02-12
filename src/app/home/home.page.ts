// import { Component, Renderer2, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { DataService } from '../data.service';
// import { ToastController } from '@ionic/angular';
// import { TranslateService } from '@ngx-translate/core';


// @Component({
//   selector: 'app-home',
//   templateUrl: 'home.page.html',
//   styleUrls: ['home.page.scss'],
//   standalone: false
// })
// export class HomePage implements OnInit {
//   currentPage: 'home' | 'settings' | 'attendance' = 'home';
//   activeTab: string = 'info';

//   // State variables for the Ranger
//   rangerId: string = '';
//   rangerName: string = 'Ranger';
//   rangerDivision: string = 'Washim Division 4.2';
//   rangerPhone: string = '';
//   rangerPassword: string = ''; // Added: needed for [(ngModel)]

//   // UI State variables for Settings/Language
//   showLanguageModal: boolean = false;   // Added
//   selectedLanguage: string = 'English'; // Added
//   showPassword: boolean = false;        // Added
//   showNewPassword: boolean = false;     // Added

//   constructor(
//     private router: Router, 
//     private renderer: Renderer2, 
//     private dataService: DataService,
//     private toastController: ToastController
//   ) {}

//   ngOnInit() {
//     this.loadRangerData();
//   }



// ionViewWillEnter() {
//   // ✅ 1. Define the variable locally so it can be used
//   const currentRangerId = this.dataService.getRangerId();

//   if (currentRangerId) {
//     // ✅ 2. Fetch live data from the database
//     this.dataService.getRangerProfile(currentRangerId).subscribe({
//       next: (profile: any) => {
//         this.rangerId = profile.id;
//         this.rangerName = profile.username;
//         this.rangerPhone = profile.phoneNo;
        
//         // Sync the local storage so it stays updated
//         localStorage.setItem('ranger_username', profile.username);
//         localStorage.setItem('ranger_phone', profile.phoneNo);
//       },
//       error: (err) => console.error('Could not load profile', err)
//     });
//   }

//   // ✅ 3. Ensure this method exists in your class (see Step 3 below)
//   this.loadRangerData();
// }



//   loadRangerData() {
//   // ✅ Match the keys used in LoginPage
//   this.rangerId = localStorage.getItem('ranger_id') || '';
  
//   // Changed 'ranger_name' to 'ranger_username' to match LoginPage
//   const storedName = localStorage.getItem('ranger_username'); 
  
//   // If you want the phone to show up, you must save it during Login too
//   const storedPhone = localStorage.getItem('ranger_phone');
//   const storedLang = localStorage.getItem('app_language');

//   if (storedName) this.rangerName = storedName;
//   if (storedPhone) this.rangerPhone = storedPhone;
//   if (storedLang) this.selectedLanguage = storedLang;
// }
//   // --- Language Management Methods ---
//   toggleLanguageModal(status: boolean) {
//     this.showLanguageModal = status;
//   }

//   setLanguage(lang: string) {
//     this.selectedLanguage = lang;
//   }

//   confirmLanguage() {
//     localStorage.setItem('app_language', this.selectedLanguage);
//     this.showLanguageModal = false;
//     // Logic to refresh translations would go here
//   }

//   // --- Profile/Protocol Methods ---
//   updateProtocol() {
//     // This maps to the (click)="updateProtocol()" in your HTML
//     this.updateRangerProfile();
//   }



//   updateRangerProfile() {
//     const updatedData = {
//       id: this.rangerId,
//       name: this.rangerName,
//       phone: this.rangerPhone,
//       password: this.rangerPassword
//     };

//     this.dataService.updateRanger(updatedData).subscribe({
//       next: async (res: any) => {
//         if(res.success) {
//           localStorage.setItem('ranger_name', this.rangerName);
//           localStorage.setItem('ranger_phone', this.rangerPhone);
          
//           // Use the toast instead of alert
//           await this.showToast(res.message || 'Protocol Updated Successfully!');
          
//           this.rangerPassword = ''; 
//         }
//       },
//       error: async (err) => {
//         const errorMsg = err.error?.message || 'Update failed';
//         const toast = await this.toastController.create({
//           message: errorMsg,
//           duration: 3000,
//           position: 'bottom',
//           color: 'danger'
//         });
//         await toast.present();
//       }
//     });
//   }

//   // --- Navigation & UI Methods ---
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



//   async showToast(msg: string) {
//   const toast = await this.toastController.create({
//     message: msg,
//     duration: 2000,
//     position: 'bottom',
//     color: 'success'
//   });
//   await toast.present();
// }

// // ... existing imports ...

//   goToPage(path: string) {
//     this.toggleMenu(false);
//     setTimeout(() => {
//       if (path === 'home') {
//         this.currentPage = 'home';
//       } else if (path === 'settings') {
//         this.currentPage = 'settings';
//       } else if (path === 'login') {
//         // 🔥 FIX: Do NOT use localStorage.clear()! 
//         // It deletes your saved categories. Only remove user session.
//         localStorage.removeItem('ranger_id');
//         localStorage.removeItem('ranger_username');
//         this.router.navigate(['/login']);
//       } else {
//         this.router.navigate(['/', path]).catch(err => console.error(err));
//       }
//     }, 150);
//   }
// }

import { Component, Renderer2, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentPage: 'home' | 'settings' | 'attendance' = 'home';
  activeTab: string = 'info';

  rangerId: string = '';
  rangerName: string = 'Ranger';
  rangerDivision: string = 'Washim Division 4.2';
  rangerPhone: string = '';
  rangerPassword: string = '';

  showLanguageModal: boolean = false;
  selectedLanguage: string = 'English'; 
  showPassword: boolean = false;
  showNewPassword: boolean = false;

  // Mapping display labels to JSON file codes
  private languageMap: { [key: string]: string } = {
    'English': 'en',
    'Hindi': 'hi',
    'Marathi': 'mr'
  };

  constructor(
    private router: Router, 
    private renderer: Renderer2, 
    private dataService: DataService,
    private toastController: ToastController,
    private translate: TranslateService 
  ) {}

  ngOnInit() {
    this.loadRangerData();
    this.initLanguage();
  }

  private initLanguage() {
    // Check localStorage for a saved language, default to 'en'
    const savedLangCode = localStorage.getItem('app_language_code') || 'en';
    this.translate.setDefaultLang('en');
    this.translate.use(savedLangCode);

    // Ensure the UI radio/check circle matches the active language code
    const reverseMap: { [key: string]: string } = { 'en': 'English', 'hi': 'Hindi', 'mr': 'Marathi' };
    this.selectedLanguage = reverseMap[savedLangCode] || 'English';
  }

  ionViewWillEnter() {
    const currentRangerId = this.dataService.getRangerId();
    if (currentRangerId) {
      this.dataService.getRangerProfile(currentRangerId).subscribe({
        next: (profile: any) => {
          this.rangerId = profile.id;
          this.rangerName = profile.username;
          this.rangerPhone = profile.phoneNo;
          localStorage.setItem('ranger_username', profile.username);
          localStorage.setItem('ranger_phone', profile.phoneNo);
        },
        error: (err) => console.error('Could not load profile', err)
      });
    }
    this.loadRangerData();
  }

  loadRangerData() {
    this.rangerId = localStorage.getItem('ranger_id') || '';
    const storedName = localStorage.getItem('ranger_username'); 
    const storedPhone = localStorage.getItem('ranger_phone');
    
    if (storedName) this.rangerName = storedName;
    if (storedPhone) this.rangerPhone = storedPhone;
  }

  toggleLanguageModal(status: boolean) {
    this.showLanguageModal = status;
  }

  setLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

async confirmLanguage() {
  // 1. Show a quick loader so the user knows something is happening
  const loading = await this.toastController.create({
    message: 'Loading Language...', // You can also use {{ 'COMMON.LOADING' | translate }}
    duration: 500,
    position: 'middle',
    cssClass: 'custom-loading-toast' // Optional: for styling
  });
  await loading.present();

  // 2. Get the code (en, hi, mr)
  const langCode = this.languageMap[this.selectedLanguage] || 'en';
  
  // 3. Tell the TranslateService to fetch the new JSON
  this.translate.use(langCode).subscribe({
    next: () => {
      // 4. Save both the CODE and the LABEL for total sync
      localStorage.setItem('app_language_code', langCode);
      localStorage.setItem('app_language_label', this.selectedLanguage);
      
      this.showLanguageModal = false;
      console.log(`Language switched to ${langCode} successfully`);
    },
    error: (err) => {
      console.error('Error loading language file:', err);
      // Optional: Show error toast if backend fails
    }
  });
}

  // UI Navigation & Profile logic
  updateProtocol() {
    this.updateRangerProfile();
  }

  updateRangerProfile() {
    const updatedData = {
      id: this.rangerId,
      name: this.rangerName,
      phone: this.rangerPhone,
      password: this.rangerPassword
    };

    this.dataService.updateRanger(updatedData).subscribe({
      next: async (res: any) => {
        if(res.success) {
          localStorage.setItem('ranger_username', this.rangerName);
          localStorage.setItem('ranger_phone', this.rangerPhone);
          
          this.translate.get('SETTINGS.UPDATE_SUCCESS').subscribe(async (msg) => {
            await this.showToast(msg);
          });
          
          this.rangerPassword = ''; 
        }
      },
      error: async (err) => {
        const errorMsg = err.error?.message || 'Update failed';
        const toast = await this.toastController.create({
          message: errorMsg,
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        await toast.present();
      }
    });
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

  async showToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  goToPage(path: string) {
    this.toggleMenu(false);
    setTimeout(() => {
      if (path === 'home') {
        this.currentPage = 'home';
      } else if (path === 'settings') {
        this.currentPage = 'settings';
      } else if (path === 'login') {
        localStorage.clear(); // Clear all on logout
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/', path]).catch(err => console.error(err));
      }
    }, 150);
  }
}