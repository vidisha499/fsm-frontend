import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

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

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController, // 1. Inject LoadingController
    private http: HttpClient,
    private platform: Platform
  ) { }

  ngOnInit() { }

  async onSignUp() {
    if (!this.ranger.username || !this.ranger.phone || !this.ranger.password) {
      this.presentToast('Please complete all fields', 'warning');
      return;
    }

    // 2. Create and show the loader
    const loader = await this.loadingCtrl.create({
      message: 'Creating account...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    // Map frontend keys to backend Entity names
    const signupPayload = {
      username: this.ranger.username,
      phoneNo: this.ranger.phone, 
      emailId: this.ranger.email, 
      password: this.ranger.password
    };

    // Determine API URL based on platform (Browser vs Mobile)
    const apiUrl = this.platform.is('hybrid') 
      ? 'http://10.60.250.89:3000/api/rangers' 
      : 'http://localhost:3000/api/rangers';

    this.http.post(apiUrl, signupPayload).subscribe({
      next: async (res) => {
        // 3. Dismiss loader on success
        await loader.dismiss();
        this.presentToast('Enrollment Successful! Please login.', 'success');
        this.navCtrl.navigateBack('/login');
      },
      error: async (err) => {
        // 4. Dismiss loader on error
        await loader.dismiss();
        console.error('Signup error:', err);
        this.presentToast('Enrollment failed. Mobile or Email may exist.', 'danger');
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
}