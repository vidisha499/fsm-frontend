import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ActionSheetController, ToastController, LoadingController, GestureController, AlertController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DataService } from 'src/app/data.service';
import { HierarchyService } from 'src/app/services/hierarchy.service';
import { PhotoViewerService } from 'src/app/services/photo-viewer.service';

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
      { label: 'Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Species List', type: 'select', placeholder: 'Select Species', options: this.speciesOptions, key: 'species', required: true },
      { label: 'Reason for Felling', type: 'text', placeholder: 'Describe reason', key: 'reason' },
      { label: 'No. of Trees', type: 'number', placeholder: '0', key: 'tree_count', required: true },
      { label: 'Total Volume (Cu.Mtr)', type: 'number', placeholder: '0.00', key: 'volume', required: true },
      { label: 'Action Taken / Remarks', type: 'textarea', placeholder: 'Immediate action steps', key: 'action_taken' },
      { label: 'Overall Remarks', type: 'textarea', placeholder: 'Any additional notes', key: 'overall_remarks' }
    ],

    'Illegal Timber Transport': [
      { label: 'Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Name of Forest Produce', type: 'text', placeholder: 'e.g. Teak Logs', key: 'produce_name', required: true },
      { label: 'No. of Trees', type: 'number', placeholder: 'Enter tree count', key: 'tree_count', required: true },
      { label: 'Volume (Cub.Mtr)', type: 'number', placeholder: 'Enter volume', key: 'volume', required: true },
      { 
        label: 'Vehicle Type', 
        type: 'select', 
        placeholder: 'Select Vehicle', 
        icon: 'car-outline',
        options: ['Truck', 'Tractor', 'Tempo', 'Bullock Cart', 'Two-wheeler', 'Other'],
        key: 'vehicle_type',
        required: true
      },
      { label: 'Vehicle Number', type: 'text', placeholder: 'e.g. MP-04-AB-1234', key: 'vehicle_no', required: true },
      { label: 'Route Taken', type: 'text', placeholder: 'Enter route details', key: 'route' },
      { label: 'Name of Accused', type: 'text', placeholder: 'Enter name', key: 'accused_name' },
      { label: 'Address', type: 'textarea', placeholder: 'Enter full address', key: 'address' },
      { label: 'Remark', type: 'textarea', placeholder: 'Additional observations', key: 'remarks' }
    ],

    'Illegal Timber Storage': [
      { label: 'Species', type: 'select', placeholder: 'Select Species', options: this.speciesOptions, key: 'species', required: true },
      { label: 'Quantity', type: 'number', placeholder: 'Enter quantity', key: 'qty_cmt', required: true },
      { label: 'Storage Type', type: 'select', placeholder: 'Select Storage Type', options: ['Godown', 'Open Space', 'Others'], key: 'storage_type', required: true },
      { label: 'Name of Owner', type: 'text', placeholder: 'Enter owner name', key: 'owner_name' },
      { label: 'Address of Owner', type: 'textarea', placeholder: 'Enter owner address', key: 'owner_address' },
      { label: 'Storage Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Remarks', type: 'textarea', placeholder: 'Any additional notes', key: 'remarks' }
    ],

    'Wild Animal Poaching': [
      { label: 'Species', type: 'select', placeholder: 'Select Animal', options: this.animalSpecies, key: 'species', required: true },
      { label: 'Cause of Death', type: 'text', placeholder: 'e.g. Trap, Poisoning', key: 'cause_death' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], key: 'gender' },
      { label: 'Age Class', type: 'select', options: ['Adult', 'Sub-Adult', 'Juvenile', 'Unknown'], key: 'age_class' },
      { 
        label: 'Carcass State', 
        type: 'select', 
        options: ['Fresh', 'Partially decomposed', 'Highly decomposed', 'Skeletonized', 'Scavenged', 'Others'],
        key: 'carcass_state'
      },
      { label: 'Evidence Photo', type: 'file', icon: 'camera-outline', key: 'photos', required: true },
      { label: 'Notes', type: 'textarea', placeholder: 'Enter additional observations', key: 'notes' }
    ],

    'Encroachment': [
      { label: 'Encroachment Type', type: 'select', options: ['Agriculture', 'Construction'], key: 'encroachment_type', required: true },
      { label: 'Area (Hectare)', type: 'number', placeholder: 'e.g. 1.5', key: 'area_hectare', required: true },
      { label: 'Number of Encroachers', type: 'number', placeholder: 'Enter count', key: 'num_encroachers' },
      { label: 'Name of Person/Occupant', type: 'text', placeholder: 'Enter name', key: 'occupant_name' },
      { label: 'Phone Number of Person', type: 'text', placeholder: 'Enter phone', key: 'occupant_phone' },
      { label: 'Article Seized', type: 'select', options: ['Yes', 'No'], key: 'article_seized', required: true },
      { label: 'Article Details', type: 'text', key: 'article_details', dependsOn: 'Article Seized', showIf: 'Yes' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ],

    'Illegal Mining': [
      { label: 'Mineral Type', type: 'select', options: ['Sand', 'Stone', 'Murrum', 'Others'], key: 'mineral_type', required: true },
      { label: 'Estimated Volume (Cub.Mtr)', type: 'number', placeholder: 'Enter volume', key: 'volume_cum', required: true },
      { label: 'Vehicle Seized', type: 'select', options: ['Yes', 'No'], key: 'vehicle_seized', required: true },
      { label: 'Seized Vehicle Type', type: 'select', options: ['Truck', 'Tractor', 'Tempo', 'Bullock Cart', 'Two-wheeler', 'Other'], key: 'seized_vehicle_type', dependsOn: 'Vehicle Seized', showIf: 'Yes' },
      { label: 'Seized Vehicle Number', type: 'text', placeholder: 'Enter vehicle number', key: 'seized_vehicle_no', dependsOn: 'Vehicle Seized', showIf: 'Yes' },
      { label: 'Action Taken / Remark', type: 'textarea', placeholder: 'Enter details', key: 'action_taken' },
      { label: 'Site Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Name of Accused', type: 'text', placeholder: 'Enter name', key: 'accused_name' },
      { label: 'Address', type: 'textarea', placeholder: 'Enter address', key: 'accused_address' }
    ],

    'JFMC / Social Forestry': [
      // { label: 'GPS Status', type: 'text', value: 'Fetching Address...', readonly: true, icon: 'location-outline', id: 'gps' },
      // { label: 'Assigned Beat', type: 'text', placeholder: 'Enter Beat Name', key: 'beat' },
      { label: 'Village', type: 'text', key: 'village' },
      { label: 'Photo of Samiti Prastavana', type: 'file', icon: 'camera-outline', key: 'photo_prastavna' },
      { label: 'Photo of Samiti Baithak', type: 'file', icon: 'camera-outline', key: 'photo_baithak' },
      { label: 'Remarks', type: 'textarea', key: 'decisions' }
    ],

    'Wild Animal Sighting': [
      { label: 'Species', type: 'select', options: this.animalSpecies, key: 'species', required: true },
      { label: 'Sighting Type', type: 'select', options: ['Direct', 'Indirect'], key: 'sighting_type', required: true },
      { label: 'No. of Animals', type: 'number', key: 'num_animals', required: true },
      { label: 'No. of Males', type: 'number', placeholder: 'Optional', key: 'num_males' },
      { label: 'No. of Females', type: 'number', placeholder: 'Optional', key: 'num_females' },
      { label: 'Evidence Type', type: 'select', options: ['Photo', 'Pugmark', 'Scratch', 'Scat', 'Body Part', 'Den', 'Other'], key: 'evidence_type', required: true },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Water Source Status': [
      { label: 'Source Type', type: 'select', options: ['Natural Pond', 'Earthen Dam', 'Check Dam', 'Stop Dam', 'Concrete Water Hole', 'River Stream', 'Open Well', 'Closed Well', 'Others'], key: 'source_type', required: true },
      { label: 'Is it Dry?', type: 'select', options: ['Seasonal (Mausami)', 'Perennial (Baramasi)'], key: 'is_dry', required: true },
      { label: 'Water Quality', type: 'select', options: ['Clean/Clear', 'Muddy/Turbid', 'Stagnant/Algae', 'Polluted/Contaminated', 'Unknown', 'Other'], key: 'water_quality', required: true },
      { label: 'Animal Signs Observed', type: 'text', key: 'animal_sign' },
      { label: 'Upload Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Remarks', type: 'textarea', key: 'notes' }
    ],

    'Fire Alerts': [
      { label: 'Compartment/Beat Name', type: 'text', placeholder: 'Enter name/number', key: 'beat_name', required: true },
      { label: 'Fire Cause', type: 'select', options: ['Natural', 'Negligence', 'Intentional', 'Unknown'], key: 'fire_cause', required: true },
      { label: 'Damage Type', type: 'select', options: ['Forest Area', 'Grassland', 'Wildlife Habitat', 'Plantation', 'Human Property', 'Mixed'], key: 'damage_type', required: true },
      { label: 'Fire Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Other'], key: 'severity', required: true },
      { label: 'Area Burnt (Hectares)', type: 'number', placeholder: '0.00', key: 'area_burnt' },
      { label: 'No. of Personnel Deployed', type: 'number', placeholder: '0', key: 'personnel_count' },
      { label: 'Response Time (Minutes)', type: 'number', placeholder: '0', key: 'response_time' },
      { label: 'Fire Status', type: 'select', options: ['Active', 'Controlled', 'Extinguished'], key: 'fire_status' },
      { label: 'Weather Condition', type: 'select', options: ['Dry', 'Windy', 'Hot', 'Normal', 'Rainy'], key: 'weather' },
      { label: 'Detected By', type: 'select', options: ['Patrol', 'Satellite', 'Villager', 'Sensor', 'Other'], key: 'detected_by' },
      { label: 'Estimated Loss', type: 'text', placeholder: 'Value in ₹ or description', key: 'estimated_loss' },
      { label: 'Reported By', type: 'text', placeholder: 'Name / Designation', key: 'reported_by' },
      { label: 'Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Action Taken / Remarks', type: 'textarea', placeholder: 'Describe steps and additional notes', key: 'action_taken' }
    ],

    'Wildlife Compensation': [
      { label: 'Photo', type: 'file', icon: 'camera-outline', key: 'photo', required: true },
      { label: 'Compensation Type', type: 'select', options: ['Human death', 'Permanent disability', 'Human injury', 'Cattle death', 'crop damage', 'House damage', 'Other'], key: 'comp_type', required: true },
      { label: 'Animal Responsible', type: 'select', options: ['Leopard', 'Tiger', 'Jackal', 'Sloth Bear', 'Wild Boar', 'Hyena', 'Spotted Deer', 'Sambar', 'Other'], key: 'animal_name' },
      { label: 'Name of Victims/Owner', type: 'text', placeholder: 'Enter name', key: 'victim_name', required: true },
      { label: 'Village of Incident', type: 'text', placeholder: 'Enter village name', key: 'village', required: true },
      { label: 'Amount Claimed (₹)', type: 'number', placeholder: '0.00', key: 'amount_claimed', required: true },
      { label: 'Evidence Photo', type: 'file', icon: 'camera-outline', key: 'damage_photo', required: true },
      { label: 'Remarks', type: 'textarea', key: 'remarks' }
    ],

    'Plantation': [
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
    private photoViewer: PhotoViewerService
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
      }

      this.patrolId = pid;
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
  // 1. First Priority: Check localStorage (Matches Home Page behavior)
  const cachedBeat = localStorage.getItem('assigned_beat_name');
  if (cachedBeat && cachedBeat !== 'FETCHING...' && cachedBeat !== 'NOT ASSIGNED') {
    this.assignedBeat = cachedBeat;
    this.reportData['Assigned Beat'] = cachedBeat;
    this.reportData['beat'] = cachedBeat; // Backup key
    console.log("📍 [SYNC] Beat pre-populated from Cache:", cachedBeat);
  }

  // 2. Second Priority: Fetch from Server if Cache is missing or to refresh
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const rangerId = userData.id;

  if (rangerId) {
    this.hierarchyService.getAssignedBeat(rangerId).subscribe({
      next: (res: any) => {
        const sites = Array.isArray(res) ? res : (res?.data || []);
        if (sites.length > 0) {
          const firstSite = sites[0];
          const siteName = firstSite.site_name || firstSite.name || 'General';
          
          this.assignedBeat = siteName;
          this.currentSiteId = String(firstSite.id || '');
          this.reportData['Assigned Beat'] = siteName;
          this.reportData['beat'] = siteName;
          
          localStorage.setItem('assigned_beat_name', siteName);
        }
      },
      error: () => {
        if (!this.assignedBeat || this.assignedBeat === 'Loading...') {
          this.assignedBeat = 'General';
          this.reportData['Assigned Beat'] = 'General';
        }
      }
    });
  }
}

