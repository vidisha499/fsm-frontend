import { Component, OnInit } from '@angular/core';
import { NavController, ActionSheetController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation'; 
import { DataService } from 'src/app/data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-assets',
  templateUrl: './assets.page.html',
  styleUrls: ['./assets.page.scss'],
  standalone: false
})
export class AssetsPage implements OnInit {

  map!: L.Map; 
  marker!: L.Marker;

  // Media aur State variables
  capturedPhotos: string[] = [];
  isSubmitting = false;
  
  // GPS Coordinates (Detected dynamically)
  lat: any = 'Detecting...';
  lng: any = 'Detecting...';

  isEditMode = false;
  editingId: any = null;

  // Dynamic Lists
  categories: any[] = [];
  conditions: any[] = [];
 

  // Form Model
assetData = {
    company_id: null as any,
    created_by: null as any,
    client: 'PugArch Technology Pvt Ltd',
    name: '',
    category: '',
    category_id: null as any,
    condition: '',   // Empty string initially — set by first condition from API
    year: 2026,
    description: ''
  };
  constructor(
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private dataService: DataService // Injecting your existing DataService
  ) { }

  async ngOnInit() {
    this.getLoggedUserInfo();
    this.checkEditMode();
    await this.getCurrentLocation();
    // Always load categories & conditions regardless of company_id
    this.loadDynamicData(this.assetData.company_id || 1);
  }

  checkEditMode() {
    const selectedAsset = this.dataService.getSelectedAsset();
    if (selectedAsset && selectedAsset.isEditing) {
      this.isEditMode = true;
      this.editingId = selectedAsset.id;
      
      // Pre-fill data
      this.assetData = {
        company_id: selectedAsset.company_id,
        created_by: selectedAsset.created_by,
        client: selectedAsset.client || 'PugArch Technology Pvt Ltd',
        name: selectedAsset.name,
        category: selectedAsset.category || '',
        category_id: selectedAsset.category_id,
        condition: selectedAsset.condition || selectedAsset.status || 'Good',
        year: selectedAsset.year,
        description: selectedAsset.description || ''
      };
      
      if (selectedAsset.latitude) this.lat = selectedAsset.latitude;
      if (selectedAsset.longitude) this.lng = selectedAsset.longitude;

      // Clean up flag
      delete selectedAsset.isEditing;
    }
  }

  // --- 1. LOGIN SE DYNAMIC DATA NIKALNA ---
  getLoggedUserInfo() {
    // LocalStorage se user info fetch karna
    const userData = localStorage.getItem('user_data'); 
    if (userData) {
      const user = JSON.parse(userData);
      this.assetData.company_id = user.company_id; // Dynamic Company ID
      this.assetData.created_by = user.id;         // Dynamic User ID
      console.log('Session Context:', { company: user.company_id, user: user.id });
    } else {
      this.presentToast('Session expired. Please login again.');
      this.navCtrl.navigateRoot('/login');
    }
  }

