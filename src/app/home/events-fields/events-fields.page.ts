import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
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
      { label: 'Storage Type', type: 'select', placeholder: 'Select Storage Type', options: ['Godown', 'Open Space', 'Others'], key: 'storage_type' },
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

    // Is code ko fieldsConfig object ke andar add karein:

'Fire Alerts': [
  { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
  { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
  //{ label: 'Beat Name', type: 'text', placeholder: 'Enter specific beat name', key: 'beat_name' },
  { label: 'Fire Cause', type: 'select', options: ['Natural', 'Negligence', 'Intentional', 'Unknown'], key: 'fire_cause' },
  { label: 'Damage Type', type: 'select', options: ['Forest Area', 'Grassland', 'Wildlife Habitat', 'Plantation', 'Human Property', 'Mixed'], key: 'damage_type' },
  { label: 'Area Burnt (Hectares)', type: 'number', placeholder: '0.00', key: 'area_burnt' },
  { label: 'No. of Personnel Deployed', type: 'number', placeholder: '0', key: 'personnel_count' },
  { label: 'Response Time (Minutes)', type: 'number', placeholder: '0', key: 'response_time' },
  { label: 'Fire Status', type: 'select', options: ['Active', 'Controlled', 'Extinguished'], key: 'fire_status' },
  { label: 'Detected By', type: 'select', options: ['Patrol', 'Satellite', 'Villager', 'Sensor', 'Other'], key: 'detected_by' },
  { label: 'Estimated Loss', type: 'text', placeholder: 'Value in ₹ or description', key: 'estimated_loss' },
  { label: 'Reported By', type: 'text', placeholder: 'Name / Designation', key: 'reported_by' },
  { label: 'Action Taken', type: 'textarea', placeholder: 'Describe steps taken', key: 'action_taken' },
  { label: 'Remarks', type: 'textarea', placeholder: 'Additional notes', key: 'remarks' },
  { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo' }
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
    private cdr: ChangeDetectorRef,
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
    this.hierarchyService.getAssignedBeat(rangerId).subscribe({
      next: (data: any) => {
        // HomePage ki tarah yahan bhi 'beatName' use karein
        if (data && data.beatName) { 
          this.assignedBeat = data.beatName;
          // Form field ka label 'Assigned Beat' hai, isliye yahi key use hogi
          this.reportData['Assigned Beat'] = data.beatName;
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

    // --- CRITICAL FIX: Save numeric coordinates to reportData ---
    // Inhein save karna zaroori hai taaki submitReport() inhein DB mein bhej sake
    this.reportData['latitude'] = lat.toString();
    this.reportData['longitude'] = lon.toString();
    
    console.log(`Current Coordinates: Lat ${lat}, Lon ${lon}`);

    const gpsField = this.dynamicFields.find(f => f.id === 'gps');
    
    if (gpsField) {
      // Step A: Show loading status in UI
      gpsField.value = "Fetching Address...";
      this.cdr.detectChanges();

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      
      if (data && data.display_name) {
        // Step B: Update UI with readable address
        gpsField.value = data.display_name; 

        // Step C: Update reportData for HTML binding
        // gpsField.label 'GPS Status' ya 'GPS Location' ho sakta hai config ke hisaab se
        this.reportData[gpsField.label] = data.display_name;

        // Step D: Force UI refresh
        this.cdr.detectChanges();

        console.log('UI Updated with Address:', data.display_name);
      } else {
        // Backup: Agar address na mile toh coordinates hi dikha dein
        gpsField.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        this.reportData[gpsField.label] = gpsField.value;
        this.cdr.detectChanges();
      }
    }
  } catch (err) {
    console.error("Location error", err);
    const gpsField = this.dynamicFields.find(f => f.id === 'gps');
    if (gpsField) {
      gpsField.value = "Location Error (Check GPS Settings)";
      this.reportData[gpsField.label] = "Location Error";
      this.cdr.detectChanges();
    }
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
        quality: 60, // Reduced quality slightly for stability
        allowEditing: false,
        resultType: CameraResultType.Base64, // Changed from Uri to Base64
        source: source
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.log('User cancelled or camera failed', error);
    }
  }


 
  async submitReport() {
  const loading = await this.loadingCtrl.create({
    message: 'Saving Report...',
    spinner: 'circles'
  });
  await loading.present();

  try {
    const formattedReportData: any = {};
    
    // 1. Dynamic fields se data nikalna (Formatting for report_data JSON)
    this.dynamicFields.forEach(field => {
      const userValue = this.reportData[field.label];
      const key = field.key || field.label;
      formattedReportData[key] = userValue || "";
    });

    // 🔥 YE LOGIC YAHAN HONA CHAHIYE (Function ke andar)
    const indiaTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
    const now = new Date(indiaTime);

    // 2. GPS Coordinates extraction (PRIORITIZE NUMERIC COORDINATES)
    const gpsField = this.dynamicFields.find(f => f.id === 'gps');
    const gpsValue = gpsField?.value || ""; 
    
    // Latitude/Longitude prioritized from reportData (where numeric strings are stored)
    let lat = this.reportData['latitude'] || "0";
    let lng = this.reportData['longitude'] || "0";

    // Backup only: If reportData is missing lat/lng, try parsing from gpsValue
    if ((lat === "0" || !lat) && gpsValue && gpsValue.includes(',')) {
      const parts = gpsValue.split(',');
      lat = parts[0].trim();
      lng = parts[1].trim();
    }
    console.log("LocalStorage Data:", localStorage.getItem('user_data'));
console.log("Company ID from Service:", this.dataService.getUserCompanyId());

const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const cId = userData.company_id || userData.companyId || 0;
  const clientId = userData.client_id || userData.clientId || null;
  const dynamicRangeName = userData.range_name || this.reportData['range'] ||null;

    // 3. FINAL PAYLOAD (Dono versions ka merged data)
    const payload = {
      report_id: 'FOR-' + Date.now(),
      user_id: Number(this.dataService.getRangerId()),
      company_id: Number(cId),
      client_id: Number(clientId || 0),
      patrol_id: Number(localStorage.getItem('active_patrol_id')) || null,
      range: dynamicRangeName || '',
      category: (this.currentCategory?.toLowerCase().includes('criminal') || 
                this.currentCategory?.toLowerCase().includes('crimes')) ? 'crimes' : 'events',
      report_type: this.eventTitle || 'General',
      latitude: Number(lat),
      longitude: Number(lng),
      beat: this.reportData['Assigned Beat'] || this.reportData['beat'] || 'General',
      report_data: JSON.stringify(formattedReportData), 
      photo: this.capturedPhoto || '',
      status: 'Pending'
    };

    console.log("🚀 Final Merged Payload sending to DB:", payload);

    // 4. SERVICE CALL
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
    if (loading) await loading.dismiss();
    console.error("Fatal Script Error:", err);
  }
}

  goBack() {
    this.navCtrl.back();
  }
}