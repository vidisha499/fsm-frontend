import { Component, Renderer2, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { ToastController, LoadingController, Platform , ActionSheetController} from '@ionic/angular'; 
import { TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
     private backButtonSub?: Subscription;
     public currentTranslateX: number = 0;
public textOpacity: number = 1;
private startX: number = 0;
private maxSlide: number = 0;

  currentPage: 'home' | 'settings' | 'attendance' = 'home';
  activeTab: string = 'info';
  isEditMode: boolean = false;
 profileImage: string = '';
isSubmitting: boolean = false;
  // ✅ SOS State
  showSOSModal: boolean = false;
  

  // Ranger Data
  rangerId: string = '';
  rangerName: string = 'Ranger';
  rangerDivision: string = 'Washim Division 4.2';
  rangerPhone: string = '';
  rangerPassword: string = '';
  currentPassword: string = '';
 
  // Navigation Logic
  

  // UI State
  showLanguageModal: boolean = false;
  selectedLanguage: string = 'English';
  showPassword: boolean = false;
  showNewPassword: boolean = false;
passwordType: string = 'password';
  passwordIcon: string = 'eye-off';
  
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
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
 
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


  async changeProfilePicture() {
  const actionSheet = await this.actionSheetCtrl.create({
    header: 'Change Profile Picture',
    cssClass: 'premium-action-sheet',
    buttons: [
      { 
        text: 'Take Picture', 
        icon: 'camera-outline', 
        handler: () => this.captureProfileImage(CameraSource.Camera) 
      },
      { 
        text: 'From Photos', 
        icon: 'image-outline', 
        handler: () => this.captureProfileImage(CameraSource.Photos) 
      },
      { 
        text: 'Cancel', 
        icon: 'close-outline', 
        role: 'cancel' 
      }
    ]
  });
  await actionSheet.present();
}



async captureProfileImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 60, // Optimized for Vercel body limits
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: source 
      });

      if (image.base64String) {
        this.isSubmitting = true; 
        
        // Update UI immediately
        this.profileImage = `data:image/jpeg;base64,${image.base64String}`;
        this.cdr.detectChanges();
        
        const rId = this.dataService.getRangerId();
        if (!rId) {
          this.isSubmitting = false;
          this.showToast('Error: Ranger ID not found');
          return;
        }

        // KEY FIX: Matching your DB schema 'profile_pic'
        const updatedData = {
          id: +rId,
          profile_pic: image.base64String 
        };

        this.dataService.updateRanger(updatedData).subscribe({
          next: () => {
            setTimeout(() => {
              this.isSubmitting = false;
              this.showToast('Profile photo updated successfully');
            }, 1500);
          },
          error: (err) => {
            console.error('DB Update Error:', err);
            this.isSubmitting = false;
            this.showToast('Failed to save photo');
          }
        });
      }
    } catch (error) {
      this.isSubmitting = false; 
    }
  }
  
onDragStart(event: TouchEvent) {
  if (this.isSubmitting || !this.isEditMode) return;
  this.startX = event.touches[0].clientX - this.currentTranslateX;
  
  const container = document.querySelector('.slider-track');
  if (container) {
    // 52px knob width + 12px total padding (6px left + 6px right)
    this.maxSlide = container.clientWidth - 64; 
  }
}

onDragMove(event: TouchEvent) {
  if (this.isSubmitting || !this.isEditMode) return;

  let moveX = event.touches[0].clientX - this.startX;

  // Constrain movement
  if (moveX < 0) moveX = 0;
  if (moveX > this.maxSlide) moveX = this.maxSlide;

  this.currentTranslateX = moveX;
  this.textOpacity = 1 - (moveX / this.maxSlide);
  this.cdr.detectChanges();
}

onDragEnd() {
  if (this.isSubmitting || !this.isEditMode) return;

  // If slid past 85%, trigger the update
  if (this.currentTranslateX >= this.maxSlide * 0.85) {
    this.currentTranslateX = this.maxSlide;
    this.textOpacity = 0;
    this.updateProtocol(); 
  } else {
    // Snap back to start
    this.currentTranslateX = 0;
    this.textOpacity = 1;
  }
  this.cdr.detectChanges();
}


toggleEdit() {
    this.isEditMode = !this.isEditMode;
  }




ionViewWillEnter() {
    this.translate.onLangChange.subscribe(() => {
      this.cdr.detectChanges(); 
    });

    const currentRangerId = this.dataService.getRangerId();
    if (currentRangerId) {
      this.dataService.getRangerProfile(currentRangerId).subscribe({
        next: (profile: any) => {
          this.rangerId = profile.id;
          // KEY FIX: Using the exact column names from your DB screenshot
          this.rangerName = profile.username; 
          // this.rangerPhone = profile.phone_no; 
          this.rangerPhone = profile.phone_no || profile.phoneNo || '';
          this.rangerDivision = profile.division || 'Washim Division 4.2';
          this.rangerPassword = '';
          if (profile.profile_pic) {
            // Check if it already has the data prefix
            this.profileImage = profile.profile_pic.includes('data:image') 
              ? profile.profile_pic 
              : `data:image/jpeg;base64,${profile.profile_pic}`;
          }

          localStorage.setItem('ranger_username', this.rangerName);
          localStorage.setItem('ranger_phone', this.rangerPhone);
          
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


async updateProtocol() {
    const rId = this.dataService.getRangerId();
    
    if (!rId) {
      this.showToast('Error: Ranger ID not found.');
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true; 
    this.textOpacity = 0; 
    
    const container = document.querySelector('.slider-track');
    if (container) {
      this.maxSlide = container.clientWidth - 64; 
    }
    this.currentTranslateX = this.maxSlide; 
    this.cdr.detectChanges();

    const updatedData = {
      // id: +rId,
      id: Number(rId),
      name: this.rangerName,     // ✅ Backend 'name' mang raha hai
      phone: this.rangerPhone,
      password: this.rangerPassword, // Agar password change kiya hai toh jayega
      profile_pic: this.profileImage && this.profileImage.includes('base64') 
                   ? this.profileImage.split(',')[1] : null
    };

    this.dataService.updateRanger(updatedData).subscribe({
      next: async (res: any) => {
        localStorage.setItem('ranger_username', this.rangerName);
        localStorage.setItem('ranger_phone', this.rangerPhone);

        setTimeout(async () => {
          this.isSubmitting = false; 
          this.isEditMode = false;   
          this.currentTranslateX = 0; 
          this.textOpacity = 1;
          this.rangerPassword = '';
          this.passwordType = 'password';
          this.currentPassword = '';
          
          const msg = await this.translate.get('SETTINGS.UPDATE_SUCCESS').toPromise();
          this.showToast(msg || 'Profile Protocol Updated');
          
          // --- Password Reset Logic Start ---
          this.rangerPassword = ''; 
          this.passwordType = 'password';// Input field khali ho jayegi
          
          // Agar aapne password hide/show icons use kiye hain, toh unhe reset karein
          this.passwordType = 'password'; 
          this.passwordIcon = 'eye-off'; 

          // Agar 'Confirm Password' field bhi hai, toh use bhi saaf karein
          // this.confirmPassword = ''; 
          // --- Password Reset Logic End ---

          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.currentTranslateX = 0;
        this.textOpacity = 1;
        this.showToast('Update failed. Check your network.');
        this.cdr.detectChanges();
      }
    });
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

  // Password toggle karne ka function
togglePasswordVisibility() {
  this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
  this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
  this.cdr.detectChanges();
}
}