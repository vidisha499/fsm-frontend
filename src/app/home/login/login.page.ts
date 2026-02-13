import { Component, OnInit } from '@angular/core';
import { LoadingController, AlertController, NavController, ToastController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  isPasswordVisible = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isResetModalOpen = false;
  isOtpVerified = false;

  resendCountdown = 0;
  timerInterval: any;
  tempPhone = '';

  loginData = { phone: '', password: '' };
  resetData = { otp: '', newPassword: '', confirmPassword: '' };

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private dataService: DataService,
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
  ) {}

  ngOnInit() {}

  toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  startResendTimer() {
    this.resendCountdown = 30;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown--;
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  // --- Login Logic with Loader ---
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

    this.dataService.login(payload).subscribe({
      next: (res: any) => {
        loading.dismiss();
        if (res?.id) {
          localStorage.clear();
          this.dataService.saveRangerId(res.id.toString());
          localStorage.setItem('ranger_username', res.username);
          this.navCtrl.navigateRoot('/home');
        }
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast('Invalid Credentials', 'danger');
      }
    });
  }

  // --- Forgot Password Request with Loader ---
  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Forgot Password',
      message: 'Enter your phone number to receive an OTP.',
      inputs: [{ name: 'phoneNo', type: 'tel', placeholder: 'Enter Mobile Number' }],
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
      this.presentToast('Phone number is required', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Sending OTP...',
      mode: 'ios'
    });
    await loading.present();

    this.dataService.requestPasswordReset(phoneNo).subscribe({
      next: () => {
        loading.dismiss();
        this.presentToast('OTP sent to your email!', 'success');
        this.tempPhone = phoneNo;
        this.isResetModalOpen = true;
        this.startResendTimer();
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast(err.error?.message || 'Phone not found', 'danger');
      }
    });
  }

  // --- Verify OTP with Loader ---
  async verifyOtpOnly() {
    if (!this.resetData.otp || this.resetData.otp.length < 4) {
      this.presentToast('Please enter a valid OTP', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Verifying...',
      spinner: 'crescent'
    });
    await loading.present();

    this.dataService.verifyOtp(this.tempPhone, this.resetData.otp).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.isOtpVerified = true; 
        this.presentToast('OTP Verified! Set new password.', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast(err.error?.message || 'Invalid OTP', 'danger');
      }
    });
  }

  // --- Final Password Reset with Loader ---
  async handlePasswordReset() {
    if (this.resetData.newPassword !== this.resetData.confirmPassword) {
      this.presentToast('Passwords do not match!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Updating password...',
      spinner: 'circles'
    });
    await loading.present();

    this.dataService.resetPassword(this.tempPhone, this.resetData.otp, this.resetData.newPassword).subscribe({
      next: () => {
        loading.dismiss();
        this.closeResetModal();
        this.presentToast('Password updated! Please login.', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast(err.error?.message || 'Error updating password', 'danger');
      }
    });
  }

  // --- Utilities ---
  resendOtp() {
    if (this.resendCountdown === 0) {
      this.sendResetRequest(this.tempPhone);
    }
  }

  closeResetModal() {
    this.isResetModalOpen = false;
    this.isOtpVerified = false;
    this.resetData = { otp: '', newPassword: '', confirmPassword: '' };
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, duration: 2500, color, position: 'top' 
    });
    toast.present();
  }

  enroll() { this.navCtrl.navigateForward('/enroll'); }
}