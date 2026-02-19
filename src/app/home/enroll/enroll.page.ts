import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController, Platform ,AlertController} from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-enroll',
  templateUrl: './enroll.page.html',
  styleUrls: ['./enroll.page.scss'],
  standalone: false
})
export class EnrollPage implements OnInit {

  ranger = {
    username: '',
    phone: '',
    email: '',
    password: ''
  };

  // Replace this with your specific Vercel URL
  // private vercelUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/rangers';
  private vercelUrl: string = `${environment.apiUrl}/rangers`;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private platform: Platform,
    private alertController: AlertController,
  ) { }

  ngOnInit() { }

  async onSignUp() {
    if (!this.ranger.username || !this.ranger.phone || !this.ranger.password) {
      this.presentToast('Please complete all fields', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Creating account on Vercel...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    const signupPayload = {
      username: this.ranger.username,
      phoneNo: this.ranger.phone, 
      emailId: this.ranger.email, 
      password: this.ranger.password
    };

    // Use Vercel URL for all platforms to ensure connectivity
    const apiUrl = this.vercelUrl;

    this.http.post(apiUrl, signupPayload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.presentToast('Enrollment Successful! Please login.', 'success');
        this.navCtrl.navigateBack('/login');
      },
      error: async (err) => {
        await loader.dismiss();
        console.error('Signup error:', err);
        this.presentToast('Enrollment failed. Server might be sleeping or user exists.', 'danger');
      }
    });
  }

  navToLogin() {
    this.navCtrl.navigateBack('/login');
  }

  async presentToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  onlyNumbers(event: any) {
  const pattern = /[0-9]/;
  const inputChar = String.fromCharCode(event.charCode);
  if (!pattern.test(inputChar)) {
    event.preventDefault(); // Agar alphabet dabaya toh wo type hi nahi hoga
  }
}

 
async onVerifyMobile() {
  if (!this.ranger.phone) {
    this.presentToast('Please enter your mobile number', 'warning');
    return;
  }

  const loader = await this.loadingCtrl.create({ 
    message: 'Verifying with Company Database...',
    spinner: 'circles',
    mode: 'ios'
  });
  await loader.present();

  const payload = { phone: this.ranger.phone }; 
  const verifyUrl = `${environment.apiUrl}/company-user/verify-mobile`;

  this.http.post(verifyUrl, payload).subscribe({
    next: async (res: any) => {
      await loader.dismiss();
      
      // Success: Navigate to signup
      this.navCtrl.navigateForward(['/signup-details'], { 
        queryParams: { 
          name: res.name, 
          mobile: res.mobile || this.ranger.phone 
        } 
      });
    },
    error: async (err) => {
      await loader.dismiss();
      console.error('Verification Error:', err);

      if (err.status === 404) {
        // Trigger the "User not found" popup
        await this.showCustomAlert('Alert', 'User not found');
      } 
      else if (err.status === 409) {
        // Trigger the "User already Registered" popup
        await this.showCustomAlert('Alert', 'User already Registered');
      } 
      else {
        // Fallback for other errors (Server down, etc.)
        this.presentToast(err.error?.message || 'Authorization failed', 'danger');
      }
    }
  });
}

// ✅ Add this helper function to create the specific Alert style
async showCustomAlert(header: string, message: string) {
  const alert = await this.alertController.create({
    header: header,
    message: message,
    buttons: [
      {
        text: 'OK',
        role: 'confirm',
        cssClass: 'alert-button-purple', // We will style this in global.scss
      },
    ],
    mode: 'ios', // Matches the clean look in your screenshot
    cssClass: 'custom-verification-alert'
  });

  await alert.present();
}
}