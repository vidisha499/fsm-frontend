import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoadingController, AlertController, NavController, ToastController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit, OnDestroy {
  // UI States
  isPasswordVisible = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isResetModalOpen = false;
  isOtpVerified = false;

  // Timer States
  resendCountdown = 0;
  timerInterval: any;
  tempPhone = '';

  // Data Models
  loginData = { phone: '', password: '' };
  resetData = { otp: '', newPassword: '', confirmPassword: '' };

  private loginSub?: Subscription;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private dataService: DataService,
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    // Initial checks if needed
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.loginSub) this.loginSub.unsubscribe();
  }

  // --- Core Login Logic ---
  // async login() {
  //   if (!this.loginData.phone || !this.loginData.password) {
  //     this.presentToast('Please enter both phone and password', 'warning');
  //     return;
  //   }

  //   const loading = await this.loadingCtrl.create({
  //     message: 'Authenticating...',
  //     spinner: 'crescent',
  //     mode: 'ios'
  //   });
  //   await loading.present();

  //   const payload = { 
  //     phoneNo: this.loginData.phone.trim(), 
  //     password: this.loginData.password 
  //   };

  //   this.loginSub = this.dataService.login(payload).subscribe({
  //     next: async (res: any) => {
  //       await loading.dismiss();
        
  //       // Ensure backend returns an ID
  //       if (res && (res.id || res.rangerId)) {
  //         const rId = (res.id || res.rangerId).toString();
  //         const currentLang = localStorage.getItem('app_language_code') || 'en';
          
  //         // Store Credentials
  //         localStorage.setItem('ranger_username', res.username || 'Ranger');
  //         localStorage.setItem('ranger_id', rId);
  //         this.dataService.saveRangerId(rId);

  //         // Force language load before entering home
  //         this.translate.use(currentLang).subscribe({
  //           next: () => this.navCtrl.navigateRoot('/home'),
  //           error: () => this.navCtrl.navigateRoot('/home')
  //         });
  //       } else {
  //         this.presentToast('Invalid server response structure', 'danger');
  //       }
  //     },
  //     error: async (err) => {
  //       await loading.dismiss();
  //       console.error('CORS or Auth Error:', err);
        
  //       if (err.status === 0) {
  //         this.presentToast('Network Error: Check Vercel CORS configuration', 'danger');
  //       } else {
  //         this.presentToast(err.error?.message || 'Invalid Credentials', 'danger');
  //       }
  //     }
  //   });
  // }



//   async login() {
//   if (!this.loginData.phone || !this.loginData.password) {
//     this.presentToast('Please enter both identifier and password', 'warning');
//     return;
//   }

//   const loading = await this.loadingCtrl.create({
//     message: 'Authenticating...',
//     spinner: 'crescent',
//     mode: 'ios'
//   });
//   await loading.present();

//   // 1. Payload match karo (Backend 'identifier' aur 'pass' maang raha hai)
//   const payload = { 
//     identifier: this.loginData.phone.trim(), // Phone ya Email dono chalega
//     pass: this.loginData.password 
//   };

//   this.loginSub = this.dataService.login(payload).subscribe({
//     next: async (res: any) => {
//       await loading.dismiss();
      
//       // 2. Naya Response Structure check karo
//       if (res && res.id) {
//         // Store User Info
//         localStorage.setItem('user_id', res.id.toString());
//         localStorage.setItem('user_name', res.name);
//         localStorage.setItem('user_role', res.role_type); // SUPER_ADMIN ya RANGER

//         const currentLang = localStorage.getItem('app_language_code') || 'en';
        
//         // 3. Backend se aayi hui 'redirect_to' path par bhejo
//         this.translate.use(currentLang).subscribe({
//           next: () => this.navCtrl.navigateRoot(res.redirect_to),
//           error: () => this.navCtrl.navigateRoot(res.redirect_to)
//         });

