import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ActionSheetController, ToastController, LoadingController, GestureController } from '@ionic/angular';
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
  capturedPhotos: string[] = [];
  isFormValid: boolean = false;
  swipeThreshold = 0.8;
  swipeCompleted = false;
  assignedBeat: string = 'Loading...';
  patrolId: string | null = null;
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
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private hierarchyService: HierarchyService,
    private cdr: ChangeDetectorRef,
    private gestureCtrl: GestureController,
  ) {}

  ngOnInit() {
    // 1. URL parameters extraction
    let title = this.route.snapshot.paramMap.get('title');
    const category = this.route.snapshot.paramMap.get('category');
    
    // 2. Query parameters extraction (Patrol Linking)
    this.route.queryParams.subscribe(params => {
      // 🛡️ PRIMARY: URL Parameters (passed from PatrolActivePage)
      let pid = params['patrolId'] || params['activeId'] || null;
      
      // 🛡️ SECONDARY: Local Storage (Set by PatrolActivePage)
      if (!pid || pid === 'null' || pid === 'undefined') {
        pid = localStorage.getItem('active_patrol_id');
        console.log("💾 [FALLBACK] Recovered ID from storage:", pid);
      }
 
      this.patrolId = pid;
      console.log("🚀 [STRICT SYNC] EventsFields Patrol ID locked to:", this.patrolId);
    });

    if (category) {
      this.currentCategory = category;
    }

    if (title) {
      title = decodeURIComponent(title);
      this.eventTitle = title;

      // 🔥 DYNAMIC CONFIG SYNC: Fetch custom form from DB
      this.loadCustomConfiguration();
    }
  }

  async loadCustomConfiguration() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading form...',
      spinner: 'crescent',
      duration: 2000 // Safety timeout
    });
    await loading.present();

    // 🔥 SYNC FIX: Map UI Category to Database Key (match the builder)
    const dbCategory = (this.currentCategory === 'Criminal Activity') ? 'crimes' : 'events';

    console.log(`📡 Fetching Template for: [${dbCategory} | ${this.eventTitle}]`);

    this.dataService.getFormConfig(dbCategory, this.eventTitle).subscribe({
      next: (config: any) => {
        if (config && config.fields && config.fields.length > 0) {
          console.log("🛠️ Using Custom Form Configuration from DB");
          this.dynamicFields = config.fields;
        } else {
          console.log("📦 Using Hardcoded Default Form Configuration");
          this.dynamicFields = this.fieldsConfig[this.eventTitle] || [];
        }
        
        this.fetchLocation();
        this.loadDefaultBeat();
        setTimeout(() => this.initSwipeGesture(), 500);
        loading.dismiss();
      },
      error: (err) => {
        console.warn("⚠️ Config fetch failed, falling back to defaults:", err);
        this.dynamicFields = this.fieldsConfig[this.eventTitle] || [];
        this.fetchLocation();
        this.loadDefaultBeat();
        setTimeout(() => this.initSwipeGesture(), 500);
        loading.dismiss();
      }
    });
  }

  updateCheckboxValue(label: string, option: string, event: any) {
    if (!this.reportData[label]) {
      this.reportData[label] = [];
    }
    if (typeof this.reportData[label] === 'string') {
        this.reportData[label] = this.reportData[label].split(',').map((s: string) => s.trim());
    }
    if (event.detail.checked) {
      if (!this.reportData[label].includes(option)) {
        this.reportData[label].push(option);
      }
    } else {
      this.reportData[label] = this.reportData[label].filter((o: string) => o !== option);
    }
    this.checkFormValidity();
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
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000
    });
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
    if (this.capturedPhotos.length >= 5) {
      const toast = await this.toastCtrl.create({ message: 'Maximum 5 photos allowed!', duration: 2000, color: 'warning' });
      await toast.present();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 60, // Reduced quality slightly for stability
        allowEditing: false,
<<<<<<< Updated upstream
        resultType: CameraResultType.Base64, // Changed from Uri to Base64
        source: source
      });
      if (image.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
=======
        resultType: CameraResultType.DataUrl,
        source: source
      });
      if (image.dataUrl) {
        this.capturedPhotos.push(image.dataUrl);
        this.checkFormValidity();
>>>>>>> Stashed changes
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.log('User cancelled or camera failed', error);
    }
  }

  removePhoto(index: number) {
    this.capturedPhotos.splice(index, 1);
    this.checkFormValidity();
    this.cdr.detectChanges();
  }

  checkFormValidity() {
    let isValid = true;
    for (const field of this.dynamicFields) {
      if (field.id === 'gps') continue; // Always filled by fetchLocation

      const userValue = this.reportData[field.label];
      if (field.type === 'file') {
        if (this.capturedPhotos.length === 0) {
          isValid = false;
          break;
        }
      } else if (!userValue || userValue.toString().trim() === '') {
        isValid = false;
        break;
      }
    }
    this.isFormValid = isValid;
    return isValid;
  }

  // Swipe Gesture logic
  initSwipeGesture() {
    const track = document.querySelector('.swipe-track') as HTMLElement;
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (!track || !thumb) return;

    const trackWidth = track.clientWidth - thumb.clientWidth - 8;

    const gesture = this.gestureCtrl.create({
      el: thumb,
      threshold: 0,
      gestureName: 'swipe-to-submit',
      onMove: ev => {
        if (this.swipeCompleted) return;
        let x = ev.deltaX;
        if (x < 0) x = 0;
        if (x > trackWidth) x = trackWidth;
        thumb.style.transform = `translateX(${x}px)`;
        
        // Progress percentage for background color or opacity if needed
        const progress = x / trackWidth;
        track.style.setProperty('--progress', `${progress}`);
      },
      onEnd: ev => {
        if (this.swipeCompleted) return;
        const x = ev.deltaX;
        if (x >= trackWidth * this.swipeThreshold) {
          // Success Swipe
          if (this.checkFormValidity()) {
            this.swipeCompleted = true;
            thumb.style.transform = `translateX(${trackWidth}px)`;
            this.submitReport();
          } else {
            // Snap back if invalid
            this.showValidationError();
            this.resetSwipe();
          }
        } else {
          // Snap back
          this.resetSwipe();
        }
      }
    });

    gesture.enable(true);
  }

  async showValidationError() {
    const toast = await this.toastCtrl.create({
      message: 'Please fill all mandatory fields and capture photos! ⚠️',
      duration: 3000,
      color: 'danger',
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  resetSwipe() {
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (thumb) {
      thumb.style.transition = 'transform 0.3s ease-out';
      thumb.style.transform = 'translateX(0px)';
      setTimeout(() => thumb.style.transition = '', 300);
    }
    const track = document.querySelector('.swipe-track') as HTMLElement;
    if (track) track.style.setProperty('--progress', '0');
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

    // 🔥 UTC ISO FIX: Store arrival time in unambiguous UTC format
    const indiaTime = new Date().toISOString();
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
  const uName = userData.name || userData.userName || 'Forest Ranger';
  const dynamicRangeName = userData.range_name || this.reportData['range'] ||null;

    // 3. FINAL PAYLOAD (Dono versions ka merged data)
    const payload = {
      report_id: 'FOR-' + Date.now(),
<<<<<<< Updated upstream
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
=======
       user_id: Number(this.dataService.getRangerId()),
       user_name: uName,
      company_id: Number(cId),
     client_id: clientId,
      range: null,
      // Category Mapping Logic
      category: (this.currentCategory?.toLowerCase().includes('criminal') || 
                this.currentCategory?.toLowerCase().includes('crimes')) ? 'crimes' : 'events',
      
      // Type Mapping
      report_type: this.eventTitle ? this.eventTitle.toLowerCase().trim().replace(/\s/g, '_') : 'general_report',
      
    
      // 🛡️ Standardized ISO Timestamp
      date_time: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      
      // Location Data
      latitude: lat,
      longitude: lng,
      beat: this.reportData['Assigned Beat'] || this.reportData['beat'] || 'General',
      
      // Merged Data Fields
      report_data: formattedReportData, // Form data as JSON
      photo: this.capturedPhotos[0] || '', // Primary photo
      additional_photos: JSON.stringify(this.capturedPhotos.slice(1)), // Extra photos
      status: 'Pending',
      patrol_id: this.patrolId ? Number(this.patrolId) : null 
>>>>>>> Stashed changes
    };

    console.log("🚀 [DEBUG] Resolving Patrol ID for Payload:", this.patrolId);
    console.log("🚀 [DEBUG] FULL PAYLOAD OBJECT:", payload);

    // 4. SERVICE CALL
    this.dataService.submitForestEvent(payload).subscribe({
      next: async (res) => {
        this.swipeCompleted = false; // Reset for potential next use or error case handling in better UX
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
        this.swipeCompleted = false;
        this.resetSwipe();
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