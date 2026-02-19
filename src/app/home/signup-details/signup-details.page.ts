import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NavController, ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-signup-details',
  templateUrl: './signup-details.page.html',
  styleUrls: ['./signup-details.page.scss'],
  standalone: false
})
export class SignupDetailsPage implements OnInit {
  // Data Properties
  profileImage: any = null;
  firstName: string = '';
  lastName: string = '';
  dob: string = ''; 
  email: string = '';
  mobile: string = '';
  address: string = ''; 
  password: string = '';
  confirmPassword: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    // Receiving pre-filled data from the verification page
    // this.route.queryParams.subscribe(params => {
    //   const fullName = params['name'] || '';
    //   if (fullName) {
    //     const nameParts = fullName.trim().split(' ');
    //     this.firstName = nameParts[0] || '';
    //     this.lastName = nameParts.slice(1).join(' ') || '';
    //   }
    //   this.mobile = params['mobile'] || '';
    // });

    this.route.queryParams.subscribe(params => {
    // 1. Get the full name from params (e.g., "Eshika Sharma")
    const fullName = params['name'] || '';
    this.mobile = params['mobile'] || '';

    if (fullName.trim()) {
      const nameParts = fullName.trim().split(/\s+/); // Split by any space
      
      if (nameParts.length > 1) {
        // First word is First Name
        this.firstName = nameParts[0];
        // Everything else is the Surname
        this.lastName = nameParts.slice(1).join(' ');
      } else {
        // If there's only one name, put it in firstName
        this.firstName = nameParts[0];
        this.lastName = ''; 
      }
    }
  });
  }

  /**
   * Captures a profile photo using the device camera.
   * Optimized quality for Vercel/Serverless payload limits.
   */
  async captureImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 60, // Reduced quality to keep payload small
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 600 // Fixed width for consistent recognition profile
      });
      this.profileImage = image.dataUrl;
    } catch (error) {
      console.error('Camera error:', error);
      this.presentToast('Camera access was cancelled or failed.', 'warning');
    }
  }

  /**
   * Submits the registration form to the 'rangers' table.
   */
  async onSignup() {
    // 1. Validation Logic
    if (!this.profileImage) {
      return this.presentToast('Profile photo is required for identification.', 'warning');
    }
    if (!this.firstName || !this.lastName) {
      return this.presentToast('Please provide your full name.', 'warning');
    }
    if (!this.email || !this.email.includes('@')) {
      return this.presentToast('Please enter a valid email address.', 'warning');
    }
    if (!this.dob) {
      return this.presentToast('Please select your Date of Birth.', 'warning');
    }
    if (!this.password || this.password.length < 6) {
      return this.presentToast('Password must be at least 6 characters long.', 'warning');
    }
    if (this.password !== this.confirmPassword) {
      return this.presentToast('Passwords do not match. Please try again.', 'danger');
    }

    const loader = await this.loadingCtrl.create({
      message: 'Creating your Ranger profile...',
      spinner: 'crescent'
    });
    await loader.present();

    // 2. Payload Construction
    // These keys match the NestJS Ranger Entity structure
    const payload = {
     username: `${this.firstName} ${this.lastName}`.trim(),
    phoneNo: this.mobile,         // Matches your DB column 'phone_no'
    email_id: this.email,          // Matches your DB column 'email_id'
    password: this.password,       // Matches your DB column 'password'
    profile_pic: this.profileImage, // Ensure this column is added to 'rangers'
    dob: this.dob,                 // Ensure this column is added to 'rangers'
    address: this.address
    };

    // 3. API Call
    this.http.post(`${environment.apiUrl}/rangers`, payload).subscribe({
      next: async (response: any) => {
        await loader.dismiss();
        this.presentToast('Registration successful! You can now log in.', 'success');
        this.navCtrl.navigateRoot('/login');
      },
      error: async (err) => {
        await loader.dismiss();
        console.error('Signup Error:', err);

        let errorMsg = 'Registration failed. Please try again.';
        if (err.status === 409) {
          errorMsg = 'This mobile number or email is already registered.';
        } else if (err.status === 413) {
          errorMsg = 'Photo file size is too large. Try a lower resolution.';
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }

        this.presentToast(errorMsg, 'danger');
      }
    });
  }

  /**
   * Utility function to show feedback messages.
   */
  async presentToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ 
      message: msg, 
      color: color, 
      duration: 3500,
      position: 'bottom',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    t.present();
  }
}