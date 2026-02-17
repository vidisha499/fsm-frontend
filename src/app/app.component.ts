
// import { Component , Renderer2 } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   standalone: false,
// })
// export class AppComponent {
//   constructor(private translate: TranslateService,
//     private renderer: Renderer2
//   ) {
//     this.renderer.removeClass(document.body, 'dark');
//     this.renderer.addClass(document.body, 'light');
//     this.initLanguage();
//     this.initializeApp();
//   }

//   initializeApp() {
//     // Force light mode by removing any dark class and ensuring light is set
//     document.body.classList.toggle('dark', false);
    
//     // Optional: If you use the Capacitor Dark Mode plugin, you can lock it here
//   }

//   initLanguage() {
//     // Set default fallback language
//     this.translate.setDefaultLang('en');
    
//     // Get the language from storage (matching your Step 1 key name)
//     const savedLang = localStorage.getItem('app_language_code') || 'en';
    
//     // Tell ngx-translate to use this language
//     this.translate.use(savedLang);
//   }
// }
import { Component, Renderer2, QueryList, ViewChildren } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Definite assignment assertion (!) tells TS Angular will handle this
  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

  constructor(
    private translate: TranslateService,
    private renderer: Renderer2,
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private navCtrl: NavController,
    private router: Router
  ) {
    // Force Light Mode behavior
    this.renderer.removeClass(document.body, 'dark');
    this.renderer.addClass(document.body, 'light');
    
    this.initLanguage();
    this.initializeApp();
  }

  initializeApp() {
    // Ensure dark mode is toggled off globally
    document.body.classList.toggle('dark', false);

    this.platform.ready().then(() => {
      /**
       * Priority 9999 is used to intercept the back button 
       * before the default system/Capacitor exit logic triggers.
       */
      this.platform.backButton.subscribeWithPriority(9999, async () => {
        
        // 1. Close active overlays (Menus, Action Sheets, Modals)
        if (await this.menu.isOpen()) {
          await this.menu.close();
          return;
        }

        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) {
          await actionSheet.dismiss();
          return;
        }

        const modal = await this.modalCtrl.getTop();
        if (modal) {
          await modal.dismiss();
          return;
        }

        // 2. Specific fix: If on Settings page, force navigate to Home
        // .includes('settings') covers '/settings' or '/tabs/settings'
        if (this.router.url.includes('settings')) {
          this.navCtrl.navigateRoot('/home'); 
          return;
        }

        // 3. Default Navigation behavior
        let canPop = false;
        this.routerOutlets.forEach((outlet: IonRouterOutlet) => {
          if (outlet && outlet.canGoBack()) {
            outlet.pop();
            canPop = true;
          }
        });

        // 4. Exit App only if no pages are left to pop and we aren't in Settings
        if (!canPop) {
          (navigator as any)['app'].exitApp();
        }
      });
    });
  }

  initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
  }
}