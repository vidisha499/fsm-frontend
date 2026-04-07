import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ActionSheetController , ToastController, LoadingController} from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DataService } from 'src/app/data.service';
import { HierarchyService } from 'src/app/services/hierarchy.service';

@Component({
  selector: 'app-events-fields',
  templateUrl: './events-fields.page.html',
  styleUrls: ['./events-fields.page.scss'],
  standalone: false,
})
export class EventsFieldsPage implements OnInit {
  reportData: any = {};
  eventTitle: string = 'Logs';
  currentCategory: string = 'General'; // <--- YE LINE ADD KARO
 dynamicFields: any[] = [];
  capturedPhoto: string | undefined;
  assignedBeat: string = 'Loading...';
  speciesOptions: string[] = ['Sal', 'Saja', 'Sagaon', 'Beeja', 'Haldu', 'Dhawda', 'Safed Siris', 'Kala Siris', 'Jamun', 'Aam', 'Semal', 'Mahua', 'Tendu', 'Nilgiri', 'Others'];
  animalSpecies: string[] = ['Sloth Bear', 'Leopard', 'Hyena', 'Jackal', 'Wild Bear', 'Spotted Deer', 'Sambar', 'Others'];

fieldsConfig: any = {
    'Illegal Felling': [
      { label: 'GPS Location', type: 'text', value: 'Locating...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Species List', type: 'select', placeholder: 'Select Species', options: this.speciesOptions, key: 'species' },
      { label: 'Quality', type: 'text', placeholder: 'e.g. Grade A, B', key: 'quality' },
      { label: 'Girth (cm)', type: 'number', placeholder: '0', key: 'girth' },
      { label: 'CUM (Volume)', type: 'number', placeholder: '0.00', key: 'volume' },
      { label: 'Photo of Stump', type: 'file', icon: 'camera-outline', key: 'stump_photo' },
      { label: 'Reason for Felling', type: 'text', placeholder: 'Describe reason', key: 'reason' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional notes', key: 'overall_remarks' },
      { label: 'Action Taken', type: 'text', placeholder: 'Immediate action steps', key: 'action_taken' }
    ],

    'Illegal Timber Transport': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Name of Forest Produce', type: 'text', placeholder: 'e.g. Teak Logs', key: 'produce_name' },
      { label: 'Vehicle Type', type: 'text', placeholder: 'e.g. Truck', key: 'vehicle_type' },
      { label: 'Vehicle Number', type: 'text', placeholder: 'e.g. MP-04-AB-1234', key: 'vehicle_no' },
      { label: 'Quantity', type: 'number', placeholder: 'Enter quantity', key: 'qty_final' },
      { label: 'Route Taken', type: 'text', placeholder: 'Enter route details', key: 'route' },
      { label: 'Name of Accused', type: 'text', placeholder: 'Enter name', key: 'accused_name' },
      { label: 'Address of Accused', type: 'textarea', placeholder: 'Enter full address', key: 'accused_address' },
      { label: 'Incident Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Additional observations', key: 'remarks' }
    ],

    'Illegal Timber Storage': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Species', type: 'select', placeholder: 'Select Species', options: this.speciesOptions, key: 'species' },
      { label: 'Quantity', type: 'number', placeholder: 'Enter quantity', key: 'qty_cmt' },
      { label: 'Storage Type', type: 'text', placeholder: 'e.g. Godown', key: 'storage_type' },
      { label: 'Name of Owner', type: 'text', placeholder: 'Enter owner name', key: 'owner_name' },
      { label: 'Address of Owner', type: 'textarea', placeholder: 'Enter owner address', key: 'owner_address' },
      { label: 'Storage Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional notes', key: 'remarks' }
    ],

