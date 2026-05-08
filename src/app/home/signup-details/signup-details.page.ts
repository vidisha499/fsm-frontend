import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NavController, ToastController, LoadingController,  } from '@ionic/angular';
import { DataService } from 'src/app/data.service';


@Component({
  selector: 'app-signup-details',
  templateUrl: './signup-details.page.html',
  styleUrls: ['./signup-details.page.scss'],
  standalone: false
})
export class SignupDetailsPage implements OnInit {
  // Data Properties
  verifiedData: any = {};
  profileImage: any = null;
  firstName: string = '';
  lastName: string = '';
  dob: string = ''; 
  email: string = '';
  mobile: string = '';
  address: string = ''; 
  password: string = '';
  confirmPassword: string = '';
 passwordType: string = 'password';
passwordIcon: string = 'eye-off'; // Ionic default icon name

confirmPasswordType: string = 'password';
confirmPasswordIcon: string = 'eye-off';

range: string = '';
beat: string = '';
gender: string = '';
shift: string = '';
weeklyOff: string = '';
ranges: any[] = [];
allBeats: any[] = [];
filteredBeats: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private dataService: DataService
  ) { }

//   ngOnInit() {
//   this.route.queryParams.subscribe(params => {
//     // 1. Check karo agar 'special' parameter aaya hai (Naya Logic)
//     if (params && params['special']) {
//       const data = JSON.parse(params['special']);
//       const fullName = data.name || '';
//       this.mobile = data.mobile || '';
//       this.verifiedData = data;

//       if (fullName.trim()) {
//         const nameParts = fullName.trim().split(/\s+/);
//         if (nameParts.length > 1) {
//           this.firstName = nameParts[0];
//           this.lastName = nameParts.slice(1).join(' ');
//         } else {
//           this.firstName = nameParts[0];
//           this.lastName = ''; 
//         }
//       }
//     } 
//     // 2. Backup: Agar purane tarike se data aaye (Optional)
//     else if (params['name']) {
//       const fullName = params['name'];
//       this.mobile = params['mobile'] || '';
//       const nameParts = fullName.trim().split(/\s+/);
//       this.firstName = nameParts[0];
//       this.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
//     }
//   });
// }


ngOnInit() {
  this.route.queryParams.subscribe(params => {
    if (params && params['special']) {
      const data = JSON.parse(params['special']);
      
      // Sabse zaruri: Pura data object save karo
      this.verifiedData = data; 
      
      // Debugging ke liye console check karo (Browser mein F12 dabake dekhna)
      console.log("Verified Data Received:", this.verifiedData);
      console.log("Company ID detected:", data.company_id);

      this.mobile = data.mobile || '';
      const fullName = data.name || '';
      this.range = data.range || '';
      this.beat = data.beat || '';

      if (fullName.trim()) {
        const nameParts = fullName.trim().split(/\s+/);
        this.firstName = nameParts[0];
        this.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      }

      this.loadHierarchy(data.company_id || 1);
    }
  });
}

  loadHierarchy(companyId: any) {
    // We use the Public Hierarchy (GET) which doesn't need a token
    this.dataService.getPublicHierarchy(companyId).subscribe({
      next: (res: any) => {
        this.ranges = res.ranges || [];
        this.allBeats = res.beats || [];
        
        // Anti-Null Fallback: If lists are empty or missing the pre-assigned value, add it manually
        if (this.verifiedData.range && !this.ranges.find(r => (r.name || r) === this.verifiedData.range)) {
          this.ranges.push({ id: 0, name: this.verifiedData.range });
        }

        // Smart Auto-Detect: If Range is null but Beat exists, find Range from hierarchy
        if (!this.range && this.verifiedData.beat) {
          const foundBeat = this.allBeats.find(b => b.name === this.verifiedData.beat);
          if (foundBeat && foundBeat.parentName) {
            console.log('🧠 Smart Detect: Found Range from Beat:', foundBeat.parentName);
            this.range = foundBeat.parentName;
            this.onRangeChange();
          }
        }

        // After loading, ensure the autofilled values are preserved
        if (this.verifiedData.range) {
          this.range = this.verifiedData.range;
          this.onRangeChange(); 
        }

        if (this.verifiedData.beat) {
          // If the beat is not in the filtered list, add it as a manual option
          if (!this.filteredBeats.find(b => b.name === this.verifiedData.beat)) {
            this.filteredBeats.push({ name: this.verifiedData.beat, parentName: this.range });
          }
          this.beat = this.verifiedData.beat;
        }
      },
      error: (err) => {
        console.error('Public Hierarchy fetch failed, using fallbacks', err);
        // Even if it fails, we keep the verified data
        if (this.verifiedData.range) {
          this.ranges = [{ id: 0, name: this.verifiedData.range }];
          this.range = this.verifiedData.range;
          this.onRangeChange();
        }
        if (this.verifiedData.beat) {
          this.filteredBeats = [{ name: this.verifiedData.beat, parentName: this.range }];
          this.beat = this.verifiedData.beat;
        }
      }
    });
  }

onRangeChange() {
  this.filteredBeats = this.allBeats.filter(b => b.parentName === this.range);
}


  togglePassword(field: string) {
  if (field === 'pw') {
    this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
    this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
  } else {
    this.confirmPasswordType = this.confirmPasswordType === 'password' ? 'text' : 'password';
    this.confirmPasswordIcon = this.confirmPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
  }
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
    console.log("Verified Data Check:", this.verifiedData);

    // 2. Payload Construction using FormData
    const formData = new FormData();
    formData.append('name', `${this.firstName} ${this.lastName}`.trim());
    formData.append('contact', this.mobile);
    formData.append('email', this.email);
    formData.append('password', this.password);
    formData.append('dob', this.dob);
    formData.append('range', this.range);
    formData.append('beat', this.beat);
    formData.append('gender', this.gender);
    formData.append('address', this.address);
    formData.append('shift_name', this.shift);
    formData.append('weekly_off', this.weeklyOff);

    
    // Role and Company IDs
    const roleId = this.verifiedData?.role_id || this.verifiedData?.roleId || 4;
    const companyId = this.verifiedData?.company_id || this.verifiedData?.companyId;
    
    formData.append('role_id', String(roleId));
    formData.append('company_id', String(companyId));
    formData.append('status', '1');

    // Handle profile photo
    if (this.profileImage) {
      formData.append('profile_pic', this.profileImage);
    }

    console.log("Final Registration Request to /addUser (Signup)");

    // 3. API Call via DataService - Using addUser for final signup to generate gen_id
    this.dataService.addUser(formData).subscribe({

      next: async (response: any) => {
        await loader.dismiss();
        
        // Cache the profile picture locally
        if (this.profileImage && this.mobile) {
          localStorage.setItem(`cached_photo_${this.mobile}`, this.profileImage);
        }

        this.presentToast('Registration successful! You can now log in.', 'success');
        this.navCtrl.navigateRoot('/login');
      },
      error: async (err) => {
        await loader.dismiss();
        console.error('Registration Error:', err);

        let errorMsg = 'Registration failed. Please try again.';
        if (err.status === 409) {
          errorMsg = 'This mobile number or email is already registered.';
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

  navToLogin() {
    this.navCtrl.navigateBack('/login'); 
  }
}