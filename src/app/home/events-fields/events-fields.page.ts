import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ActionSheetController, ToastController, LoadingController, GestureController, AlertController } from '@ionic/angular';
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
  currentCategory: string = 'General';
  dynamicFields: any[] = [];
  capturedPhotos: string[] = [];
  selectedZoomImage: string | null = null;
  currentZoom: number = 1; // 🔍 Zoom level state
  isConfigLoaded: boolean = false; // 🛡️ Prevent redundant re-loads
  recentReports: any[] = [];
  isFormValid: boolean = false;
  swipeThreshold = 0.8;
  swipeCompleted = false;
  assignedBeat: string = 'Loading...';
  currentSiteId: string = '';
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
      { label: 'Article Seized', type: 'select', options: ['Yes', 'No'], key: 'article_seized' },
      { label: 'Article Details', type: 'text', key: 'article_details', dependsOn: 'Article Seized', showIf: 'Yes' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ],

    'Illegal Mining': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Mineral Type', type: 'text', placeholder: 'e.g. Sand', key: 'mineral_type' },
      { label: 'Estimated Volume (cu mtr)', type: 'number', key: 'volume_cum' },
      { label: 'Vehicle Seized', type: 'select', options: ['Yes', 'No'], key: 'vehicle_seized' },
      { label: 'Vehicle Seized Type', type: 'text', key: 'vehicle_seized_type', dependsOn: 'Vehicle Seized', showIf: 'Yes' },
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
      { label: 'No. of Males', type: 'number', key: 'num_males' },
      { label: 'No. of Females', type: 'number', key: 'num_females' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], key: 'gender' },
      { label: 'Evidence Type', type: 'select', options: ['Photo', 'Pugmark', 'Scratch', 'Scat', 'Body Part', 'Den', 'Other'], key: 'evidence_type' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo_evidence' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Water Source Status': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Source Type', type: 'select', options: ['Earthen Pond', 'Dam', 'Check Dam', 'Stop Dam', 'Concrete Pond', 'Water Stream', 'Well', 'Others'], key: 'source_type' },
      { label: 'Is it Dry?', type: 'select', options: ['Seasonal (Mausami)', 'Perennial (Baramasi)'], key: 'is_dry' },
      { label: 'Water Quality', type: 'text', key: 'water_quality' },
      { label: 'Animal Signs Observed', type: 'text', key: 'animal_sign' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Fire Alerts': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
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
      { label: 'Name of Victims/Owner', type: 'text', key: 'victim_name' },
      { label: 'Name of Animal', type: 'text', key: 'animal_name', placeholder: 'Enter animal name' },
      { label: 'Village of Incident', type: 'text', key: 'village' },
      { label: 'Amount Claimed (₹)', type: 'number', key: 'amount_claimed' },
      { label: 'Upload Evidence Photo', type: 'file', icon: 'camera-outline', key: 'damage_photo' },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ],

    'Plantation': [
      { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Species', type: 'select', options: this.speciesOptions, key: 'species' },
      { label: 'Total Count', type: 'number', key: 'count' },
      { label: 'Area Covered (Hectares)', type: 'number', key: 'area' },
      { label: 'Plantation Year', type: 'number', key: 'year' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline', key: 'photo' },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ]
  };

  constructor(
    private route: ActivatedRoute, 
    public navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private hierarchyService: HierarchyService,
    private cdr: ChangeDetectorRef,
    private gestureCtrl: GestureController,
    private alertCtrl: AlertController,
  ) {
    this.takePhoto = this.takePhoto.bind(this);
    this.selectImageSource = this.selectImageSource.bind(this);
  }

  ngOnInit() {
    this.loadRecentSubmissions();

    let title = this.route.snapshot.paramMap.get('title');
    const category = this.route.snapshot.paramMap.get('category');
    
    this.route.queryParams.subscribe(params => {
      let pid = params['patrolId'] || params['activeId'] || null;
      
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
    if (this.isConfigLoaded) return; 

    const loading = await this.loadingCtrl.create({
      message: 'Fetching Form Template...',
      spinner: 'crescent'
    });
    await loading.present();

    console.log(`📡 STRICT SYNC: Fetching Global Configs for: [${this.eventTitle}]`);

    this.dataService.getForestReportConfigs().subscribe({
      next: (res: any) => {
        // Robust extraction logic for Sir's API response
        const allConfigs = res?.data || res || [];
        
        // Match by title or report_type
        const matchedConfig = allConfigs.find((c: any) => 
          (c.report_type === this.eventTitle) || 
          (c.title === this.eventTitle) ||
          (c.name === this.eventTitle)
        );

        let fields = [];
        if (matchedConfig) {
          fields = matchedConfig.fields || matchedConfig.details || [];
          console.log("🛠️ STRICT SYNC: Matched Config Found in Sir's API");
        }

        if (fields.length > 0) {
          this.dynamicFields = fields;
        } else {
          console.warn("📦 [RESTORE] Sir's API returned no fields for this title. Using Internal Recovery Form.");
          this.dynamicFields = this.fieldsConfig[this.eventTitle] || [];
        }
        
        this.isConfigLoaded = true;
        this.fetchLocation();
        this.loadDefaultBeat();
        setTimeout(() => this.initSwipeGesture(), 500);
        loading.dismiss();
      },
      error: (err: any) => {
        console.error("⚠️ STRICT SYNC FAILED:", err);
        this.dynamicFields = this.fieldsConfig[this.eventTitle] || [];
        this.isConfigLoaded = true; 
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
    next: (res: any) => {
      // Sir's /getGuardSite returns { data: { id, site_name, ... } } or similar
      const rawPayload = res?.data || res || [];
      const sites = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
      if (sites.length > 0 && (sites[0].site_name || sites[0].name)) {
        const firstSite = sites[0];
        const siteName = firstSite.site_name || firstSite.name || 'General';
        this.assignedBeat = siteName;
        this.currentSiteId = String(firstSite.id || '');
        this.reportData['Assigned Beat'] = siteName;
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
      timeout: 30000,
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
        resultType: CameraResultType.Base64,
        source: source
      });
      if (image.base64String) {
        const photoUrl = `data:image/jpeg;base64,${image.base64String}`;
        this.capturedPhotos.push(photoUrl);
        this.checkFormValidity();
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
      
      // Skip validation if field is hidden
      if (!this.isFieldVisible(field)) continue;

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

      // Check for conditional "Other" field
      if (field.type === 'select' && (userValue === 'Other' || userValue === 'Others')) {
        const otherValue = this.reportData[field.label + '_other'];
        if (!otherValue || otherValue.trim() === '') {
          isValid = false;
          break;
        }
      }
    }
    this.isFormValid = isValid;
    return isValid;
  }

  isFieldVisible(field: any): boolean {
    if (!field.dependsOn) return true;
    const parentValue = this.reportData[field.dependsOn];
    return parentValue === field.showIf;
  }

  // --- Image Viewer / Zoom Logic ---
  openZoom(imgUrl: string) {
    this.selectedZoomImage = imgUrl;
    this.currentZoom = 1; // Reset zoom level
  }

  // Double tap logic or simple button toggle
  toggleZoom(event: any) {
    event.stopPropagation();
    if (this.currentZoom >= 2.5) {
      this.currentZoom = 1;
    } else {
      this.currentZoom += 0.5;
    }
  }

  closeZoom() {
    this.selectedZoomImage = null;
    this.currentZoom = 1;
  }

  async downloadImage(imageUrl: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Preparing download...',
      duration: 1000
    });
    await loading.present();
    
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `forest_photo_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
    }
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

  loadRecentSubmissions() {
    this.recentReports = this.dataService.getRecentSubmissions();
  }

  async submitReport() {
    const formattedReportData: any = {};
    // Build formatted report data as a JSON string
    this.dynamicFields.forEach(field => {
      const userValue = this.reportData[field.label];
      const key = field.key || field.label;
      formattedReportData[key] = userValue || "";
      if (field.type === 'select' && (userValue === 'Other' || userValue === 'Others')) {
        const otherValue = this.reportData[field.label + '_other'];
        if (otherValue) formattedReportData[key + '_details'] = otherValue;
      }
    });

    const gpsField = this.dynamicFields.find(f => f.id === 'gps');
    const gpsValue = gpsField?.value || "";      
    let lat = this.reportData['latitude'] || "0";
    let lng = this.reportData['longitude'] || "0";
    
    // Safety check: ensure coordinates aren't lost if they exist in reportData
    if (lat === "0" && this.reportData['gps']) {
       // Peek if it's in the gps field string e.g. "19.9, 79.1"
       const parts = this.reportData['gps'].split(',');
       if (parts.length === 2) {
          lat = parts[0].trim();
          lng = parts[1].trim();
       }
    }
    const photoArray = this.capturedPhotos.map(p => ({ photo: p }));

    // --- SIR'S API ALIGNMENT ---
    // IMPORTANT: Sir's database expects an INTEGER for patrol_id.
    // If we send the String UID (e.g. PATROL_123...), the server saves it as 0.
    // We MUST prioritize the Numeric ID (e.g. 2987).
    let cleanPatrolId: any = "0";
    const numericId = this.patrolId || localStorage.getItem('active_patrol_id');
    const sessionString = localStorage.getItem('active_patrol_session_id');

    if (numericId && numericId !== '0' && numericId !== 'null' && numericId !== 'undefined') {
      cleanPatrolId = numericId; // Use the Numeric ID for DB mapping
    } else if (sessionString) {
      cleanPatrolId = sessionString; // Fallback to string only if no number found
    }

    const payload = {
      api_token: localStorage.getItem('api_token'),
      category: this.currentCategory || 'Events & Monitoring',
      report_type: this.eventTitle || 'General Report',
      latitude: Number(lat),
      longitude: Number(lng),
      patrol_id: cleanPatrolId,
      site_id: this.currentSiteId, // Dynamically loaded from /getSites
      report_data: JSON.stringify(formattedReportData),
      photo: "" // Will be set per-mode below
    };

    // 1. Check Network Connectivity
    if (!this.dataService.isOnline()) {
      console.warn("🌐 Device is OFFLINE. Saving as draft immediately.");
      this.saveAsDraft(payload);
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Submitting Report...',
      spinner: 'crescent'
    });
    await loading.present();

    const isStandalone = (cleanPatrolId === '0');
    const headers = { 'Bypass-Token': 'true' };

    if (isStandalone) {
      // --- STANDALONE MODE: Use reportIncidence ---
      console.log("📂 [MODE: STANDALONE] Using reportIncidence API");
      
      const firstPhoto = this.capturedPhotos.length > 0 ? this.capturedPhotos[0] : '';
      const incidentPayload = {
        api_token: payload.api_token,
        incidence_type: payload.report_type,
        latitude: payload.latitude,
        longitude: payload.longitude,
        remarks: `Category: ${payload.category} | Data: ${payload.report_data}`,
        photo: firstPhoto // Standalone expects single string
      };

      this.dataService.reportNewIncident(incidentPayload).subscribe({
        next: async (res) => {
          await loading.dismiss();
          this.handleSuccess(payload);
        },
        error: async (err) => {
          await loading.dismiss();
          this.handleError(err, incidentPayload);
        }
      });

    } else {
      // --- PATROL MODE: Use forest-reports ---
      console.log("🚀 [MODE: PATROL] Using forest-reports API. Patrol ID:", cleanPatrolId);
      
      const photoArrayStr = JSON.stringify(this.capturedPhotos.map(p => ({ photo: p })));
      const patrolPayload = {
        ...payload,
        photo: photoArrayStr // Patrol expects JSON array string
      };

      this.dataService.submitForestEvent(patrolPayload, headers).subscribe({
        next: async (res) => {
          await loading.dismiss();
          this.handleSuccess(payload);
        },
        error: async (err) => {
          await loading.dismiss();
          this.handleError(err, patrolPayload);
        }
      });
    }
  }

  async handleSuccess(payload: any) {
    this.dataService.saveRecentSubmission(payload);
    const toast = await this.toastCtrl.create({
      message: 'Report Submitted Successfully! ✅',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
    this.navCtrl.back();
  }

  async handleError(err: any, payload: any) {
    console.error("❌ Submission Error:", err);
    
    // Check for offline/network error (status 0 means no connection to server)
    if (err.status === 0 || !this.dataService.isOnline()) {
      console.warn("🌐 Network error detected. Saving as draft automatically.");
      this.saveAsDraft(payload);
    } else {
      // For actual server errors (4xx, 5xx), show the alert
      const alert = await this.alertCtrl.create({
        header: 'Submission Error',
        message: 'Server could not accept this report. Please check your data or try again later.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // Optimized Draft logic
  async saveAsDraft(payload: any) {
    this.dataService.saveForestEventDraft(payload);
    const toast = await this.toastCtrl.create({
      message: 'Saved as Draft (Offline Mode) 📁',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
    this.navCtrl.back();
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatTitle(str: string) {
    if (!str) return '';
    return str.replace(/_/g, ' ').toUpperCase();
  }

  goBack() {
    this.navCtrl.back();
  }
}