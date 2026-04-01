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
  verifiedData: any = { name: '', mobile: '', company_id: null };
  isVerified: boolean = false; //

  ranger = {
    username: '',
    phone: '',
    email: '',
    password: ''
  };

  // Replace this with your specific Vercel URL
  // private vercelUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/rangers';
  private vercelUrl: string = `${environment.apiUrl}/users`;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private platform: Platform,
    private alertController: AlertController,
  ) { }

  ngOnInit() { }

  // async onSignUp() {
  //   if (!this.ranger.username || !this.ranger.phone || !this.ranger.password) {
  //     this.presentToast('Please complete all fields', 'warning');
  //     return;
  //   }

  //   const loader = await this.loadingCtrl.create({
  //     message: 'Creating account on Vercel...',
  //     spinner: 'crescent',
  //     mode: 'ios'
  //   });
  //   await loader.present();

  //   const signupPayload = {
  //     username: this.ranger.username,
  //     phoneNo: this.ranger.phone, 
  //     emailId: this.ranger.email, 
  //     password: this.ranger.password
  //   };

  //   // Use Vercel URL for all platforms to ensure connectivity
  //   const apiUrl = this.vercelUrl;

  //   this.http.post(apiUrl, signupPayload).subscribe({
  //     next: async (res) => {
  //       await loader.dismiss();
  //       this.presentToast('Enrollment Successful! Please login.', 'success');
  //       this.navCtrl.navigateBack('/login');
  //     },
  //     error: async (err) => {
  //       await loader.dismiss();
  //       console.error('Signup error:', err);
  //       this.presentToast('Enrollment failed. Server might be sleeping or user exists.', 'danger');
  //     }
  //   });
  // }

  // --- FUNCTION 1: MOBILE VERIFICATION ---
// --- FUNCTION 1: MOBILE VERIFICATION ---
  async onVerifyMobile() {
    if (!this.ranger.phone) {
      this.presentToast('Please enter a mobile number', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ 
      message: 'Verifying with database...',
      spinner: 'circles'
    });
    await loader.present();

    const payload = { phone: this.ranger.phone }; 
    const verifyUrl = `${environment.apiUrl}/company-user/verify-mobile`;

    this.http.post(verifyUrl, payload).subscribe({
      next: async (res: any) => {
        await loader.dismiss();
        
        // 1. Data save karo
        this.verifiedData = {
          name: res.name,
          // mobile: res.mobile,
          mobile: res.contact,
          role_id: res.role_id || res.roleId || 4,
          company_id: res.company_id 
        };
        
        this.isVerified = true;

        // 2. YAHAN HAI FIX: Custom Alert with Navigation
        const alert = await this.alertController.create({
          header: 'Verified!',
          message: `Welcome ${res.name}. Your number is approved. Click OK to set your password.`,
          mode: 'ios',
          cssClass: 'custom-verification-alert',
          buttons: [
            {
              text: 'OK',
              handler: () => {
                // ✅ OK dabate hi is page par bhej dega
                this.navCtrl.navigateForward(['/signup-details'], { 
                  queryParams: { 
                    special: JSON.stringify(this.verifiedData) 
                  } 
                });
              }
            }
          ]
        });
        await alert.present();
      },
      error: async (err) => {
        await loader.dismiss();
        console.error('Verification Error:', err);

        if (err.status === 404) {
          await this.showCustomAlert('Access Denied', 'Your number was not found in the approved list.');
        } else if (err.status === 409) {
          await this.showCustomAlert('Already Registered', 'This account already exists. Please login.');
        } else {
          this.presentToast('Server connection failed.', 'danger');
        }
      }
    });
  }

