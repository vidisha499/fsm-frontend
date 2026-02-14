import { Component, Renderer2, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { ToastController, LoadingController, Platform } from '@ionic/angular'; 
import { TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  currentPage: 'home' | 'settings' | 'attendance' = 'home';
  activeTab: string = 'info';

  // ✅ SOS State
  showSOSModal: boolean = false;

  // Ranger Data
  rangerId: string = '';
  rangerName: string = 'Ranger';
  rangerDivision: string = 'Washim Division 4.2';
  rangerPhone: string = '';
  rangerPassword: string = '';

  // UI State
  showLanguageModal: boolean = false;
  selectedLanguage: string = 'English';
  showPassword: boolean = false;
  showNewPassword: boolean = false;

  // 1. Vercel Configuration
  // private vercelBaseUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api';
  private vercelBaseUrl: string = 'https://forest-backend-pi.vercel.app/api';

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
    private loadingController: LoadingController,
    public translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.loadRangerData();
    this.initLanguage();

    // 2. Ensure DataService is using Vercel URL
    if (this.dataService) {
      (this.dataService as any).apiUrl = `${this.vercelBaseUrl}/rangers`;
    }
  }

  private initLanguage() {
    const savedLangCode = localStorage.getItem('app_language_code') || 'en';
    this.translate.setDefaultLang('en');
    this.translate.use(savedLangCode);

    const reverseMap: any = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
    this.selectedLanguage = reverseMap[savedLangCode] || 'English';
  }

  ionViewWillEnter() {
    // Listen for language changes
    this.translate.onLangChange.subscribe(() => {
      this.cdr.detectChanges(); 
    });

    const currentRangerId = this.dataService.getRangerId();
    if (currentRangerId) {
      // 3. Fetching profile from Vercel
      this.dataService.getRangerProfile(currentRangerId).subscribe({
        next: (profile: any) => {
          this.rangerId = profile.id;
          this.rangerName = profile.username;
          this.rangerPhone = profile.phoneNo;

          localStorage.setItem('ranger_username', profile.username);
          localStorage.setItem('ranger_phone', profile.phoneNo);
          
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Vercel Profile Load Error:', err)
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

  toggleSOSModal(status: boolean) {
    this.showSOSModal = status;
  }

  async triggerEmergency() {
    this.showSOSModal = false;

    // In a real scenario, you would do an http.post to /api/sos here
    const toast = await this.toastController.create({
      message: '🚨 EMERGENCY ALERT SENT TO HQ!',
      duration: 4000,
      position: 'top',
      color: 'danger',
      mode: 'ios'
    });
    await toast.present();
  }

  toggleLanguageModal(status: boolean) {
    this.showLanguageModal = status;
  }

  setLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  async confirmLanguage() {
    const langCode = this.languageMap[this.selectedLanguage] || 'en';
    
    const loader = await this.loadingController.create({
      message: this.selectedLanguage === 'Hindi' ? 'भाषा बदली जा रही है...' : 
               this.selectedLanguage === 'Marathi' ? 'भाषा बदलत आहे...' : 
               'Applying Language...',
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
        }, 1200);
      },
      error: async () => {
        await loader.dismiss();
        this.showToast('Error changing language');
      }
    });
  }

  updateProtocol() {
    this.updateRangerProfile();
  }

  async updateRangerProfile() {
    const loader = await this.loadingController.create({
      message: 'Updating Vercel Profile...',
      spinner: 'dots',
      mode: 'ios'
    });
    await loader.present();

    const updatedData = {
      id: this.rangerId,
      name: this.rangerName,
      phone: this.rangerPhone,
      password: this.rangerPassword
    };

    this.dataService.updateRanger(updatedData).subscribe({
      next: async (res: any) => {
        await loader.dismiss();
        // Adjust based on your backend response structure
        localStorage.setItem('ranger_username', this.rangerName);
        localStorage.setItem('ranger_phone', this.rangerPhone);

        const msg = await this.translate.get('SETTINGS.UPDATE_SUCCESS').toPromise();
        await this.showToast(msg || 'Updated Successfully');
        this.rangerPassword = '';
      },
      error: async (err) => {
        await loader.dismiss();
        console.error("Update Error:", err);
        const toast = await this.toastController.create({
          message: err.error?.message || 'Update failed',
          duration: 3000,
          color: 'danger',
          mode: 'ios'
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
    } else {
      this.renderer.addClass(menu, '-translate-x-full');
      this.renderer.addClass(overlay, 'hidden');
    }
  }

  async showToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      color: 'success',
      mode: 'ios'
    });
    await toast.present();
  }

  goToPage(path: string) {
    this.toggleMenu(false);

    setTimeout(() => {
      if (path === 'home') this.currentPage = 'home';
      else if (path === 'settings') this.currentPage = 'settings';
      else if (path === 'login') {
        const lang = localStorage.getItem('app_language_code');
        localStorage.clear();
        if (lang) localStorage.setItem('app_language_code', lang);
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/', path]);
      }
    }, 150);
  }
}