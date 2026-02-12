// import { Component } from '@angular/core';
// import { LanguageService } from './services/language.service';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   standalone: false,
// })
// export class AppComponent {
//   constructor(
//     private langService: LanguageService
//   ) {
//   }
// }

import { Component } from '@angular/core';
import { LanguageService } from './services/language.service';
import { TranslateService } from '@ngx-translate/core'; // Add this

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private langService: LanguageService,
    private translate: TranslateService // Inject this
  ) {
    this.translate.setDefaultLang('en');
  const savedLang = localStorage.getItem('app_language_code') || 'en';
  this.translate.use(savedLang);
  }
initializeApp() {
  // Check if a language was saved in Step 1
  const savedLang = localStorage.getItem('userLanguage') || 'en';
  
  this.translate.setDefaultLang('en');
  this.translate.use(savedLang); 
}
}