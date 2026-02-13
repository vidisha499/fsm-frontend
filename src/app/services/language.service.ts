import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'app_language_code';
  
  public isReady$ = new BehaviorSubject<boolean>(false);

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('en');
  }

  /**
   * Called by APP_INITIALIZER to block app load until 
   * the translation JSON is fetched from the server/assets.
   */
  async initLanguage(): Promise<void> {
    const savedLang = localStorage.getItem(this.LANG_KEY) || 'en';
    try {
      await firstValueFrom(this.translate.use(savedLang));
      this.isReady$.next(true);
      console.log('Language initialized from Vercel/Local assets:', savedLang);
    } catch (error) {
      console.error('Failed to load language', error);
      this.isReady$.next(true); 
    }
  }

  async setLanguage(lang: string) {
    await firstValueFrom(this.translate.use(lang));
    localStorage.setItem(this.LANG_KEY, lang);
    this.isReady$.next(true);
  }

  /**
   * HELPER: Use this during Login/Logout to ensure the 
   * language isn't lost when you call localStorage.clear()
   */
  async preserveAndSetLanguage() {
    const currentLang = this.getCurrentLanguage();
    // After your localStorage.clear(), call this:
    localStorage.setItem(this.LANG_KEY, currentLang);
  }

  getCurrentLanguage() {
    return this.translate.currentLang || localStorage.getItem(this.LANG_KEY) || 'en';
  }
}