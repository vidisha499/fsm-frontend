import { Component, OnInit } from '@angular/core';
import { LoadingController,AlertController, NavController, ToastController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  // --- UI State Variables ---
  isPasswordVisible = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isResetModalOpen = false;
  isOtpVerified = false;

  // --- Timer & Data Variables ---
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

  

  // --- Password Toggle Methods ---
  toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  // --- Resend Timer Logic ---
  startResendTimer() {
    this.resendCountdown = 30; // 30 second wait time
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown--;
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  // --- Forgot Password Flow ---
  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Forgot Password',
      message: 'Enter your phone number to receive an OTP via email.',
      inputs: [{ name: 'phoneNo', type: 'tel', placeholder: 'Enter Mobile Number' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Send OTP', 
          handler: (data) => this.sendResetRequest(data.phoneNo) 
        }
      ]
    });
    await alert.present();
  }

  sendResetRequest(phoneNo: string) {
    if (!phoneNo) {
      this.presentToast('Phone number is required', 'warning');
      return;
    }
    this.dataService.requestPasswordReset(phoneNo).subscribe({
      next: () => {
        this.presentToast('OTP sent to your email!', 'success');
        this.tempPhone = phoneNo;
        this.isResetModalOpen = true; // Opens the custom modal
        this.startResendTimer();
      },
      error: (err) => this.presentToast(err.error?.message || 'Phone not found', 'danger')
    });
  }

  resendOtp() {
    if (this.resendCountdown === 0) {
      this.sendResetRequest(this.tempPhone);
    }
  }
// 3. Update the handlePasswordReset method
async handlePasswordReset() {
  if (this.resetData.newPassword !== this.resetData.confirmPassword) {
    this.presentToast('Passwords do not match!', 'warning');
    return;
  }

  // Create and show the loading spinner
  const loading = await this.loadingCtrl.create({
    message: 'Updating password...',
    spinner: 'circles'
  });
  await loading.present();

  this.dataService.resetPassword(this.tempPhone, this.resetData.otp, this.resetData.newPassword).subscribe({
    next: () => {
      loading.dismiss(); // Stop the spinner
      this.closeResetModal();
      this.presentToast('Password updated! Please login.', 'success');
    },
    error: (err) => {
      loading.dismiss(); // Stop the spinner even on error
      this.presentToast(err.error?.message || 'Invalid OTP or Link expired', 'danger');
    }
  });
}

  // closeResetModal() {
  //   this.isResetModalOpen = false;
  //   if (this.timerInterval) clearInterval(this.timerInterval);
  //   this.resetData = { otp: '', newPassword: '', confirmPassword: '' };
  // }

  // --- Login Logic ---
  async login() {
    const payload = { 
      phoneNo: this.loginData.phone.trim(), 
      password: this.loginData.password 
    };
    this.dataService.login(payload).subscribe({
      next: (res: any) => {
        if (res?.id) {
          localStorage.clear();
          this.dataService.saveRangerId(res.id.toString());
          localStorage.setItem('ranger_username', res.username);
          this.navCtrl.navigateRoot('/home');
        }
      },
      error: () => this.presentToast('Invalid Credentials', 'danger')
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, duration: 2500, color, position: 'top' 
    });
    toast.present();
  }

  enroll() { this.navCtrl.navigateForward('/enroll'); }

 async verifyOtpOnly() {
  if (!this.resetData.otp || this.resetData.otp.length < 4) {
    this.presentToast('Please enter a valid OTP', 'warning');
    return;
  }

  const loading = await this.loadingCtrl.create({
    message: 'Verifying OTP...',
    spinner: 'crescent'
  });
  await loading.present();

  this.dataService.verifyOtp(this.tempPhone, this.resetData.otp).subscribe({
    next: async (res: any) => {
      // Small delay so the user can see the "Verified" state transition
      setTimeout(() => {
        loading.dismiss();
        this.isOtpVerified = true; 
        this.presentToast('OTP Verified! Set your new password.', 'success');
      }, 500);
    },
    error: (err) => {
      loading.dismiss();
      const errorMsg = err.error?.message || 'Invalid OTP. Please try again.';
      this.presentToast(errorMsg, 'danger');
    }
  });
}
// Reset everything when closing the modal
closeResetModal() {
  this.isResetModalOpen = false;
  this.isOtpVerified = false; // Reset the flow
  this.resetData = { otp: '', newPassword: '', confirmPassword: '' };
  if (this.timerInterval) clearInterval(this.timerInterval);
}
}