    'Wild Animal Poaching': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Species', type: 'select', placeholder: 'Select Animal', options: this.animalSpecies, key: 'species' },
      { label: 'Cause of Death', type: 'text', placeholder: 'e.g. Trap', key: 'cause_death' },
      { label: 'Carcass State', type: 'text', placeholder: 'e.g. Fresh', key: 'carcass_state' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], key: 'gender' },
      { label: 'Age Class', type: 'select', options: ['Adult', 'Sub-Adult', 'Juvenile', 'Unknown'], key: 'age_class' },
      { label: 'Evidence Photo', type: 'file', icon: 'camera-outline', key: 'photos' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Encroachment': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Encroachment Type', type: 'select', options: ['Agriculture', 'Construction'], key: 'encroachment_type' },
      { label: 'Area (Hectare)', type: 'number', placeholder: 'e.g. 1.5', key: 'area_hectare' },
      { label: 'Machinery Present', type: 'select', options: ['Yes', 'No'], key: 'machinery' },
      { label: 'Occupants/Persons Involved', type: 'text', key: 'occupants' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ],

    'Illegal Mining': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Mineral Type', type: 'text', placeholder: 'e.g. Sand', key: 'mineral_type' },
      { label: 'Estimated Volume (cu mtr)', type: 'number', key: 'volume_cum' },
      { label: 'Mining Method', type: 'select', options: ['Manual', 'Mechanized'], key: 'mining_method' },
      { label: 'Equipments Seen', type: 'text', key: 'equipment' },
      { label: 'Action Taken', type: 'text', key: 'action_taken' },
      { label: 'Mining Site Photo', type: 'file', icon: 'camera-outline', key: 'photo_ref' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'JFMC / Social Forestry': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Village', type: 'text', key: 'village' },
      { label: 'Photo of Samiti Prastavana', type: 'file', icon: 'camera-outline', key: 'photo_prastavna' },
      { label: 'Photo of Samiti Baithak', type: 'file', icon: 'camera-outline', key: 'photo_baithak' },
      { label: 'Remarks', type: 'textarea', key: 'decisions' }
    ],

    'Wild Animal Sighting': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Species', type: 'select', options: this.animalSpecies, key: 'species' },
      { label: 'Sighting Type', type: 'select', options: ['Direct', 'Indirect'], key: 'sighting_type' },
      { label: 'No. of Animals', type: 'number', key: 'num_animals' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], key: 'gender' },
      { label: 'Evidence Type', type: 'select', options: ['Photo', 'Pugmark', 'Scratch', 'Scat', 'Body Part', 'Den', 'Other'], key: 'evidence_type' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo_evidence' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Water Source Status': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Source Type', type: 'select', options: ['Earthen Pond', 'Dam', 'Check Dam', 'Stop Dam', 'Concrete Pond', 'Water Stream', 'Well', 'Others'], key: 'source_type' },
      { label: 'Is it Dry?', type: 'select', options: ['Yes', 'No'], key: 'is_dry' },
      { label: 'Water Quality', type: 'text', key: 'water_quality' },
      { label: 'Animal Signs Observed', type: 'text', key: 'animal_sign' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Wildlife Compensation': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Compensation Type', type: 'select', options: ['Human death', 'Permanent disability', 'Human injury', 'Cattle death', 'crop damage', 'House damage', 'Other'], key: 'comp_type' },
      { label: 'Name of Victim/Owner', type: 'text', key: 'victim_name' },
      { label: 'Village of Incident', type: 'text', key: 'village' },
      { label: 'Amount Claimed (₹)', type: 'number', key: 'amount_claimed' },
      { label: 'Upload Evidence Photo', type: 'file', icon: 'camera-outline', key: 'damage_photo' },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ]
  };

  constructor(
    private route: ActivatedRoute, 
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private dataService: DataService, // DataService yahan inject kiya
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private hierarchyService: HierarchyService,
  ) {}

  ngOnInit() {
  // 1. URL se title lein aur use decode karein
  let title = this.route.snapshot.paramMap.get('title');
  
  // 2. URL se category lein (Jo humne dashboard se bheji hai)
  const category = this.route.snapshot.paramMap.get('category');
  if (category) {
    this.currentCategory = category;
  }

  if (title) {
    title = decodeURIComponent(title);
    this.eventTitle = title;

    if (this.fieldsConfig[this.eventTitle]) {
      this.dynamicFields = this.fieldsConfig[this.eventTitle];
      this.fetchLocation();
      this.loadDefaultBeat();
    } else {
      console.error("No config found for title:", this.eventTitle);
    }
  }
}


async loadDefaultBeat() {
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const rangerId = userData.id;

  if (rangerId) {
    // Aapne pehle hierarchyService banaya tha, use yahan inject karke call karein
    this.hierarchyService.getAssignedBeat(rangerId).subscribe({
      next: (data) => {
        if (data && data.beat_name) {
          this.assignedBeat = data.beat_name;
          // IMPORTANT: reportData mein fill karna taaki [(ngModel)] use pakad le
          this.reportData['Assigned Beat'] = this.assignedBeat;
        } else {
          this.assignedBeat = 'General';
          this.reportData['Assigned Beat'] = 'General';
        }
      },
      error: () => {
        this.assignedBeat = 'General';
        this.reportData['Assigned Beat'] = 'General';
      }
    });
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
// --- events-fields.page.ts (COMPLETE FUNCTION) ---

  async submitReport() {
    const loading = await this.loadingCtrl.create({
      message: 'Saving Report...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const formattedReportData: any = {};
      
      // 1. Dynamic fields se data nikalna
      this.dynamicFields.forEach(field => {
        const userValue = this.reportData[field.label];
        if (field.key) {
          formattedReportData[field.key] = userValue || "";
        } else {
          formattedReportData[field.label] = userValue || "";
        }
      });

      const gpsField = this.dynamicFields.find(f => f.id === 'gps');
      const gpsValue = gpsField?.value || ""; // Fetching from the field value directly

      // 2. FINAL PAYLOAD (Table Structure ke hisaab se)
      const payload = {
        report_id: 'FOR-' + Date.now(),
        user_id: Number(this.dataService.getRangerId()) || 1,
        company_id: Number(this.dataService.getUserCompanyId()) || 1,
        
        // 🔥 Category Fix: Table expect kar rahi hai 'crimes' ya 'events'
        category: this.currentCategory.toLowerCase().includes('criminal') || 
                  this.currentCategory.toLowerCase().includes('crimes') ? 'crimes' : 'events',
        
        report_type: this.eventTitle.toLowerCase().trim().replace(/\s/g, '_'),
        
        // Saara form data JSON mein jayega
        report_data: formattedReportData, 
        
        // 🔥 Direct Columns Mapping (Jo aapne table list bheji uske hisaab se)
        latitude: gpsValue.includes(',') ? gpsValue.split(',')[0].trim() : "0",
        longitude: gpsValue.includes(',') ? gpsValue.split(',')[1].trim() : "0",
        photo: this.capturedPhoto || '',
        beat: this.reportData['Assigned Beat'] || 'General',
        status: 'Pending',
        
        // Frontend se hi date bhej rahe hain for safety
        date: new Date().toISOString().split('T')[0]
      };

      console.log("🚀 Final Payload sending to DB:", payload);

      // 3. SERVICE CALL
      this.dataService.submitForestEvent(payload).subscribe({
        next: async (res) => {
          await loading.dismiss();
          const toast = await this.toastCtrl.create({
            message: 'Report Submitted Successfully! ✅',
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.navCtrl.back();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error("❌ Submission Error Log:", err);
          
          const toast = await this.toastCtrl.create({
            message: 'Error: ' + (err.error?.message || 'Server connection failed'),
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });

    } catch (err) {
      await loading.dismiss();
      console.error("Fatal Script Error:", err);
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}