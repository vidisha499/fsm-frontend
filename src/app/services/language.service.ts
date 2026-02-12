// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class LanguageService{
  
// }

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  constructor(private translate: TranslateService) {
    // Initialize default language
    const defaultLang = localStorage.getItem('selected_language') || 'en';
    this.translate.setDefaultLang('en');
    this.setLanguage(defaultLang);
  }

  setLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('selected_language', lang);
  }
}