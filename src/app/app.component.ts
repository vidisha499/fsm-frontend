
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
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Added "!" to tell TypeScript this will be assigned by the view
  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

  constructor(
    private translate: TranslateService,
    private renderer: Renderer2,
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private menu: MenuController
  ) {
    this.renderer.removeClass(document.body, 'dark');
    this.renderer.addClass(document.body, 'light');
    this.initLanguage();
    this.initializeApp();
  }

  initializeApp() {
    document.body.classList.toggle('dark', false);

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(10, async () => {
        
        if (await this.menu.isOpen()) {
          this.menu.close();
          return;
        }

        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) {
          actionSheet.dismiss();
          return;
        }

        const modal = await this.modalCtrl.getTop();
        if (modal) {
          modal.dismiss();
          return;
        }

        this.routerOutlets.forEach((outlet: IonRouterOutlet) => {
          if (outlet && outlet.canGoBack()) {
            outlet.pop();
          } else {
            // Cast navigator to 'any' to avoid the TS7053 error
            (navigator as any)['app'].exitApp();
          }
        });
      });
    });
  }

  initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
  }
}