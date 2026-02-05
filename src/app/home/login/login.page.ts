// import { Component, OnInit } from '@angular/core';
// import { NavController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { DataService } from 'src/app/data.service';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.page.html',
//   styleUrls: ['./login.page.scss'],
//   standalone: false
// })
// export class LoginPage implements OnInit {

//   // FIX: Added missing property for the template
//   isPasswordVisible: boolean = false;

//   loginData = {
//     phone: '',
//     password: ''
//   };

//   constructor(
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private http: HttpClient,
//      private dataService: DataService  
//   ) { }

//   ngOnInit() { }

//   // FIX: Added missing method for the template
//   async forgotPassword() {
//     this.presentToast('Password reset link sent to registered mobile.', 'primary');
//   }

//   async login() {
//     if (!this.loginData.phone || !this.loginData.password) {
//       this.presentToast('Please enter both mobile and password', 'warning');
//       return;
//     }

//     // Matching 'phoneNo' to your PostgreSQL Entity
//     const payload = {
//       phoneNo: this.loginData.phone.trim(), 
//       password: this.loginData.password 
//     };

//     this.http.post('http://localhost:3000/rangers/login', payload).subscribe({
//       next: async (res: any) => {
//         // Save ID for persistence [cite: 2026-01-15]
//         if (res && res.id) {
//           localStorage.setItem('ranger_id', res.id.toString());
//           localStorage.setItem('ranger_username', res.username);

//           this.presentToast(`Welcome, Ranger ${res.username}`, 'success');
//           this.navCtrl.navigateRoot('/home');
//         }
//       },
//       error: async (err) => {
//         console.error('Login Error:', err);
//         this.presentToast('Invalid Credentials. Access Denied.', 'danger');
//       }
//     });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message: message,
//       duration: 2000,
//       color: color,
//       position: 'top'
//     });
//     toast.present();
//   }

//   enroll() {
//     this.navCtrl.navigateForward('/enroll'); 
//   }
// }

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
    private dataService: DataService // ✅ Use DataService for backend calls
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
     phoneNo: this.loginData.phone.trim(), // ✅ must match service
      password: this.loginData.password
    };

    // Call the service
    this.dataService.login(payload).subscribe({
      next: async (res: any) => {
        if (res && res.id) {
          // Save data for persistence
          this.dataService.saveRangerId(res.id.toString());
          localStorage.setItem('ranger_username', res.username);

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
