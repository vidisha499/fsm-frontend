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


// async login() {
//   if (!this.loginData.phone || !this.loginData.password) {
//     this.presentToast('Please enter both contact and password', 'warning');
//     return;
//   }

//   const loading = await this.loadingCtrl.create({ 
//     message: 'Authenticating...', 
//     mode: 'ios',
//     spinner: 'crescent'
//   });
//   await loading.present();

//   const payload = { 
//     // identifier: this.loginData.phone.trim(), 
//     // pass: this.loginData.password 
//     mobile: this.loginData.phone.trim(), // 'identifier' ko 'mobile' kar
//   password: this.loginData.password
//   };

//   this.loginSub = this.dataService.login(payload).subscribe({
//     next: async (res: any) => {
//       if (res.api_token) {
//   localStorage.setItem('api_token', res.api_token);
// }
//       await loading.dismiss();

//       // Backend se aane wala data (res.user ya res)
//       const userData = res.user || res;
//       const userRole = parseInt(res.role_id || userData.role_id);
//       const actualCompanyId = res.company_id || userData.company_id;

//       if (userData && userData.id) {
//         // --- 1. SABSE IMPORTANT: USER_DATA OBJECT BANANA ---
//         const userInfo = {
//           id: userData.id,
//           name: userData.name,
//           role_id: userRole,
//           company_id: actualCompanyId, // Dashboard isi ID ko dhundega
//           // division: userData.division || 'Washim Division'
//         };

//         // --- 2. STORAGE MEIN SAVE KARNA ---
//         localStorage.setItem('user_data', JSON.stringify(userInfo));
        
//         // Extra security ke liye purani keys bhi rakh lo
//         localStorage.setItem('ranger_id', userData.id.toString());
//         localStorage.setItem('user_role', userRole.toString());
//         localStorage.setItem('company_id', (actualCompanyId || 0).toString());

//         // --- 3. NAVIGATION ---
//         const currentLang = localStorage.getItem('app_language_code') || 'en';
//         this.translate.use(currentLang).subscribe({
//           next: () => {
//             this.presentToast(`Welcome, ${userData.name}!`, 'success');
//             // Role based navigation
//             if (userRole === 2) {
//               this.navCtrl.navigateRoot('/admin'); 
//             } else {
//               this.navCtrl.navigateRoot('/home');
//             }
//           }
//         });
//       } else {
//         this.presentToast('User data not found', 'danger');
//       }
//     },
//     error: async (err) => {
//       await loading.dismiss();
//       this.presentToast(err.error?.message || 'Invalid Credentials', 'danger');
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
    email: this.loginData.phone.trim(), // As per Postman, use email key
    mobile: this.loginData.phone.trim(), // Keeping mobile for compatibility
    password: this.loginData.password,
    imei: '123456789012345', // Placeholder or Capacitor Device Info
    fcm_token: 'fcm_mock_token_123' // Placeholder or Capacitor Push Info
  };

  this.loginSub = this.dataService.login(payload).subscribe({
    next: async (res: any) => {
      await loading.dismiss();

      // Backend response check: Status 'SUCCESS' aur data hona chahiye
      if (res.status === "SUCCESS" && res.data) {
        const userData = res.data;
        
        // Role ID ko number mein convert karlo (Aapka Role ID 3 hai)
        const userRole = parseInt(res.role_id);

        const userInfo = {
          id: userData.id,
          name: userData.name,
          phone: userData.contact || userData.mobile || userData.phone || '',
          role_id: userRole,
          company_id: userData.company_id,
          company_name: userData.company_name || (userData.company ? userData.company.name : '') || userData.client_name || '',
          api_token: userData.api_token
        };

        // --- DATA STORAGE ---
        localStorage.setItem('user_data', JSON.stringify(userInfo));
        localStorage.setItem('api_token', userData.api_token);
        localStorage.setItem('user_role', userRole.toString());
        localStorage.setItem('company_id', userData.company_id.toString());
        localStorage.setItem('ranger_id', userData.id.toString());
        
        // Explicit keys for sidebar (AppComponent)
        localStorage.setItem('ranger_username', userData.name);
        localStorage.setItem('ranger_phone', userInfo.phone);
        
        console.log("Login UserData:", userData);

        // Save the profile picture if it exists by checking all possible backend keys
        let profilePicRaw = userData.profile_pic || userData.profile_Pic || userData.profilePic || 
                            userData.photo || userData.image || userData.profile_image || 
                            userData.avatar || userData.user_photo || '';
                            
        let profilePic = profilePicRaw ? String(profilePicRaw).trim() : '';

        // --- FALLBACK TO LOCAL CACHE (if backend strips base64 images from login response) ---
        if (!profilePic || profilePic === 'null' || profilePic === 'undefined') {
          const cachedPhoto = localStorage.getItem(`cached_photo_${this.loginData.phone.trim()}`);
          if (cachedPhoto) {
            profilePic = cachedPhoto;
          }
        }

        // If the backend returns a relative path or filename, prepend the correct domain
        if (profilePic && profilePic !== 'null' && profilePic !== 'undefined' && !profilePic.startsWith('http') && !profilePic.startsWith('data:')) {
          let cleaned = profilePic.startsWith('/') ? profilePic.substring(1) : profilePic;
          
          if (cleaned.includes('fms.pugarch.in')) {
            profilePic = `https://${cleaned.replace('https://', '').replace('http://', '')}`;
          } else if (!cleaned.includes('/')) {
            // It's just a filename like '1234.png'
            profilePic = `https://fms.pugarch.in/public/profilepics/${cleaned}`;
          } else {
            profilePic = `https://fms.pugarch.in/public/${cleaned}`;
          }
        }

        if (profilePic && profilePic !== 'null' && profilePic !== 'undefined') {
          localStorage.setItem('user_photo', profilePic);
        } else {
          localStorage.removeItem('user_photo');
        }

        this.presentToast(`Welcome, ${userData.name}!`, 'success');
        
        // Trigger Sidebar Refresh
        this.dataService.loginSuccess$.next();

        // --- NAVIGATION LOGIC ---
        // Role 3 = Supervisor, Role 4 = Ranger
        if (userRole === 3 || userRole === 4) { 
          // Dono ko home dashboard par bhejo
          this.navCtrl.navigateRoot('/home'); 
        } else if (userRole === 1 || userRole === 2) {
          // Admins ke liye alag route
          this.navCtrl.navigateRoot('/admin');
        } else {
          // Default fallback
          this.navCtrl.navigateRoot('/home');
        }

      } else {
        // Agar status SUCCESS nahi hai toh backend ka message dikhao
        this.presentToast(res.message || 'Invalid Response from Server', 'danger');
      }
    },
    error: async (err) => {
      await loading.dismiss();
      console.error('Login Error:', err);
      // Agar backend se error message aata hai (jaise 401 Unauthorized)
      const errorMsg = err.error?.message || 'Invalid Credentials or Server Error';
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