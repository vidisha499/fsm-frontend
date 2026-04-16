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
 

  // Form Model (Values match your UI inputs)
assetData = {
    company_id: null,
    created_by: null,
    client: 'PugArch Technology Pvt Ltd',
    name: '',
    category_id: null, // ID store karne ke liye
    status_id: null,   // ID store karne ke liye
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

    // Login hone ke baad hi data mangwao
    if (this.assetData.company_id) {
      this.loadDynamicData(this.assetData.company_id);
    }
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
        category_id: selectedAsset.category_id,
        status_id: selectedAsset.status_id,
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


  loadDynamicData(companyId: number) {
    // 1. Categories Fetch karo
    this.dataService.getCategories(companyId).subscribe((res: any) => {
      this.categories = res;
      if (this.categories.length > 0) this.assetData.category_id = this.categories[0].id;
    });

    // 2. Status/Condition Fetch karo
    this.dataService.getStatuses(companyId).subscribe((res: any) => {
      this.conditions = res;
      if (this.conditions.length > 0) this.assetData.status_id = this.conditions[0].id;
    });
  }

  // --- 4. SUBMIT USING DATASERVICE ---
async submitAsset() {
    if (!this.assetData.name || !this.assetData.category_id) {
      this.presentToast('Please fill all required fields');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Saving Asset...' });
    await loading.present();

    // Mapping: ID se Name nikalna Neon Dashboard ke liye
    const selectedCat = this.categories.find(c => c.id == this.assetData.category_id);
    const selectedStatus = this.conditions.find(s => s.id == this.assetData.status_id);

    const payload = {
      company_id: this.assetData.company_id,
      name: this.assetData.name,
      category: selectedCat ? selectedCat.name : '', // Text
      category_id: Number(this.assetData.category_id), // ID
      condition_status: selectedStatus ? selectedStatus.status_name : 'Good', // Text
      status_id: Number(this.assetData.status_id), // ID
      year: this.assetData.year,
      description: this.assetData.description,
      location: JSON.stringify({ lat: this.lat, lng: this.lng }),
      photos: this.capturedPhotos,
      created_by: this.assetData.created_by
    };

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
      this.map.invalidateSize();
    }, 500);
  }

  updateMapPosition() {
    this.map.setView([this.lat, this.lng], 15);
    if (this.marker) {
      this.marker.setLatLng([this.lat, this.lng]);
    }
  }
}