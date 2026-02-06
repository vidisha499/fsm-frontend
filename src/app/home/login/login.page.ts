import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  // Controls password visibility
  isPasswordVisible: boolean = false;

  // Form data
  loginData = {
    phone: '',
    password: ''
  };

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private dataService: DataService 
  ) {}

  ngOnInit() {}

  // Forgot password action
  async forgotPassword() {
    this.presentToast('Password reset link sent to registered mobile.', 'primary');
  }

  // Login method
  async login() {
    // Check if fields are filled
    if (!this.loginData.phone || !this.loginData.password) {
      this.presentToast('Please enter both mobile and password', 'warning');
      return;
    }

    // Payload must match DataService.login type
    const payload = {
      phoneNo: this.loginData.phone.trim(), 
      password: this.loginData.password
    };

    // Call the service
    this.dataService.login(payload).subscribe({
      next: async (res: any) => {
        if (res && res.id) {
          // Save data for persistence
          this.dataService.saveRangerId(res.id.toString());
          
          // FIXED: Saved as 'ranger_name' to match HomePage retrieval
          localStorage.setItem('ranger_name', res.username);

          this.presentToast(`Welcome, Ranger ${res.username}`, 'success');
          this.navCtrl.navigateRoot('/home'); // Navigate to home page
        }
      },
      error: async (err) => {
        console.error('Login Error:', err);
        this.presentToast('Invalid Credentials. Access Denied.', 'danger');
      }
    });
  }

  // Show toast messages
  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }

  // Navigate to enrollment page
  enroll() {
    this.navCtrl.navigateForward('/enroll'); 
  }
}