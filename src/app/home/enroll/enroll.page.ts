import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController, Platform } from '@ionic/angular';
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
    private platform: Platform
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
}