// --- FUNCTION 2: FINAL SIGNUP ---
async onSignUp() {
  // 1. Pehle console mein check karo data aa bhi raha hai ya nahi
  console.log("Current Ranger Data:", this.ranger);
  console.log("Verified Data:", this.verifiedData);

  if (!this.isVerified) {
    this.presentToast('Please verify your mobile number first!', 'warning');
    return;
  }

  if (!this.ranger.password || !this.ranger.username) {
    this.presentToast('Please enter Name and Password', 'warning');
    return;
  }

  const loader = await this.loadingCtrl.create({
    message: 'Creating account...',
    spinner: 'crescent'
  });
  await loader.present();

  // 2. PAYLOAD FIX: Database columns ke hisaab se
  const signupPayload = {
    name: this.ranger.username,      // DB Column: name
    contact: this.verifiedData.mobile, // 👈 Phone number verified wala use karo
    email: this.ranger.email || '',  // DB Column: email
    password: this.ranger.password,  // DB Column: password
    // 🔥 DYNAMIC FIX
  role_id: Number(this.verifiedData.role_id || 4), 
  company_id: Number(this.verifiedData.company_id), // Ensure it's a number
    status: 1                         
  };

  const apiUrl = `${environment.apiUrl}/users`;

  this.http.post(apiUrl, signupPayload).subscribe({
    next: async (res) => {
      await loader.dismiss();
      this.presentToast('Enrollment Successful!', 'success');
      this.navCtrl.navigateRoot('/login');
    },
    error: async (err) => {
      await loader.dismiss();
      console.error('Signup Error:', err);
      // Agar error aaye toh alert mein dikhao kya galat hai
      this.showCustomAlert('Signup Failed', err.error?.message || 'Check your internet or if user exists.');
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

 
// async onVerifyMobile() {
//   if (!this.ranger.phone) {
//     this.presentToast('Please enter a mobile number', 'warning');
//     return;
//   }

//   const loader = await this.loadingCtrl.create({ 
//     message: 'Verifying with database...',
//     spinner: 'circles'
//   });
//   await loader.present();

//   const payload = { phone: this.ranger.phone }; 
//   const verifyUrl = `${environment.apiUrl}/company-user/verify-mobile`;

//   this.http.post(verifyUrl, payload).subscribe({
//     next: async (res: any) => {
//       await loader.dismiss();
//       // Navigate to signup details page with data
//       this.navCtrl.navigateForward(['/signup-details'], { 
//         queryParams: { 
//           name: res.name, 
//           mobile: res.mobile,
//           company_id: res.company_id 
//         } 
//       });
//     },
//     error: async (err) => {
//       await loader.dismiss();
//       console.error('Verification Error:', err);

//       if (err.status === 404) {
//         // 🚨 English Alert: Not Found
//         await this.showCustomAlert('Access Denied', 'Your number was not found in the approved list. Please contact Admin.');
//       } 
//       else if (err.status === 409) {
//         // 🚨 English Alert: Already Registered
//         await this.showCustomAlert('Already Registered', 'This account already exists. Please login instead.');
//       } 
//       else {
//         this.presentToast('Server connection failed. Please try again later.', 'danger');
//       }
//     }
//   });
// }
// ✅ Add this helper function to create the specific Alert style
// async showCustomAlert(header: string, message: string) {
//   const alert = await this.alertController.create({
//     header: header,
//     message: message,
//     buttons: [
//       {
//         text: 'OK',
//         role: 'confirm',
//         cssClass: 'alert-button-purple', // We will style this in global.scss
//       },
//     ],
//     mode: 'ios', // Matches the clean look in your screenshot
//     cssClass: 'custom-verification-alert'
//   });

//   await alert.present();
// }

async showCustomAlert(header: string, message: string) {
  const alert = await this.alertController.create({
    header: header,
    message: message, // 👈 Sirf plain text rakhein yahan
    buttons: [
      {
        text: 'OK',
        role: 'confirm',
        cssClass: 'alert-button-purple', 
      },
    ],
    mode: 'ios', 
    cssClass: 'custom-verification-alert'
  });

  await alert.present();
}
}