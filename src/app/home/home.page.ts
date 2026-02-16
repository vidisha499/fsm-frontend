import { Component, Renderer2, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { ToastController, LoadingController, Platform , ActionSheetController} from '@ionic/angular'; 
import { TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

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
  // Navigation Logic
  

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
    header: 'CHANGE PROFILE PICTURE',
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
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: source 
    });

    if (image.base64String) {
      // 1. Start the loading state (Starts the slider animation)
      this.isSubmitting = true; 
      
      // 2. Update UI immediately for instant feedback
      this.profileImage = `data:image/jpeg;base64,${image.base64String}`;
      this.cdr.detectChanges();
      
      // 3. Prepare data for Sync
      const rId = this.dataService.getRangerId();
      if (!rId) {
        this.isSubmitting = false; // Reset slider if error
        this.showToast('Error: Ranger ID not found');
        return;
      }

      const updatedData = {
        id: +rId,
        profilePic: image.base64String 
      };

      // 4. Sync to Database
      this.dataService.updateRanger(updatedData).subscribe({
        next: () => {
          // Success: Keep the slider at the end for 1.5 seconds then reset
          setTimeout(() => {
            this.isSubmitting = false;
            this.showToast('Profile picture synced successfully');
          }, 1500);
        },
        error: (err) => {
          console.error('DB Update Error:', err);
          this.isSubmitting = false; // Reset slider so they can try again
          this.showToast('Failed to save photo to database');
        }
      });
    }
  } catch (error) {
    // If the user simply closes the camera/gallery without picking a photo
    this.isSubmitting = false; 
    console.warn('User cancelled photo selection');
  }
}
  
// async changeProfilePicture() {
//   try {
//     const image = await Camera.getPhoto({
//       quality: 90,
//       allowEditing: true,
//       resultType: CameraResultType.Base64,
//       source: CameraSource.Prompt // Offers Gallery or Camera
//     });

//     if (image.base64String) {
//       // Update UI immediately
//       this.profileImage = `data:image/jpeg;base64,${image.base64String}`;
//       this.cdr.detectChanges();
      
//       // Optional: Call updateProtocol() automatically to save the photo immediately
//       // this.updateProtocol(); 
//     }
//   } catch (error) {
//     console.warn('User cancelled photo selection');
//   }
// }

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
        this.rangerName = profile.username;
        this.rangerPhone = profile.phoneNo;
        // ✅ ADD THESE: So they don't reset on refresh
        this.rangerDivision = profile.division || 'Washim Division 4.2';
        
        // Update LocalStorage
        localStorage.setItem('ranger_username', profile.username);
        localStorage.setItem('ranger_phone', profile.phoneNo);
        
        this.cdr.detectChanges();

        if (profile.profile_pic) {
      this.profileImage = `data:image/jpeg;base64,${profile.profile_pic}`;
    }
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


// async updateProtocol() {
//   const rId = this.dataService.getRangerId();
  
//   // This check tells TypeScript that rId is definitely NOT null below this line
//   if (!rId) {
//     const toast = await this.toastController.create({
//       message: 'Error: Ranger ID not found. Please log in again.',
//       duration: 3000,
//       color: 'danger'
//     });
//     await toast.present();
//     return;
//   }

//   const loader = await this.loadingController.create({
//     message: 'Updating Vercel Profile...',
//     spinner: 'dots',
//     mode: 'ios'
//   });
//   await loader.present();

//   const updatedData = {
//     id: +rId, // Now safe to use + because we checked if (!rId) above
//     name: this.rangerName,
//     phone: this.rangerPhone,
//     password: this.rangerPassword,
//     profilePic: this.profileImage.includes('base64') ? this.profileImage.split(',')[1] : null
//   };

//   this.dataService.updateRanger(updatedData).subscribe({
//     next: async (res: any) => {
//       await loader.dismiss();
      
//       localStorage.setItem('ranger_username', this.rangerName);
//       localStorage.setItem('ranger_phone', this.rangerPhone);

//       const msg = await this.translate.get('SETTINGS.UPDATE_SUCCESS').toPromise();
//       await this.showToast(msg || 'Updated Successfully');
      
//       this.rangerPassword = '';
//       this.isEditMode = false; // Auto-locks the UI
//       this.cdr.detectChanges();
//     },
//     error: async (err) => {
//       await loader.dismiss();
//       console.error("Update Error:", err);
//       this.showToast('Update failed. Check connection.');
//     }
//   });
// }


async updateProtocol() {
  const rId = this.dataService.getRangerId();
  
  if (!rId) {
    this.showToast('Error: Ranger ID not found. Please log in again.');
    return;
  }

  // 1. Start the Slider Animation
  this.isSubmitting = true; 
  this.cdr.detectChanges();

  const updatedData = {
    id: +rId,
    name: this.rangerName,
    phone: this.rangerPhone,
    password: this.rangerPassword,
    profilePic: this.profileImage.includes('base64') ? this.profileImage.split(',')[1] : null
  };

  this.dataService.updateRanger(updatedData).subscribe({
    next: async (res: any) => {
      // 2. Success: Keep slider at the end for a second so user sees the checkmark
      localStorage.setItem('ranger_username', this.rangerName);
      localStorage.setItem('ranger_phone', this.rangerPhone);

      setTimeout(async () => {
        this.isSubmitting = false; // Slide back
        this.isEditMode = false;   // Lock UI
        
        const msg = await this.translate.get('SETTINGS.UPDATE_SUCCESS').toPromise();
        this.showToast(msg || 'Updated Successfully');
        
        this.rangerPassword = '';
        this.cdr.detectChanges();
      }, 1500);
    },
    error: async (err) => {
      // 3. Error: Reset slider immediately so they can try again
      this.isSubmitting = false;
      console.error("Update Error:", err);
      this.showToast('Update failed. Check connection.');
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
}