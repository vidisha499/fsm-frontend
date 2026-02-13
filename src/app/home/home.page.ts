import { Component, Renderer2, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { ToastController, LoadingController } from '@ionic/angular'; // Added LoadingController
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

  // Language label → code map
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
    private loadingController: LoadingController, // Injected
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.loadRangerData();
    this.initLanguage();
  }

  // ✅ Initialize Language
  private initLanguage() {
    const savedLangCode = localStorage.getItem('app_language_code') || 'en';
    this.translate.setDefaultLang('en');
    this.translate.use(savedLangCode);

    const reverseMap: any = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
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

  // ✅ SOS Logic
  toggleSOSModal(status: boolean) {
    this.showSOSModal = status;
  }

  async triggerEmergency() {
    this.showSOSModal = false;

    const toast = await this.toastController.create({
      message: '🚨 EMERGENCY ALERT SENT TO HQ!',
      duration: 4000,
      position: 'top',
      color: 'danger'
    });

    await toast.present();

    console.log("SOS Dispatch:", {
      id: this.rangerId,
      name: this.rangerName
    });
  }

  // ✅ Language Modal
  toggleLanguageModal(status: boolean) {
    this.showLanguageModal = status;
  }

  setLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  /**
   * ✅ Confirms language, shows loader, and refreshes app
   */
  async confirmLanguage() {
    const langCode = this.languageMap[this.selectedLanguage] || 'en';
    
    // Create professional loader
    const loader = await this.loadingController.create({
      message: this.selectedLanguage === 'Hindi' ? 'भाषा बदली जा रही है...' : 
               this.selectedLanguage === 'Marathi' ? 'भाषा बदलत आहे...' : 
               'Applying Language...',
      spinner: 'crescent',
      mode: 'ios'
    });

    await loader.present();

    // Use the translation service
    this.translate.use(langCode).subscribe({
      next: () => {
        localStorage.setItem('app_language_code', langCode);
        this.showLanguageModal = false;

        // Small timeout to allow the loader to be visible before refresh
        setTimeout(() => {
          loader.dismiss();
          window.location.reload(); // Refresh the app to apply all UI changes
        }, 1200);
      },
      error: async () => {
        await loader.dismiss();
        const toast = await this.toastController.create({
          message: 'Error changing language',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  // ✅ Profile Update
  updateProtocol() {
    this.updateRangerProfile();
  }

  async updateRangerProfile() {
    // Added loader for profile updates as well
    const loader = await this.loadingController.create({
      message: 'Updating Protocol...',
      duration: 5000 // Fallback
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
        if (res.success) {
          localStorage.setItem('ranger_username', this.rangerName);
          localStorage.setItem('ranger_phone', this.rangerPhone);

          const msg = await this.translate.get('SETTINGS.UPDATE_SUCCESS').toPromise();
          await this.showToast(msg || 'Updated Successfully');

          this.rangerPassword = '';
        }
      },
      error: async (err) => {
        await loader.dismiss();
        const toast = await this.toastController.create({
          message: err.error?.message || 'Update failed',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  // ✅ Side Menu
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
      color: 'success'
    });
    await toast.present();
  }

  // ✅ Navigation
  goToPage(path: string) {
    this.toggleMenu(false);

    setTimeout(() => {
      if (path === 'home') this.currentPage = 'home';
      else if (path === 'settings') this.currentPage = 'settings';
      else if (path === 'login') {
        localStorage.clear();
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/', path]);
      }
    }, 150);
  }
}