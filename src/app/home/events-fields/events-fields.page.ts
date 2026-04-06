import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ActionSheetController , ToastController, LoadingController} from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-events-fields',
  templateUrl: './events-fields.page.html',
  styleUrls: ['./events-fields.page.scss'],
  standalone: false,
})
export class EventsFieldsPage implements OnInit {
  reportData: any = {};
  eventTitle: string = 'Logs';
  dynamicFields: any[] = [];
  capturedPhoto: string | undefined;
  speciesOptions: string[] = ['Sal', 'Saja', 'Sagaon', 'Beeja', 'Haldu', 'Dhawda', 'Safed Siris', 'Kala Siris', 'Jamun', 'Aam', 'Semal', 'Mahua', 'Tendu', 'Nilgiri', 'Others'];
  animalSpecies: string[] = ['Sloth Bear', 'Leopard', 'Hyena', 'Jackal', 'Wild Bear', 'Spotted Deer', 'Sambar', 'Others'];

  fieldsConfig: any = {
    'Illegal Felling': [
      { label: 'GPS Location', type: 'text', value: 'Locating...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Species List', type: 'select', placeholder: 'Select Species',options: this.speciesOptions },
      { label: 'Quality', type: 'text', placeholder: 'e.g. Grade A, B' },
      { label: 'Girth (cm)', type: 'number', placeholder: '0' },
      { label: 'CUM (Volume)', type: 'number', placeholder: '0.00' },
      { label: 'Photo of Stump', type: 'file', icon: 'camera-outline' },
      { label: 'Reason for Felling', type: 'text', placeholder: 'Describe reason' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional notes' },
      { label: 'Action Taken', type: 'text', placeholder: 'Immediate action steps' }
    ],  

    'Illegal Timber Transport': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Name of Forest Produce', type: 'text', placeholder: 'e.g. Teak Logs, Firewood' },
      { label: 'Vehicle Type', type: 'text', placeholder: 'e.g. Truck, Tractor, Pickup' },
      { label: 'Vehicle Number', type: 'text', placeholder: 'e.g. MP-04-AB-1234' },
      { label: 'Quantity', type: 'number', placeholder: 'Enter quantity' },
      { label: 'Route Taken', type: 'text', placeholder: 'Enter route details' },
      { label: 'Name of Accused', type: 'text', placeholder: 'Enter name' },
      { label: 'Address of Accused', type: 'textarea', placeholder: 'Enter full address' },
      { label: 'Incident Photo', type: 'file', icon: 'camera-outline' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Additional observations' }
    ],
    'Illegal Timber Storage': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Species', type: 'select', placeholder: 'Select Species', options: this.speciesOptions },
      { label: 'Quantity', type: 'number', placeholder: 'Enter quantity' },
      { label: 'Storage Type', type: 'text', placeholder: 'e.g. Godown, Backyard, Sawmill' },
      { label: 'Name of Owner', type: 'text', placeholder: 'Enter owner name' },
      { label: 'Address of Owner', type: 'textarea', placeholder: 'Enter owner address' },
      { label: 'Storage Photo', type: 'file', icon: 'camera-outline' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional notes' }
    ],
    'Wild Animal Poaching': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Species', type: 'select', placeholder: 'Select Animal', options: this.animalSpecies },
      { label: 'Cause of Death', type: 'text', placeholder: 'e.g. Electrocution, Trap, Gunshot' },
      { label: 'Carcass State', type: 'text', placeholder: 'e.g. Fresh, Decomposed, Skeletal' },
      { label: 'Gender', type: 'select', placeholder: 'Select Gender', options: ['Male', 'Female', 'Unknown'] },
      { label: 'Age Class', type: 'select', placeholder: 'Select Age', options: ['Infant', 'Juvenile', 'Sub-Adult', 'Adult', 'Senile'] },
      { label: 'Evidence Photo', type: 'file', icon: 'camera-outline' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Enter detailed observations' }
    ],
    'Encroachment': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Encroachment Type', type: 'select', placeholder: 'Select Type', options: ['Agriculture', 'Construction'] },
      { label: 'Area (Hectare)', type: 'number', placeholder: 'e.g. 1.5' },
      { label: 'Machinery Present', type: 'select', placeholder: 'Machinery seen?', options: ['Yes', 'No'] },
      { label: 'Occupants/Persons Involved', type: 'text', placeholder: 'Names or count of people' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Describe the encroachment situation' }
    ],
    'Illegal Mining': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Mineral Type', type: 'text', placeholder: 'e.g. Sand, Stone, Murrum' },
      { label: 'Estimated Volume (cu mtr)', type: 'number', placeholder: 'e.g. 50' },
      { label: 'Mining Method', type: 'select', placeholder: 'Select Method', options: ['Manual', 'Machines'] },
      { label: 'Equipments Seen', type: 'text', placeholder: 'e.g. JCB, Shovel, Sieve' },
      { label: 'Action Taken', type: 'text', placeholder: 'e.g. Seized, Fine Issued' },
      { label: 'Name of Accused', type: 'text', placeholder: 'Enter name' },
      { label: 'Address of Accused', type: 'textarea', placeholder: 'Enter full address' },
      { label: 'Mining Site Photo', type: 'file', icon: 'camera-outline' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional mining details' }
    ],
    'JFMC / Social Forestry': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Village', type: 'text', placeholder: 'Enter Village Name' },
      { label: 'Photo of Samiti Prastavana', type: 'file', icon: 'camera-outline', id: 'photo_prastavana' },
      { label: 'Photo of Samiti Baithak', type: 'file', icon: 'camera-outline', id: 'photo_baithak' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any specific village feedback' }
    ],
    // New Category: Wild Animal Sighting
    'Wild Animal Sighting': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Species', type: 'select', placeholder: 'Select Animal', options: this.animalSpecies },
      { label: 'Sighting Type', type: 'select', options: ['Direct', 'Indirect'] },
      { label: 'No. of Animals', type: 'number', placeholder: '0' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'] },
      { label: 'Evidence Type', type: 'select', options: ['Photo', 'Pugmark', 'Scratch', 'Scat', 'Bodypart', 'Den', 'Others'] },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', id: 'photo_sighting' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Enter observation details' }
    ],
    'Water Source Status': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Source Type', type: 'select', options: ['Earthen Pond', 'Dam', 'Check Dam', 'Stop Dam', 'Concrete Pond', 'Water Stream', 'Well', 'Others'] },
      { label: 'Is it Dry?', type: 'select', options: ['Yes', 'No'] },
      { label: 'Water Quality', type: 'text', placeholder: 'e.g. Clear, Turbid, Saline' },
      { label: 'Animal Signs Observed', type: 'text', placeholder: 'e.g. Pugmarks, Scats nearby' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', id: 'photo_water' },
      { label: 'Remarks', type: 'textarea' }
    ],
    'Wildlife Compensation': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name' },
      { label: 'Compensation Type', type: 'select', placeholder: 'Select Case Type', options: ['Human Death', 'Permanent Disability', 'Human Injury', 'Cattle Death', 'Crop Damage', 'House Damage', 'Others'] },
      { label: 'Name of Victim/Owner', type: 'text', placeholder: 'Enter full name' },
      { label: 'Village of Incident', type: 'text', placeholder: 'Enter village name' },
      { label: 'Amount Claimed (₹)', type: 'number', placeholder: 'Enter amount' },
      { label: 'Upload Evidence Photo', type: 'file', icon: 'camera-outline', id: 'photo_compensation' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Describe the incident in detail' }
    ]
  };