  // --- 3. CAMERA & GALLERY LOGIC ---
  async takePhoto() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons: [
        {
          text: 'Load from Gallery',
          icon: 'images',
          handler: () => { this.pickImage(CameraSource.Photos); }
        },
        {
          text: 'Use Camera',
          icon: 'camera',
          handler: () => { this.pickImage(CameraSource.Camera); }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async pickImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 50, // Base64 heavy na ho isliye quality 50 rakhi hai
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        if (this.capturedPhotos.length < 5) {
          this.capturedPhotos.push(image.dataUrl);
        } else {
          this.presentToast('Maximum 5 photos allowed');
        }
      }
    } catch (error) {
      console.log('Operation cancelled by user');
    }
  }

  removePhoto(index: number) {
    this.capturedPhotos.splice(index, 1);
  }


  // loadDynamicData(companyId: number) {
  //   // 1. Categories Fetch karo
  //   this.dataService.getCategories(companyId).subscribe((res: any) => {
  //     this.categories = res;
  //     if (this.categories.length > 0) this.assetData.category_id = this.categories[0].id;
  //   });

  //   // 2. Status/Condition Fetch karo
  //   this.dataService.getStatuses(companyId).subscribe((res: any) => {
  //     this.conditions = res;
  //     if (this.conditions.length > 0) this.assetData.status_id = this.conditions[0].id;
  //   });
  // }

  loadDynamicData(companyId: any) {
    const idAsNumber = Number(companyId);

    // 1. Categories Fetch karo
    this.dataService.getCategories(idAsNumber).subscribe((res: any) => {
      if (Array.isArray(res) && res.length > 0) {
        this.categories = res;
      } else if (res && Array.isArray(res.data) && res.data.length > 0) {
        this.categories = res.data;
      } else if (res && Array.isArray(res.categories) && res.categories.length > 0) {
        this.categories = res.categories;
      } else {
        console.warn('Categories empty from backend, using fallback');
        this.categories = [
          { id: 1, name: 'Vehicles (Jeeps/Bikes)' },
          { id: 2, name: 'Communication (Walkie Talkies)' },
          { id: 3, name: 'Field Tools (Drones/Cameras)' },
          { id: 4, name: 'Office Assets' }
        ];
      }
      // Auto-select first if not already set
      if (this.categories.length > 0 && !this.assetData.category_id) {
        this.assetData.category_id = this.categories[0].id;
        this.assetData.category = this.categories[0].name || '';
      }
    });

    // 2. Conditions Fetch karo
    this.dataService.getStatuses(idAsNumber).subscribe((res: any) => {
      console.log('🔍 RAW Statuses API Response:', JSON.stringify(res));
      if (Array.isArray(res) && res.length > 0) {
        this.conditions = res;
      } else if (res && Array.isArray(res.data) && res.data.length > 0) {
        this.conditions = res.data;
      } else if (res && Array.isArray(res.statuses) && res.statuses.length > 0) {
        this.conditions = res.statuses;
      } else {
        console.warn('Statuses empty from backend, using fallback');
        this.conditions = [
          { name: 'Good' },
          { name: 'Needs Repair' },
          { name: 'Poor' },
          { name: 'Not in Use' }
        ];
      }
      console.log('✅ Parsed conditions:', JSON.stringify(this.conditions));
      // Set first condition ONLY if user hasn't selected anything yet
      if (this.conditions.length > 0 && !this.assetData.condition) {
        const firstName = this.conditions[0].status_name || this.conditions[0].name || 'Good';
        this.assetData.condition = firstName;
        console.log('📌 Auto-selected condition:', firstName);
      }
    });
  }

  async submitAsset() {
    if (!this.assetData.name || !this.assetData.category_id) {
      this.presentToast('Please fill all required fields');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Saving Asset...' });
    await loading.present();

    // Clean photos
    const finalPhotos = this.capturedPhotos.map(p => p.includes(',') ? p.split(',')[1] : p);

    // Category name resolve karo
    const selectedCat = this.categories.find(c => c.id == this.assetData.category_id);
    const categoryName = selectedCat ? (selectedCat.name || selectedCat.category_name || '') : (this.assetData.category || '');

    // Safe condition fallback — use first loaded condition, NOT hardcoded 'Good'
    const finalCondition = this.assetData.condition ||
      (this.conditions.length > 0 ? (this.conditions[0].status_name || this.conditions[0].name) : 'Operational');

    console.log('📤 Submitting condition:', this.assetData.condition);
    console.log('📤 Full assetData:', JSON.stringify(this.assetData));

    // GPS validation — don't send 'Detecting...' string
    const validLat = (typeof this.lat === 'number' && !isNaN(this.lat)) ? this.lat : null;
    const validLng = (typeof this.lng === 'number' && !isNaN(this.lng)) ? this.lng : null;

    // Find status_id from conditions array by matching selected condition name
    const selectedStatus = this.conditions.find(
      (s: any) => (s.status_name || s.name) === this.assetData.condition
    );
    const statusId = selectedStatus ? selectedStatus.id : null;
    console.log('📤 Matched status_id:', statusId, 'for condition:', this.assetData.condition);

    const payload = {
      name: this.assetData.name,
      category: categoryName,
      category_id: Number(this.assetData.category_id),
      condition: finalCondition,
      status: finalCondition,
      status_id: statusId,
      year: this.assetData.year,
      description: this.assetData.description,
      location: (validLat && validLng) ? JSON.stringify({ lat: validLat, lng: validLng }) : '',
      latitude: validLat,
      longitude: validLng,
      photo: finalPhotos.length > 0 ? `data:image/jpeg;base64,${finalPhotos[0]}` : '',
      photos: JSON.stringify(finalPhotos.map(p => `data:image/jpeg;base64,${p}`)),
      created_by: this.assetData.created_by,
      company_id: this.assetData.company_id || 1
    };
    console.log('📤 Final payload condition:', finalCondition, '| location:', payload.location);


    const request = this.isEditMode 
      ? this.dataService.updateAsset(this.editingId, payload)
      : this.dataService.addAsset(payload);

    request.subscribe({
      next: () => {
        loading.dismiss();
        this.presentToast(this.isEditMode ? 'Asset Updated Successfully!' : 'Asset Saved Successfully!');
        this.navCtrl.back();
      },
      error: () => { loading.dismiss(); this.presentToast('Error saving data'); }
    });
  }

  // --- HELPER FUNCTIONS ---
  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  adjustHeight(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // AfterViewInit mein map load hota hai jab HTML ready ho jaye
  async ngAfterViewInit() {
    await this.getCurrentLocation();
    this.initMap();
  }

  async getCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.lat = coordinates.coords.latitude;
      this.lng = coordinates.coords.longitude;
      
      // Agar map pehle se load ho gaya hai, toh position update karo
      if (this.map) {
        this.updateMapPosition();
      }
    } catch (error) {
      console.error('Error getting location', error);
      this.lat = 21.1458; // Default
      this.lng = 79.0882;
    }
  }

  initMap() {
    // Leaflet Default Icon Fix (Resolves marker-icon-2x.png 404)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/icon/favicon.png',
      iconUrl: 'assets/icon/favicon.png',
      shadowUrl: 'assets/icon/favicon.png',
    });

    // 1. Map Initialize
    this.map = L.map('incidentMap').setView([this.lat, this.lng], 15);

    // 2. OpenStreetMap Layer add karna
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // 3. Current Location ka Marker lagana
    const customIcon = L.icon({
      iconUrl: 'assets/icon/favicon.png', // Koi bhi icon path
      iconSize: [25, 25],
    });

    this.marker = L.marker([this.lat, this.lng]).addTo(this.map)
      .bindPopup('Asset Location')
      .openPopup();
      
    // Fix: Map size issues on load
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 500);
  }

  updateMapPosition() {
    this.map.setView([this.lat, this.lng], 15);
    if (this.marker) {
      this.marker.setLatLng([this.lat, this.lng]);
    }
  }

  recenterMap() {
    if (this.map) {
      this.map.setView([this.lat, this.lng], 15);
      if (this.marker) {
        this.marker.setLatLng([this.lat, this.lng]);
      }
    }
  }
}