//         this.presentToast(`Welcome back, ${res.name}!`, 'success');
//       }
//     },
//     error: async (err) => {
//       await loading.dismiss();
//       console.error('Login Error:', err);
//       this.presentToast(err.error?.message || 'Invalid Credentials', 'danger');
//     }
//   });
// }


// async login() {
//   if (!this.loginData.phone || !this.loginData.password) {
//     this.presentToast('Please enter both contact and password', 'warning');
//     return;
//   }

//   const loading = await this.loadingCtrl.create({ 
//     message: 'Authenticating...', 
//     mode: 'ios'
//   });
//   await loading.present();

//   const payload = { 
//     identifier: this.loginData.phone.trim(), 
//     pass: this.loginData.password 
//   };

//   this.loginSub = this.dataService.login(payload).subscribe({
//     next: async (res: any) => {
//       await loading.dismiss();

//       // Backend se aane wala data (res mein ya res.user mein)
//       const userData = res.user || res;
//       const userRole = parseInt(res.role_id || userData.role_id);
      
//       // --- FIX: Extract Company ID ---
//       const actualCompanyId = userData.company_id;

//       if (actualCompanyId !== undefined && actualCompanyId !== null) {
//         localStorage.setItem('company_id', actualCompanyId.toString());
//         console.log('Login Success! Company ID set to:', actualCompanyId);
//       } else {
//         // Agar ID null hai toh 0 save karo, "1" nahi!
//         console.warn('Warning: No company_id received from backend.');
//         localStorage.setItem('company_id', '0'); 
//       }

//       if (userData && userData.id) {
//         // Baaki sab data save karein
//         localStorage.setItem('ranger_id', userData.id.toString());
//         localStorage.setItem('user_role', userRole.toString());
//         localStorage.setItem('user_name', userData.name || 'User');

//         const currentLang = localStorage.getItem('app_language_code') || 'en';
        
//         this.translate.use(currentLang).subscribe({
//           next: () => {
//             // Dashboard par redirect karein
//             if (userRole === 1) this.navCtrl.navigateRoot('/super-admin-dashboard'); 
//             else if (userRole === 2) this.navCtrl.navigateRoot('/admin'); 
//             else this.navCtrl.navigateRoot('/home');
//           }
//         });

//         this.presentToast(`Welcome, ${userData.name}!`, 'success');
//       }
//     },
//     error: async (err) => {
//       await loading.dismiss();
//       console.error('Login Error:', err);
//       this.presentToast(err.error?.message || 'Invalid Contact or Password', 'danger');
//     }
//   });
// }