async fetchLocation() {
  let lat = 0;
  let lon = 0;
  try {
    try {
      // First attempt: High Accuracy
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      lat = coordinates.coords.latitude;
      lon = coordinates.coords.longitude;
    } catch (highAccErr) {
      console.warn("High accuracy GPS failed, falling back to low accuracy...", highAccErr);
      // Second attempt: Low Accuracy (Network/Cell based)
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      });
      lat = coordinates.coords.latitude;
      lon = coordinates.coords.longitude;
    }

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
    this.takePhoto(CameraSource.Camera);
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
    // --- STRICT GPS VALIDATION ---
    const lat = this.reportData['latitude'];
    const lon = this.reportData['longitude'];
    if (!lat || !lon || lat === "0" || lon === "0" || lat === 0 || lon === 0) {
      this.isFormValid = false;
      return false;
    }

    let isValid = true;
    for (const field of this.dynamicFields) {
      if (field.id === 'gps') continue; 
      
      // Skip validation if field is hidden
      if (!this.isFieldVisible(field)) continue;

      // 🔥 ONLY REQUIRE FIELDS MARKED AS REQUIRED
      if (!field.required) continue;

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

      // Check for conditional "Other" field (only if the main field is required)
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
    // Hidden fields as per user request (assigned beat and gps)
    const label = field.label?.toLowerCase();
    if (label === 'gps location' || label === 'gps status' || label === 'assigned beat' || field.id === 'gps') {
      return false;
    }

    if (!field.dependsOn) return true;
    const parentValue = this.reportData[field.dependsOn];
    return parentValue === field.showIf;
  }

  // --- Image Viewer / Zoom Logic ---
  openZoom(imgUrl: string) {
    if (!imgUrl) return;
    this.photoViewer.open(imgUrl);
  }

  closeZoom() {
    this.photoViewer.close();
  }

  async downloadImage(imageUrl: string) {
<<<<<<< Updated upstream
    await this.photoViewer.download(imageUrl);
=======
    this.photoViewer.download(imageUrl);
>>>>>>> Stashed changes
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
    const lat = this.reportData['latitude'];
    const lon = this.reportData['longitude'];
    
    let msg = 'Please fill all mandatory fields and capture photos! ⚠️';
    
    // Override message if the failure is specifically due to GPS
    if (!lat || !lon || lat === "0" || lon === "0" || lat === 0 || lon === 0) {
      msg = 'Location not found! Please enable GPS and wait for coordinates to load. 📍';
    }

    const toast = await this.toastCtrl.create({
      message: msg,
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

    const photoArrayStr = JSON.stringify(this.capturedPhotos.map(p => ({ photo: p })));
    const finalPayload = {
      ...payload,
      beat_id: payload.site_id, // Sir's Postman uses beat_id
      data: payload.report_data, // Sir's Postman uses data for JSON content
      photo: photoArrayStr
    };

    console.log("🚀 [STRICT SYNC] Using forest-reports API. Patrol ID:", cleanPatrolId);
    
    const headers = { 'Bypass-Token': 'true' };
    this.dataService.submitForestEvent(finalPayload, headers).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.handleSuccess(payload);
      },
      error: async (err) => {
        await loading.dismiss();
        this.handleError(err, finalPayload);
      }
    });
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