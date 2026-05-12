import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NavController, ToastController, LoadingController,  } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import moment from 'moment';


// Utility to convert Base64 to Blob for real file uploads
function base64ToBlob(base64: string, contentType: string = 'image/jpeg') {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

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
assignedNodes: any[] = [];  

// Dynamic Hierarchy properties (Same as Add User)
layers: any[] = [];
layerEntities: { [key: string]: any[] } = {};
hierarchySelections: any[] = [];

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

      // Fetch assigned hierarchy nodes for this user (by user ID)
      if (data.id) {
        this.dataService.getUserAssignments(data.id).subscribe({
          next: (res: any) => {
            const raw = res?.data || res || [];
            this.assignedNodes = Array.isArray(raw) ? raw : [raw];
            console.log('📍 Assigned Nodes:', this.assignedNodes);
          },
          error: () => console.warn('⚠️ Could not fetch user assignments')
        });
      }

      this.loadHierarchy(data.company_id || 1);
    }
  });
}

  loadHierarchy(companyId: any) {
    // 1. Load Layers (Public)
    this.dataService.listOrgLayers().subscribe({
      next: (res: any) => {
        const rawLayers = res?.data || res || [];
        // Map 9 -> Section, 10 -> Beat (Consistency)
        this.layers = rawLayers.map((l: any) => {
          if (String(l.id) === '9') return { ...l, name: 'Section' };
          if (String(l.id) === '10') return { ...l, name: 'Beat' };
          return l;
        }).sort((a: any, b: any) => Number(a.id) - Number(b.id));

        this.hierarchySelections = new Array(this.layers.length).fill(null);
        
        // 2. Load all entities to build the selection path
        this.dataService.listOrgEntities('').subscribe((entRes: any) => {
          const allEntities = entRes?.data || entRes || [];
          
          // Initial Load: Show only top-level nodes (Parent is null/0)
          if (this.layers.length > 0) {
            const firstLayerId = this.layers[0].id;
            this.layerEntities[firstLayerId] = allEntities.filter((n: any) => 
              Number(n.layer_id) === Number(firstLayerId) && (!n.parent_id || n.parent_id == '0')
            );
          }

          // 3. AUTO-FILL Logic: If we have assignedNodes from Admin
          if (this.assignedNodes.length > 0) {
            this.prefillHierarchy(allEntities);
          }
        });
      }
    });
  }

  prefillHierarchy(allEntities: any[]) {
    // We assume assignedNodes has the path or at least the deepest node
    // Let's find the deepest assigned node
    const deepestAssigned = this.assignedNodes[this.assignedNodes.length - 1];
    const deepestId = deepestAssigned?.entity_id || deepestAssigned?.id;

    if (!deepestId) return;

    // Trace path from deepest to top
    let currentId = deepestId;
    const path: any[] = [];

    while (currentId) {
      const node = allEntities.find(n => String(n.id) === String(currentId));
      if (node) {
        path.unshift(node); // Add to beginning
        currentId = node.parent_id && node.parent_id != '0' ? node.parent_id : null;
      } else {
        currentId = null;
      }
    }

    // Now fill the selections and load entities for each level
    path.forEach(node => {
      const layerIndex = this.layers.findIndex(l => Number(l.id) === Number(node.layer_id));
      if (layerIndex !== -1) {
        this.hierarchySelections[layerIndex] = node.id;
        
        // Load children for the next layer
        if (layerIndex + 1 < this.layers.length) {
          const nextLayer = this.layers[layerIndex + 1];
          this.layerEntities[nextLayer.id] = allEntities.filter(n => 
            Number(n.layer_id) === Number(nextLayer.id) && Number(n.parent_id) === Number(node.id)
          );
        }
      }
    });
  }

  onLayerChange(layerIndex: number) {
    const selectedEntityId = this.hierarchySelections[layerIndex];
    
    // Clear all subsequent selections
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // Load next level
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      this.dataService.listOrgEntities('').subscribe((res: any) => {
        const allNodes = res?.data || res || [];
        this.layerEntities[nextLayer.id] = allNodes.filter((n: any) => 
          Number(n.layer_id) === Number(nextLayer.id) && Number(n.parent_id) === Number(selectedEntityId)
        );
      });
    }
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
        quality: 70, 
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800 
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
  shouldShowHierarchy(): boolean {
    const roleId = this.verifiedData?.role_id || this.verifiedData?.roleId;
    if (!roleId) return true;
    
    // Admin roles (1, 2) don't need hierarchy
    const adminRoles = ['1', '2', 1, 2];
    return !adminRoles.includes(roleId);
  }

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

    // 2. Payload Construction (EXACT MATCH WITH SIR'S CODE)
    const finalMobile = String(this.mobile || '').trim();
    let roleId = this.verifiedData?.role_id || this.verifiedData?.roleId || 3;
    if (Number(roleId) === 11) roleId = 3; 
    const companyId = this.verifiedData?.company_id || this.verifiedData?.companyId || '';
    
    // --- SIR'S CUSTOM LOGIC ---
    // 1. Generate emp_id (e.g. JD-123456)
    const empId = this.firstName.slice(0, 1).toUpperCase()
                  .concat(this.lastName.slice(0, 1).toUpperCase())
                  .concat("-")
                  .concat(Math.floor(100000 + Math.random() * 100000).toString());

    // 2. Generate date_range (1 year validity)
    const date_range = moment().format("YYYY-MM-DD") + " to " + moment().add(1, 'year').format("YYYY-MM-DD");

    // Extract Deepest selection for dynamic hierarchy
    let deepestEntityId: any = null;
    let deepestEntityName: string = '';
    let rangeName: string = '';

    for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i]) {
        deepestEntityId = this.hierarchySelections[i];
        const layerId = this.layers[i].id;
        const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(deepestEntityId));
        deepestEntityName = ent?.name || '';
        
        // Find top-level name for legacy range mapping
        if (this.hierarchySelections[0]) {
          const firstLayerId = this.layers[0].id;
          const firstEnt = this.layerEntities[firstLayerId]?.find(e => String(e.id) === String(this.hierarchySelections[0]));
          rangeName = firstEnt?.name || '';
        }
        break;
      }
    }

    const payload: any = {
      api_token: "Fj4HXJhcQZ99ssKkqypXGAEQEXxERYX7K7adeZ0JZkGgQmseUSOaGaGyasjh", 
      emp_id: empId,
      name: `${this.firstName} ${this.lastName}`.trim(),
      mobile: finalMobile,
      phone: finalMobile,
      email: this.email || '',
      gender: this.gender || '',
      address: this.address || '',
      password: this.password,
      role_id: String(roleId),
      company_id: String(companyId),
      company_name: "Forest Department",
      attendance_type: 'multiple',
      status: '1',
      shift_name: this.shift || 'General Shift',
      weekly_off: this.weeklyOff || 'Sunday',
      date_range: date_range,
      client_id: rangeName || '',
      site_id: deepestEntityId || '',
      site_name: deepestEntityName || '',
      shift_id: '1'
    };

    // 🖼️ SIR'S TRIPLE-PHOTO LOGIC: Backend AI expects multiple angles
    if (this.profileImage) {
      const photoStr = this.profileImage.includes('base64,') ? this.profileImage : `data:image/jpg;base64,${this.profileImage}`;
      payload['photo'] = photoStr;     // Main
      payload['left_img'] = photoStr;  // Left (Simulated)
      payload['right_img'] = photoStr; // Right (Simulated)
    }

    console.log("Final Registration Request to /addUser (JSON Style)");

    // 3. API Call via DataService
    this.dataService.addUser(payload).subscribe({

      next: async (res: any) => {
        // ✅ TOTAL SUCCESS: Backend says it's done!
        if (res && res.status === 'SUCCESS') {
          await loader.dismiss();
          this.presentToast('Registration Successful! Please login now.', 'success');
          this.navCtrl.navigateRoot('/login');
          return;
        }

        // 🔥 FALLBACK SAFETY CHECK
        if (!res || !res.data) {
          await loader.dismiss();
          console.error("❌ Registration Hitch:", res);
          this.presentToast('Registration failed to return data. Please contact Sir.', 'warning');
          return;
        }

        await loader.dismiss();
        
        // 🔥 AGGRESSIVE CACHING for new users
        localStorage.setItem('user_data', JSON.stringify(res.data));
        if (res.data.api_token) localStorage.setItem('api_token', res.data.api_token);
        if (res.data.id) localStorage.setItem('ranger_id', res.data.id.toString());
        localStorage.setItem('ranger_username', this.firstName + ' ' + this.lastName);
        localStorage.setItem('ranger_phone', this.mobile);
        
        // 🔥 SIR'S STRICT PROTOCOL: Wait for photo sync before allowing success
        if (this.profileImage) {
          console.log("🔄 Step 2: Syncing photo to database (JSON + Full Prefix)...");
          
          const updatePayload = { 
            user_id: res.data.id, 
            id: res.data.id,
            profile_pic: this.profileImage, // Full prefix for AI
            photo: this.profileImage 
          };

          // 💡 SWITCHING TO SIR'S POSTMAN API: updateProfilePic
          this.dataService.updateProfilePic(this.profileImage).subscribe({
            next: async (syncRes: any) => {
              console.log("✅ [DATABASE PHOTO SYNC SUCCESS]:", syncRes);
              await loader.dismiss();
              this.presentToast('Registration and Photo Sync Successful!', 'success');
              this.navCtrl.navigateRoot('/login');
            },
            error: async (err) => {
              console.error("❌ [DATABASE SYNC FAILED]:", err);
              await loader.dismiss();
              this.presentToast('CRITICAL ERROR: Photo could not be saved in database. Signup blocked.', 'danger');
              // We do NOT navigate to login here to respect the user's requirement.
            }
          });
        } else {
          // No photo provided (should not happen due to validation)
          await loader.dismiss();
          this.navCtrl.navigateRoot('/login');
        }
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