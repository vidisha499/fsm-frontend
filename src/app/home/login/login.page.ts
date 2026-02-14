// import { Component, OnInit } from '@angular/core';
// import { LoadingController, AlertController, NavController, ToastController, Platform } from '@ionic/angular';
// import { DataService } from 'src/app/data.service';
// import { TranslateService } from '@ngx-translate/core';
// import { environment } from '../../../environments/environment';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.page.html',
//   styleUrls: ['./login.page.scss'],
//   standalone: false
// })
// export class LoginPage implements OnInit {
//   isPasswordVisible = false;
//   showNewPassword = false;
//   showConfirmPassword = false;
//   isResetModalOpen = false;
//   isOtpVerified = false;

//   resendCountdown = 0;
//   timerInterval: any;
//   tempPhone = '';

//   loginData = { phone: '', password: '' };
//   resetData = { otp: '', newPassword: '', confirmPassword: '' };

//   // 1. Add Vercel Base URL
//   // Note: We use the base URL because LoginPage calls multiple endpoints (login, reset, verify)
//   private vercelBaseUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api';

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private dataService: DataService,
//     private alertController: AlertController,
//     private loadingCtrl: LoadingController,
//     private translate: TranslateService,
//     private platform: Platform // 2. Inject Platform
//   ) {}

//   ngOnInit() {
//     // 3. Update the DataService's internal URL to use Vercel
//     // This ensures dataService.login() uses the live backend
//     if (this.dataService) {
//        (this.dataService as any).apiUrl = `${this.vercelBaseUrl}/rangers`;
//     }
//   }

//   toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
//   toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

//   startResendTimer() {
//     this.resendCountdown = 30;
//     if (this.timerInterval) clearInterval(this.timerInterval);
//     this.timerInterval = setInterval(() => {
//       if (this.resendCountdown > 0) {
//         this.resendCountdown--;
//       } else {
//         clearInterval(this.timerInterval);
//       }
//     }, 1000);
//   }

//   async login() {
//     if (!this.loginData.phone || !this.loginData.password) {
//       this.presentToast('Please enter both phone and password', 'warning');
//       return;
//     }

//     const loading = await this.loadingCtrl.create({
//       message: 'Authenticating with Vercel...',
//       spinner: 'crescent',
//       mode: 'ios'
//     });
//     await loading.present();

//     const payload = { 
//       phoneNo: this.loginData.phone.trim(), 
//       password: this.loginData.password 
//     };

//     this.dataService.login(payload).subscribe({
//       next: async (res: any) => {
//         if (res?.id) {
//           const currentLang = localStorage.getItem('app_language_code') || 'en';
          
//           localStorage.clear();
//           localStorage.setItem('app_language_code', currentLang);
//           localStorage.setItem('ranger_username', res.username);
//           localStorage.setItem('ranger_id', res.id.toString()); // Direct save
//           this.dataService.saveRangerId(res.id.toString());

//           this.translate.use(currentLang).subscribe({
//             next: () => {
//               loading.dismiss();
//               this.navCtrl.navigateRoot('/home');
//             },
//             error: () => {
//               loading.dismiss();
//               this.navCtrl.navigateRoot('/home');
//             }
//           });
//         } else {
//           loading.dismiss();
//           this.presentToast('Login failed: Invalid response', 'danger');
//         }
//       },
//       error: (err) => {
//         loading.dismiss();
//         console.error('Login Error:', err);
//         this.presentToast('Invalid Credentials or Server Offline', 'danger');
//       }
//     });
//   }

//   async forgotPassword() {
//     const alert = await this.alertController.create({
//       header: 'Forgot Password',
//       message: 'Enter your phone number to receive an OTP via Vercel mailer.',
//       inputs: [{ name: 'phoneNo', type: 'tel', placeholder: 'Enter Mobile Number' }],
//       buttons: [
//         { text: 'Cancel', role: 'cancel' },
//         { 
//           text: 'Send OTP', 
//           handler: (data) => { this.sendResetRequest(data.phoneNo); } 
//         }
//       ]
//     });
//     await alert.present();
//   }

