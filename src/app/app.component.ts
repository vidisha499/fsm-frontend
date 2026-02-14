// // import { Component } from '@angular/core';
// // import { LanguageService } from './services/language.service';

// // @Component({
// //   selector: 'app-root',
// //   templateUrl: 'app.component.html',
// //   styleUrls: ['app.component.scss'],
// //   standalone: false,
// // })
// // export class AppComponent {
// //   constructor(
// //     private langService: LanguageService
// //   ) {
// //   }
// // }

// import { Component } from '@angular/core';
// import { LanguageService } from './services/language.service';
// import { TranslateService } from '@ngx-translate/core'; // Add this

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   standalone: false,
// })
// export class AppComponent {
//   constructor(
//     private langService: LanguageService,
//     private translate: TranslateService // Inject this
//   ) {
//     this.translate.setDefaultLang('en');
//   const savedLang = localStorage.getItem('app_language_code') || 'en';
//   this.translate.use(savedLang);
//   }
// initializeApp() {
//   // Check if a language was saved in Step 1
//   const savedLang = localStorage.getItem('userLanguage') || 'en';
  
//   this.translate.setDefaultLang('en');
//   this.translate.use(savedLang); 
// }
// }

import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    this.initLanguage();
    this.initializeApp();
  }

  initializeApp() {
    // Force light mode by removing any dark class and ensuring light is set
    document.body.classList.toggle('dark', false);
    
    // Optional: If you use the Capacitor Dark Mode plugin, you can lock it here
  }

  initLanguage() {
    // Set default fallback language
    this.translate.setDefaultLang('en');
    
    // Get the language from storage (matching your Step 1 key name)
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    
    // Tell ngx-translate to use this language
    this.translate.use(savedLang);
  }
}