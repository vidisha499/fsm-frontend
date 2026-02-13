// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class LanguageService{
  
// }

// import { Injectable } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';
// import { BehaviorSubject } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class LanguageService {
//   // Key name must match what you use in AppComponent
//   private readonly LANG_KEY = 'app_language_code';

//   constructor(private translate: TranslateService) {
//     // 1. Set the fallback language
//     this.translate.setDefaultLang('en');
    
//     // 2. Initialize from storage or default to English
//     const savedLang = localStorage.getItem(this.LANG_KEY) || 'en';
//     this.setLanguage(savedLang);
//   }

//   setLanguage(lang: string) {
//     // 3. This triggers the update for all 'translate' pipes immediately
//     this.translate.use(lang);
    
//     // 4. Save for persistence
//     localStorage.setItem(this.LANG_KEY, lang);
//   }

//   getCurrentLanguage() {
//     return this.translate.currentLang || localStorage.getItem(this.LANG_KEY) || 'en';
//   }
// }

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'app_language_code';
  
  // Create a subject to track if translations are ready
  public isReady$ = new BehaviorSubject<boolean>(false);

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('en');
  }

  // New: This method is called by the APP_INITIALIZER
  async initLanguage(): Promise<void> {
    const savedLang = localStorage.getItem(this.LANG_KEY) || 'en';
    try {
      // FORCE the app to wait for the HTTP request to finish
      await firstValueFrom(this.translate.use(savedLang));
      this.isReady$.next(true);
      console.log('Language initialized:', savedLang);
    } catch (error) {
      console.error('Failed to load language', error);
      this.isReady$.next(true); // Still set to true so the app doesn't hang
    }
  }

  async setLanguage(lang: string) {
    // Return a promise so you can await this in your Login page
    await firstValueFrom(this.translate.use(lang));
    localStorage.setItem(this.LANG_KEY, lang);
    this.isReady$.next(true);
  }

  getCurrentLanguage() {
    return this.translate.currentLang || localStorage.getItem(this.LANG_KEY) || 'en';
  }
}