//   async sendResetRequest(phoneNo: string) {
//     if (!phoneNo) {
//       this.presentToast('Phone number is required', 'warning');
//       return;
//     }

//     const loading = await this.loadingCtrl.create({
//       message: 'Requesting OTP...',
//       mode: 'ios'
//     });
//     await loading.present();

//     this.dataService.requestPasswordReset(phoneNo).subscribe({
//       next: () => {
//         loading.dismiss();
//         this.presentToast('OTP sent successfully!', 'success');
//         this.tempPhone = phoneNo;
//         this.isResetModalOpen = true;
//         this.startResendTimer();
//       },
//       error: (err) => {
//         loading.dismiss();
//         this.presentToast(err.error?.message || 'Phone not found', 'danger');
//       }
//     });
//   }

//   async verifyOtpOnly() {
//     if (!this.resetData.otp || this.resetData.otp.length < 4) {
//       this.presentToast('Please enter a valid OTP', 'warning');
//       return;
//     }

//     const loading = await this.loadingCtrl.create({
//       message: 'Verifying OTP...',
//       spinner: 'crescent'
//     });
//     await loading.present();

//     this.dataService.verifyOtp(this.tempPhone, this.resetData.otp).subscribe({
//       next: (res: any) => {
//         loading.dismiss();
//         this.isOtpVerified = true; 
//         this.presentToast('OTP Verified! Set new password.', 'success');
//       },
//       error: (err) => {
//         loading.dismiss();
//         this.presentToast(err.error?.message || 'Invalid OTP', 'danger');
//       }
//     });
//   }

//   async handlePasswordReset() {
//     if (this.resetData.newPassword !== this.resetData.confirmPassword) {
//       this.presentToast('Passwords do not match!', 'warning');
//       return;
//     }

//     const loading = await this.loadingCtrl.create({
//       message: 'Updating database...',
//       spinner: 'circles'
//     });
//     await loading.present();

//     this.dataService.resetPassword(this.tempPhone, this.resetData.otp, this.resetData.newPassword).subscribe({
//       next: () => {
//         loading.dismiss();
//         this.closeResetModal();
//         this.presentToast('Password updated! Please login.', 'success');
//       },
//       error: (err) => {
//         loading.dismiss();
//         this.presentToast(err.error?.message || 'Error updating password', 'danger');
//       }
//     });
//   }

//   resendOtp() {
//     if (this.resendCountdown === 0) {
//       this.sendResetRequest(this.tempPhone);
//     }
//   }

//   closeResetModal() {
//     this.isResetModalOpen = false;
//     this.isOtpVerified = false;
//     this.resetData = { otp: '', newPassword: '', confirmPassword: '' };
//     if (this.timerInterval) clearInterval(this.timerInterval);
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({ 
//       message, duration: 2500, color, position: 'top', mode: 'ios'
//     });
//     toast.present();
//   }

//   enroll() { this.navCtrl.navigateForward('/enroll'); }
// }


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
  async login() {
    if (!this.loginData.phone || !this.loginData.password) {
      this.presentToast('Please enter both phone and password', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Authenticating...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    const payload = { 
      phoneNo: this.loginData.phone.trim(), 
      password: this.loginData.password 
    };

    this.loginSub = this.dataService.login(payload).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        // Ensure backend returns an ID
        if (res && (res.id || res.rangerId)) {
          const rId = (res.id || res.rangerId).toString();
          const currentLang = localStorage.getItem('app_language_code') || 'en';
          
          // Store Credentials
          localStorage.setItem('ranger_username', res.username || 'Ranger');
          localStorage.setItem('ranger_id', rId);
          this.dataService.saveRangerId(rId);

          // Force language load before entering home
          this.translate.use(currentLang).subscribe({
            next: () => this.navCtrl.navigateRoot('/home'),
            error: () => this.navCtrl.navigateRoot('/home')
          });
        } else {
          this.presentToast('Invalid server response structure', 'danger');
        }
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('CORS or Auth Error:', err);
        
        if (err.status === 0) {
          this.presentToast('Network Error: Check Vercel CORS configuration', 'danger');
        } else {
          this.presentToast(err.error?.message || 'Invalid Credentials', 'danger');
        }
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