  constructor(
    private route: ActivatedRoute, 
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private dataService: DataService, // DataService yahan inject kiya
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  // ngOnInit() {
  //   const title = this.route.snapshot.paramMap.get('title');
  //   if (title) {
  //     this.eventTitle = title;
  //     if (this.fieldsConfig[this.eventTitle]) {
  //       this.dynamicFields = this.fieldsConfig[this.eventTitle];
  //       this.fetchLocation();
  //     }
  //   }
  // }

  ngOnInit() {
  // 1. URL se title lein aur use decode karein
  let title = this.route.snapshot.paramMap.get('title');
  
  if (title) {
    // 2. Browser spaces ko %20 bana deta hai, hum use wapas normal karenge
    title = decodeURIComponent(title);
    this.eventTitle = title;

    // 3. Exact match check karein (Make sure keys in fieldsConfig match exactly)
    if (this.fieldsConfig[this.eventTitle]) {
      this.dynamicFields = this.fieldsConfig[this.eventTitle];
      this.fetchLocation();
    } else {
      console.error("No config found for title:", this.eventTitle);
    }
  }
}

  async fetchLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const lat = coordinates.coords.latitude;
      const lon = coordinates.coords.longitude;
      
      const gpsField = this.dynamicFields.find(f => f.id === 'gps');
      
      if (gpsField) {
        // Calling free Nominatim API for address
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (data && data.display_name) {
          // Displaying a shorter version of the address
          const addressParts = data.address;
          const shortAddress = addressParts.suburb || addressParts.town || addressParts.village || addressParts.city || "Unknown Location";
          const state = addressParts.state || "";
          
          gpsField.value = `${shortAddress}, ${state}`;
        } else {
          gpsField.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
      }
    } catch (err) {
      console.error("Location error", err);
      const gpsField = this.dynamicFields.find(f => f.id === 'gps');
      if (gpsField) gpsField.value = "Location Access Denied";
    }
  }

  async selectImageSource() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons: [
        { text: 'Load from Gallery', icon: 'image', handler: () => this.takePhoto(CameraSource.Photos) },
        { text: 'Use Camera', icon: 'camera', handler: () => this.takePhoto(CameraSource.Camera) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async takePhoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source
      });
      this.capturedPhoto = image.webPath;
    } catch (error) {
      console.log('User cancelled or camera failed', error);
    }
  }


  // --- SUBMIT LOGIC (Backend Connection) ---
  async submitReport() {
    const loading = await this.loadingCtrl.create({
      message: 'Saving Report...',
      spinner: 'circles'
    });
    await loading.present();

    const gpsField = this.dynamicFields.find(f => f.id === 'gps');
    
    // Backend Payload (NestJS DTO ke hisaab se)
    const payload = {
      report_id: 'FOR-' + Date.now(),
      user_id: Number(this.dataService.getRangerId()) || 1, // Storage se Ranger ID uthayega
      company_id: 1, // Default or fetch from profile
      category: 'Forest Event',
      report_type: this.eventTitle,
      date_time: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      latitude: gpsField?.value?.split(',')[0]?.trim() || "0",
      longitude: gpsField?.value?.split(',')[1]?.trim() || "0",
      beat: this.reportData['Assigned Beat'] || 'General',
      report_data: this.reportData, // Pura dynamic object (Illegal Mining/Felling details)
      photo: this.capturedPhoto || '',
      status: 'Pending'
    };

    // API Call using your DataService
    this.dataService.submitForestEvent(payload).subscribe({
      next: async (res) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Report submitted successfully! ✅',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: async (err) => {
        await loading.dismiss();
        console.error("Submission error:", err);
        const toast = await this.toastCtrl.create({
          message: 'Failed to save report. Please try again. ❌',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }
}