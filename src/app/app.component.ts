
// import { Component, Renderer2, QueryList, ViewChildren } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';
// import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController } from '@ionic/angular';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   standalone: false,
// })
// export class AppComponent {
//   // Definite assignment assertion (!) tells TS Angular will handle this
//   @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

//   constructor(
//     private translate: TranslateService,
//     private renderer: Renderer2,
//     private platform: Platform,
//     private actionSheetCtrl: ActionSheetController,
//     private modalCtrl: ModalController,
//     private menu: MenuController,
//     private navCtrl: NavController,
//     private router: Router
//   ) {
//     // Force Light Mode behavior
//     this.renderer.removeClass(document.body, 'dark');
//     this.renderer.addClass(document.body, 'light');
    
//     this.initLanguage();
//     this.initializeApp();
//   }

//   initializeApp() {
//     // Ensure dark mode is toggled off globally
//     document.body.classList.toggle('dark', false);

//     this.platform.ready().then(() => {
//       /**
//        * Priority 9999 is used to intercept the back button 
//        * before the default system/Capacitor exit logic triggers.
//        */
//       this.platform.backButton.subscribeWithPriority(9999, async () => {
        
//         // 1. Close active overlays (Menus, Action Sheets, Modals)
//         if (await this.menu.isOpen()) {
//           await this.menu.close();
//           return;
//         }

//         const actionSheet = await this.actionSheetCtrl.getTop();
//         if (actionSheet) {
//           await actionSheet.dismiss();
//           return;
//         }

//         const modal = await this.modalCtrl.getTop();
//         if (modal) {
//           await modal.dismiss();
//           return;
//         }

//         // 2. Specific fix: If on Settings page, force navigate to Home
//         // .includes('settings') covers '/settings' or '/tabs/settings'
//         if (this.router.url.includes('settings')) {
//           this.navCtrl.navigateRoot('/home'); 
//           return;
//         }

//         // 3. Default Navigation behavior
//         let canPop = false;
//         this.routerOutlets.forEach((outlet: IonRouterOutlet) => {
//           if (outlet && outlet.canGoBack()) {
//             outlet.pop();
//             canPop = true;
//           }
//         });

//         // 4. Exit App only if no pages are left to pop and we aren't in Settings
//         if (!canPop) {
//           (navigator as any)['app'].exitApp();
//         }
//       });
//     });
//   }

//   initLanguage() {
//     this.translate.setDefaultLang('en');
//     const savedLang = localStorage.getItem('app_language_code') || 'en';
//     this.translate.use(savedLang);
//   }
// }

import { Component, Renderer2, QueryList, ViewChildren } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

  // Side Menu & User State
  public rangerName: string = 'Ranger';
  public rangerDivision: string = 'Washim Division';
  public profileImage: string = '';
  
  // UI & Language State
  public showLanguageModal: boolean = false;
  public selectedLanguage: string = 'English';
  private languageMap: { [key: string]: string } = {
    'English': 'en',
    'Hindi': 'hi',
    'Marathi': 'mr'
  };

  constructor(
    public translate: TranslateService,
    private renderer: Renderer2,
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private navCtrl: NavController,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.renderer.removeClass(document.body, 'dark');
    this.renderer.addClass(document.body, 'light');
    
    this.initLanguage();
    this.initializeApp();
    this.loadMenuData();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, async () => {
        // Close Language Modal first
        if (this.showLanguageModal) {
          this.toggleLanguageModal(false);
          return;
        }

        // Close Custom Side Menu
        const customMenu = document.getElementById('side-menu');
        if (customMenu && !customMenu.classList.contains('-translate-x-full')) {
          this.toggleMenu(false);
          return;
        }

        // Close Overlays
        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) { await actionSheet.dismiss(); return; }
        const modal = await this.modalCtrl.getTop();
        if (modal) { await modal.dismiss(); return; }

        // Exit or Pop
        let canPop = false;
        this.routerOutlets.forEach((outlet: IonRouterOutlet) => {
          if (outlet && outlet.canGoBack()) {
            outlet.pop();
            canPop = true;
          }
        });

        if (!canPop) {
          (navigator as any)['app'].exitApp();
        }
      });
    });
  }

  loadMenuData() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    const savedImg = localStorage.getItem('profile_image');
    if (savedImg) {
      this.profileImage = savedImg.includes('data:image') ? savedImg : `data:image/jpeg;base64,${savedImg}`;
    }
  }

  /** * SIDE MENU LOGIC 
   */
  toggleMenu(isOpen: boolean) {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (!menu || !overlay) return;

    if (isOpen) {
      this.renderer.removeClass(menu, '-translate-x-full');
      this.renderer.removeClass(overlay, 'hidden');
    } else {
      this.renderer.addClass(menu, '-translate-x-full');
      this.renderer.addClass(overlay, 'hidden');
    }
  }

  goToPage(path: string) {
    this.toggleMenu(false);
    setTimeout(() => {
      if (path === 'login') {
        this.logout();
      } else if (path === 'settings') {
        // Navigates to Home and tells it to show the settings segment
        this.router.navigate(['/home'], { queryParams: { segment: 'settings' } });
      } else {
        this.router.navigate([`/${path}`]);
      }
    }, 250);
  }

  /** * LANGUAGE LOGIC 
   */
  toggleLanguageModal(status: boolean) {
    this.showLanguageModal = status;
    if (status) this.toggleMenu(false);
  }

  setLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  async confirmLanguage() {
    const langCode = this.languageMap[this.selectedLanguage] || 'en';
    const loader = await this.loadingController.create({
      message: 'Applying Language...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    this.translate.use(langCode).subscribe({
      next: () => {
        localStorage.setItem('app_language_code', langCode);
        this.showLanguageModal = false;
        setTimeout(() => {
          loader.dismiss();
          window.location.reload(); 
        }, 1000);
      },
      error: () => loader.dismiss()
    });
  }

  private initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
    const reverseMap: any = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
    this.selectedLanguage = reverseMap[savedLang] || 'English';
  }

  logout() {
    const lang = localStorage.getItem('app_language_code');
    localStorage.clear();
    if (lang) localStorage.setItem('app_language_code', lang);
    this.router.navigate(['/login']);
  }
}