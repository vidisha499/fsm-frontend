import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
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
    private http: HttpClient
  ) { }

  ngOnInit() { }

  async onSignUp() {
    if (!this.ranger.username || !this.ranger.phone || !this.ranger.password) {
      this.presentToast('Please complete all fields', 'warning');
      return;
    }

    // Map frontend keys to backend Entity names
    const signupPayload = {
      username: this.ranger.username,
      phoneNo: this.ranger.phone, 
      emailId: this.ranger.email, 
      password: this.ranger.password
    };

    // Correct URL to match backend
    this.http.post('http://localhost:3000/rangers', signupPayload).subscribe({
      next: async (res) => {
        this.presentToast('Enrollment Successful! Please login.', 'success');
        this.navCtrl.navigateBack('/login');
      },
      error: (err) => {
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