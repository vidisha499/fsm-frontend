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

      // Backend se aane wala data (res.user ya res)
      const userData = res.user || res;
      const userRole = parseInt(res.role_id || userData.role_id);
      const actualCompanyId = res.company_id || userData.company_id;

      if (userData && userData.id) {
        // --- 1. SABSE IMPORTANT: USER_DATA OBJECT BANANA ---
        const userInfo = {
          id: userData.id,
          name: userData.name,
          role_id: userRole,
          company_id: actualCompanyId, // Dashboard isi ID ko dhundega
          division: userData.division || 'Washim Division'
        };

        // --- 2. STORAGE MEIN SAVE KARNA ---
        localStorage.setItem('user_data', JSON.stringify(userInfo));
        
        // Extra security ke liye purani keys bhi rakh lo
        localStorage.setItem('ranger_id', userData.id.toString());
        localStorage.setItem('user_role', userRole.toString());
        localStorage.setItem('company_id', (actualCompanyId || 0).toString());

        // --- 3. NAVIGATION ---
        const currentLang = localStorage.getItem('app_language_code') || 'en';
        this.translate.use(currentLang).subscribe({
          next: () => {
            this.presentToast(`Welcome, ${userData.name}!`, 'success');
            // Role based navigation
            if (userRole === 2) {
              this.navCtrl.navigateRoot('/admin'); 
            } else {
              this.navCtrl.navigateRoot('/home');
            }
          }
        });
      } else {
        this.presentToast('User data not found', 'danger');
      }
    },
    error: async (err) => {
      await loading.dismiss();
      this.presentToast(err.error?.message || 'Invalid Credentials', 'danger');
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