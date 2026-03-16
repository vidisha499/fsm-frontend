import { Component, Renderer2, QueryList, ViewChildren, OnInit, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

  // --- MENU & PROFILE DATA ---
  rangerName: string = 'Ranger';
  rangerDivision: string = 'Washim Division 4.2';
  rangerPhone: string = '';
  userPhoto: string = ''; 
  profileImage: string | null = null;

  // --- UI STATE VARIABLES ---
  showLanguageModal: boolean = false;
  selectedLanguage: string = 'English';
  currentPage: string = 'home'; 
  activeTab: string = 'info';    
  isEditMode: boolean = false;  
  showPassword: boolean = false; 
  showNewPassword: boolean = false;
  currentPassword: string = '';
  rangerPassword: string = '';

  // --- SLIDER STATE VARIABLES ---
  isSubmitting: boolean = false;
  currentTranslateX: number = 0;
  textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0; 
  passwordType: string = 'password';
  passwordIcon: string = 'eye-off';

  constructor(
    private translate: TranslateService,
    private renderer: Renderer2,
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef, // For Slider & UI updates
    private toastController: ToastController, // For success messages
    public router: Router 
  ) {
    this.renderer.removeClass(document.body, 'dark');
    this.renderer.addClass(document.body, 'light');
    
    this.initLanguage();
    this.initializeApp();
  }

  ngOnInit() {
    this.loadUserData();
  }

  // --- DATA LOADING LOGIC ---
  loadUserData() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    this.rangerPhone = localStorage.getItem('ranger_phone') || ''; 
    this.rangerDivision = localStorage.getItem('ranger_division') || 'Washim Division 4.2';
    
    const storedImg = localStorage.getItem('ranger_photo');
    if (storedImg) {
      this.profileImage = storedImg;
    }
    this.cdr.detectChanges();
  }

  initializeApp() {
    document.body.classList.toggle('dark', false);

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, async () => {
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

        if (this.currentPage === 'settings') {
          this.currentPage = 'home';
          this.cdr.detectChanges();
          return;
        }

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

  // --- NAVIGATION METHODS ---
  // async goToPage(path: string) {
  //   await this.menu.close();
    
  //   if (path === 'settings') {
  //     this.currentPage = 'settings'; 
  //     this.loadUserData(); // Settings khulte hi data refresh
  //   } else {
  //     this.currentPage = 'home';
  //     if (path === 'home') {
  //       this.navCtrl.navigateRoot('/home');
  //     } else {
  //       this.navCtrl.navigateForward(`/${path}`).catch(err => {
  //         console.log("Navigation error:", path);
  //       });
  //     }
  //   }
  //   this.cdr.detectChanges();
  // }

  async goToPage(path: string) {
  await this.menu.close();
  
  if (path === 'settings') {
    this.currentPage = 'settings'; 
    this.loadUserData(); 
  } else {
    this.currentPage = 'home';
    if (path === 'home') {
      // Direct the user to the Super Admin route instead of generic home
      this.navCtrl.navigateRoot('/home/admin'); 
    } else {
      // For other pages like 'attendance', 'updates', etc.
      this.navCtrl.navigateForward(`/${path}`).catch(err => {
        console.log("Navigation error for path:", path);
      });
    }
  }
  this.cdr.detectChanges();
}

  // --- SETTINGS METHODS ---
  toggleEdit() {
    this.isEditMode = !this.isEditMode;
    this.cdr.detectChanges();
  }

  changeProfilePicture() {
    console.log("Opening camera/gallery logic...");
    // Add Capacitor Camera logic here
  }

  // --- SLIDER DRAG LOGIC ---
  onDragStart(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;

    const container = document.querySelector('.slider-track');
    if (container) {
      this.maxSlide = container.clientWidth - 64; 
    }
    this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;

    let diff = event.touches[0].clientX - this.startX;

    if (diff < 0) diff = 0;
    if (diff > this.maxSlide) diff = this.maxSlide;

    this.currentTranslateX = diff;
    this.textOpacity = 1 - (diff / this.maxSlide);
    this.cdr.detectChanges(); // Update slider handle position
  }

  async onDragEnd() {
    if (this.isSubmitting || !this.isEditMode) return;

    if (this.currentTranslateX >= this.maxSlide * 0.8) {
      this.currentTranslateX = this.maxSlide;
      this.textOpacity = 0;
      this.submitData(); 
    } else {
      this.currentTranslateX = 0;
      this.textOpacity = 1;
    }
    this.cdr.detectChanges();
  }

  async submitData() {
    this.isSubmitting = true;
    this.cdr.detectChanges();

    // Simulate API Update
    setTimeout(async () => {
      // Data local storage mein save karein
      localStorage.setItem('ranger_username', this.rangerName);
      localStorage.setItem('ranger_phone', this.rangerPhone);
      
      this.isSubmitting = false;
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.isEditMode = false;

      const toast = await this.toastController.create({
        message: 'Profile Protocol Updated!',
        duration: 2000,
        color: 'success',
        mode: 'ios',
        position: 'top'
      });
      await toast.present();

      this.cdr.detectChanges();
    }, 2000);
  }

  // --- LANGUAGE & AUTH ---
  async toggleLanguageModal(show: boolean) {
    if (show) {
      await this.menu.close(); 
      setTimeout(() => { this.showLanguageModal = true; this.cdr.detectChanges(); }, 100); 
    } else {
      this.showLanguageModal = false;
      this.cdr.detectChanges();
    }
  }

  confirmLanguage() {
    const langCode = this.selectedLanguage === 'Hindi' ? 'hi' : (this.selectedLanguage === 'Marathi' ? 'mr' : 'en');
    this.translate.use(langCode);
    localStorage.setItem('app_language_code', langCode);
    this.toggleLanguageModal(false);
  }

  initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
    this.selectedLanguage = savedLang === 'hi' ? 'Hindi' : (savedLang === 'mr' ? 'Marathi' : 'English');
  }

  async logout() {
    await this.menu.close();
    const lang = localStorage.getItem('app_language_code');
    localStorage.clear();
    if (lang) localStorage.setItem('app_language_code', lang);
    this.navCtrl.navigateRoot('/login');
  }

  togglePasswordVisibility() {
  this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
  this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
  this.cdr.detectChanges();
}

}