async login() {
  if (!this.loginData.phone || !this.loginData.password) {
    this.presentToast('Please enter both contact and password', 'warning');
    return;
  }

  const loading = await this.loadingCtrl.create({ 
    message: 'Authenticating...', 
    mode: 'ios',
    spinner: 'crescent'
  });
  await loading.present();

  const payload = { 
    identifier: this.loginData.phone.trim(), 
    pass: this.loginData.password 
  };

  this.loginSub = this.dataService.login(payload).subscribe({
    next: async (res: any) => {
      await loading.dismiss();

      // Backend se aane wala data extract karein
      const userData = res.user || res;
      const userRole = parseInt(res.role_id || userData.role_id);
      const actualCompanyId = userData.company_id;

      if (userData && userData.id) {
        // --- 1. SESSION STORAGE (Key names matched with Dashboard/Menu) ---
        localStorage.setItem('ranger_id', userData.id.toString());
        localStorage.setItem('user_role', userRole.toString());
        
        // Dashboard aur Side Menu yahi key dhoond rahe hain
        localStorage.setItem('ranger_username', userData.name || 'User'); 
        
        // Division agar backend se aa raha ho, nahi toh default set karein
        localStorage.setItem('ranger_division', userData.division || 'Washim Division 4.2');
        
        // Profile Photo
        if (userData.photo_url || userData.profile_image) {
          localStorage.setItem('user_photo', userData.photo_url || userData.profile_image);
        }

        // Company ID set karna (Attendance filtering ke liye important hai)
        if (actualCompanyId !== undefined && actualCompanyId !== null) {
          localStorage.setItem('company_id', actualCompanyId.toString());
        } else {
          localStorage.setItem('company_id', '0');
        }

        // --- 2. LANGUAGE & NAVIGATION ---
        const currentLang = localStorage.getItem('app_language_code') || 'en';
        
        this.translate.use(currentLang).subscribe({
          next: () => {
            this.presentToast(`Welcome, ${userData.name}!`, 'success');

            // Role based navigation
            if (userRole === 1) {
              this.navCtrl.navigateRoot('/super-admin-dashboard'); 
            } else if (userRole === 2) {
              this.navCtrl.navigateRoot('/admin'); // Aapka Company Admin Dashboard
            } else {
              this.navCtrl.navigateRoot('/home'); // Ranger Dashboard
            }
          },
          error: () => {
            this.navCtrl.navigateRoot(userRole === 2 ? '/admin' : '/home');
          }
        });
      } else {
        this.presentToast('User data not found in response', 'danger');
      }
    },
    error: async (err) => {
      await loading.dismiss();
      console.error('Login Error:', err);
      const errorMsg = err.error?.message || 'Invalid Contact or Password';
      this.presentToast(errorMsg, 'danger');
    }
  });
}

  // --- Password Reset Flow ---
  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Reset Password',
      message: 'Enter your registered phone number to receive an OTP.',
      inputs: [{ name: 'phoneNo', type: 'tel', placeholder: 'Mobile Number' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Send OTP', 
          handler: (data) => { this.sendResetRequest(data.phoneNo); } 
        }
      ]
    });
    await alert.present();
  }

  async sendResetRequest(phoneNo: string) {
    if (!phoneNo) {
      this.presentToast('Phone number required', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Requesting OTP...' });
    await loading.present();

    this.dataService.requestPasswordReset(phoneNo).subscribe({
      next: () => {
        loading.dismiss();
        this.tempPhone = phoneNo;
        this.isResetModalOpen = true;
        this.startResendTimer();
        this.presentToast('OTP sent successfully', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast(err.error?.message || 'Phone not found', 'danger');
      }
    });
  }

  async verifyOtpOnly() {
    if (!this.resetData.otp) return;

    const loading = await this.loadingCtrl.create({ message: 'Verifying...' });
    await loading.present();

    this.dataService.verifyOtp(this.tempPhone, this.resetData.otp).subscribe({
      next: () => {
        loading.dismiss();
        this.isOtpVerified = true;
        this.presentToast('OTP Verified!', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast('Invalid OTP', 'danger');
      }
    });
  }

  async handlePasswordReset() {
    if (this.resetData.newPassword !== this.resetData.confirmPassword) {
      this.presentToast('Passwords do not match', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Updating...' });
    await loading.present();

    this.dataService.resetPassword(this.tempPhone, this.resetData.otp, this.resetData.newPassword).subscribe({
      next: () => {
        loading.dismiss();
        this.closeResetModal();
        this.presentToast('Password Updated. Please login.', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast('Update failed', 'danger');
      }
    });
  }

  // --- Helper Methods ---
  startResendTimer() {
    this.resendCountdown = 30;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.resendCountdown > 0) this.resendCountdown--;
      else clearInterval(this.timerInterval);
    }, 1000);
  }

  resendOtp() {
    if (this.resendCountdown === 0) this.sendResetRequest(this.tempPhone);
  }

  closeResetModal() {
    this.isResetModalOpen = false;
    this.isOtpVerified = false;
    this.resetData = { otp: '', newPassword: '', confirmPassword: '' };
  }

  togglePasswordVisibility() { this.isPasswordVisible = !this.isPasswordVisible; }
  toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }
  
  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, duration: 2500, color, position: 'top', mode: 'ios'
    });
    toast.present();
  }

  enroll() { this.navCtrl.navigateForward('/enroll'); }
}