import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController, LoadingController, ActionSheetController, GestureController, ItemReorderEventDetail } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-dynamic-forms',
  templateUrl: './dynamic-forms.page.html',
  styleUrls: ['./dynamic-forms.page.scss'],
  standalone: false
})
export class DynamicFormsPage implements OnInit {
  
  // --- BASE INFORMATION ---
  selectedCategory: string = 'Criminal Activity';
  reportType: string = '';
  companyId: number = 0;
  loadSavedTemplate: boolean = false;

  // --- DYNAMIC MAPPING ---
  categoryOptions = ['Criminal Activity', 'Events & Monitoring'];
  reportTypeOptions: string[] = [];
  
  categoryToTypeMap: { [key: string]: string[] } = {
    'Criminal Activity': [
      'Illegal Felling', 'Illegal Timber Transport', 'Illegal Timber Storage', 
      'Wild Animal Poaching', 'Encroachment', 'Illegal Mining'
    ],
    'Events & Monitoring': [
      'JFMC / Social Forestry', 'Wild Animal Sighting', 'Water Source Status', 
      'Fire Alerts', 'Wildlife Compensation'
    ]
  };

  @ViewChild('scrollContent') content!: any;

  // --- PRODUCTION DEFAULTS REGISTRY ---
  speciesOptions: string[] = ['Sal', 'Saja', 'Sagaon', 'Beeja', 'Haldu', 'Dhawda', 'Safed Siris', 'Kala Siris', 'Jamun', 'Aam', 'Semal', 'Mahua', 'Tendu', 'Nilgiri', 'Others'];
  animalSpecies: string[] = ['Sloth Bear', 'Leopard', 'Hyena', 'Jackal', 'Wild Bear', 'Spotted Deer', 'Sambar', 'Others'];

  defaultFormsRegistry: { [key: string]: any[] } = {
    'Illegal Felling': [
      { label: 'Species List', type: 'select', options: [...this.speciesOptions], key: 'species', icon: 'list-outline' },
      { label: 'Quality', type: 'text', placeholder: 'e.g. Grade A, B', key: 'quality', icon: 'shield-checkmark-outline' },
      { label: 'Girth (cm)', type: 'number', placeholder: '0', key: 'girth', icon: 'resize-outline' },
      { label: 'CUM (Volume)', type: 'number', placeholder: '0.00', key: 'volume', icon: 'cube-outline' },
      { label: 'Photo of Stump', type: 'file', key: 'stump_photo', icon: 'camera-outline' },
      { label: 'Reason for Felling', type: 'text', key: 'reason', icon: 'help-circle-outline' },
      { label: 'Remarks', type: 'textarea', key: 'overall_remarks', icon: 'document-text-outline' },
      { label: 'Action Taken', type: 'text', key: 'action_taken', icon: 'checkmark-done-outline' }
    ],
    'Illegal Timber Transport': [
      { label: 'Name of Forest Produce', type: 'text', key: 'produce_name', icon: 'leaf-outline' },
      { label: 'Vehicle Type', type: 'text', key: 'vehicle_type', icon: 'bus-outline' },
      { label: 'Vehicle Number', type: 'text', key: 'vehicle_no', icon: 'card-outline' },
      { label: 'Quantity', type: 'number', key: 'qty_final', icon: 'layers-outline' },
      { label: 'Route Taken', type: 'text', key: 'route', icon: 'trail-sign-outline' },
      { label: 'Name of Accused', type: 'text', key: 'accused_name', icon: 'person-outline' },
      { label: 'Address of Accused', type: 'textarea', key: 'accused_address', icon: 'home-outline' },
      { label: 'Incident Photo', type: 'file', key: 'photo', icon: 'camera-outline' }
    ],
    'Illegal Timber Storage': [
      { label: 'Species', type: 'select', options: [...this.speciesOptions], key: 'species', icon: 'list-outline' },
      { label: 'Quantity', type: 'number', key: 'qty_cmt', icon: 'layers-outline' },
      { label: 'Storage Type', type: 'select', options: ['Godown', 'Open Space', 'Others'], key: 'storage_type', icon: 'business-outline' },
      { label: 'Name of Owner', type: 'text', key: 'owner_name', icon: 'person-outline' },
      { label: 'Storage Photo', type: 'file', key: 'photo', icon: 'camera-outline' }
    ],
    'Wild Animal Poaching': [
      { label: 'Species', type: 'select', options: [...this.animalSpecies], key: 'species', icon: 'paw-outline' },
      { label: 'Cause of Death', type: 'text', key: 'cause_death', icon: 'medkit-outline' },
      { label: 'Carcass State', type: 'text', key: 'carcass_state', icon: 'flash-outline' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], key: 'gender', icon: 'transgender-outline' },
      { label: 'Age Class', type: 'select', options: ['Adult', 'Sub-Adult', 'Juvenile', 'Unknown'], key: 'age_class', icon: 'hourglass-outline' },
      { label: 'Evidence Photo', type: 'file', key: 'photos', icon: 'camera-outline' }
    ],
    'Encroachment': [
      { label: 'Encroachment Type', type: 'select', options: ['Agriculture', 'Construction'], key: 'encroachment_type', icon: 'construct-outline' },
      { label: 'Area (Hectare)', type: 'number', key: 'area_hectare', icon: 'map-outline' },
      { label: 'Machinery Present', type: 'select', options: ['Yes', 'No'], key: 'machinery', icon: 'hardware-chip-outline' },
      { label: 'Occupants/Persons Involved', type: 'text', key: 'occupants', icon: 'people-outline' },
      { label: 'Site Photo', type: 'file', key: 'photo', icon: 'camera-outline' }
    ],
    'Illegal Mining': [
      { label: 'Mineral Type', type: 'text', key: 'mineral_type', icon: 'diamond-outline' },
      { label: 'Estimated Volume (cu mtr)', type: 'number', key: 'volume_cum', icon: 'cube-outline' },
      { label: 'Mining Method', type: 'select', options: ['Manual', 'Mechanized'], key: 'mining_method', icon: 'hammer-outline' },
      { label: 'Action Taken', type: 'text', key: 'action_taken', icon: 'checkmark-done-outline' }
    ],
    'Wild Animal Sighting': [
        { label: 'Species', type: 'select', options: [...this.animalSpecies], key: 'species', icon: 'eye-outline' },
        { label: 'Count', type: 'number', key: 'count', icon: 'calculator-outline' },
        { label: 'Behavior', type: 'text', key: 'behavior', icon: 'accessibility-outline' },
        { label: 'Sighting Photo', type: 'file', key: 'photo', icon: 'camera-outline' }
    ],
    'Fire Alerts': [
        { label: 'Fire Type', type: 'select', options: ['Ground Fire', 'Crown Fire', 'Bush Fire'], key: 'fire_type', icon: 'flame-outline' },
        { label: 'Intensity', type: 'select', options: ['Low', 'Medium', 'High'], key: 'intensity', icon: 'speedometer-outline' },
        { label: 'Estimated Damage Area', type: 'text', key: 'area', icon: 'cube-outline' },
        { label: 'Action Taken', type: 'textarea', key: 'action', icon: 'shield-outline' }
    ]
  };

  // --- UI STATE ---
  isPreviewMode: boolean = false;
  isPaletteOpen: boolean = false;
  swipeCompleted: boolean = false;
  swipeThreshold = 0.8;

  // --- FORM ELEMENTS PALETTE ---
  availableElements = [
    { type: 'text', label: 'Text Input', icon: 'text-outline' },
    { type: 'number', label: 'Number', icon: 'calculator-outline' },
    { type: 'textarea', label: 'Long Text', icon: 'document-text-outline' },
    { type: 'select', label: 'Dropdown', icon: 'list-outline' },
    { type: 'radio', label: 'Radio Buttons', icon: 'radio-button-on-outline' },
    { type: 'checkbox', label: 'Checkboxes', icon: 'checkbox-outline' },
    { type: 'date', label: 'Date Picker', icon: 'calendar-outline' },
    { type: 'file', label: 'Camera / Photo', icon: 'camera-outline' }
  ];

  // --- CANVAS (FORM LAYOUT) ---
  canvasFields: any[] = [];

  constructor(
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private cdr: ChangeDetectorRef,
    private gestureCtrl: GestureController
  ) { }

  ngOnInit() {
    this.companyId = this.dataService.getUserCompanyId() || 0;
    this.onCategoryChange(); 
    
    // Initial Load
    this.loadTemplateFromDB();
  }

  ionViewDidEnter() {
    this.initSwipeGesture();
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    this.canvasFields = ev.detail.complete(this.canvasFields);
  }

  handleOptionReorder(fieldIndex: number, ev: CustomEvent<ItemReorderEventDetail>) {
    const field = this.canvasFields[fieldIndex];
    field.options = ev.detail.complete(field.options);
  }

  onCategoryChange() {
    this.reportTypeOptions = this.categoryToTypeMap[this.selectedCategory] || [];
    this.reportType = this.reportTypeOptions[0] || ''; 
    this.onReportTypeChange();
  }

  onReportTypeChange() {
    if (this.loadSavedTemplate && this.reportType) {
        this.loadTemplateFromDB();
    }
  }

  async loadTemplateFromDB() {
    if (!this.reportType) return;

    const loading = await this.loadingCtrl.create({
      message: 'Loading Layout...', spinner: 'crescent'
    });
    await loading.present();

    const dbCategory = this.selectedCategory === 'Criminal Activity' ? 'crimes' : 'events';

    this.dataService.getFormConfig(dbCategory, this.reportType).subscribe({
      next: (config: any) => {
        loading.dismiss();
        if (config && config.fields && config.fields.length > 0) {
          this.canvasFields = config.fields;
        } else {
          // Pull from Hardcoded Registry if no DB config found
          this.loadRegistryDefaults();
        }
      },
      error: () => {
        loading.dismiss();
        this.loadRegistryDefaults();
      }
    });
  }

  private loadRegistryDefaults() {
    const defaults = this.defaultFormsRegistry[this.reportType];
    this.canvasFields = [];
    
    // Always add system fields
    this.addStaticField('Assigned Beat', 'text', 'beat', true);
    this.addStaticField('GPS Location', 'text', 'gps', true);

    if (defaults) {
        defaults.forEach(f => {
            this.canvasFields.push({ ...f, isExpanded: false });
        });
    }
  }

  // --- BUILDER ACTIONS ---

  private addStaticField(label: string, type: string, key: string, readonly: boolean = false) {
    const exists = this.canvasFields.find(f => f.key === key);
    if (!exists) {
        this.canvasFields.push({
            label, type, key, readonly, required: true,
            icon: key === 'gps' ? 'location-outline' : 'shield-outline',
            isExpanded: false
        });
    }
  }

  addField(element: any) {
    const newField = {
      label: `New ${element.label}`,
      type: element.type,
      key: `field_${Date.now()}`,
      required: false,
      icon: element.icon,
      options: element.type === 'select' || element.type === 'radio' || element.type === 'checkbox' ? ['Option 1', 'Option 2'] : [],
      isExpanded: true 
    };
    
    this.canvasFields.push(newField);
    this.isPaletteOpen = false;
    
    // Scroll to bottom to show the new field instantly
    setTimeout(() => {
        if (this.content) this.content.scrollToBottom(500);
    }, 100);

    this.showToast(`${element.label} added`, 'success');
  }

  toggleExpand(index: number) {
    this.canvasFields[index].isExpanded = !this.canvasFields[index].isExpanded;
  }

  deleteField(index: number) {
    const field = this.canvasFields[index];
    if (field.readonly) return;
    this.canvasFields.splice(index, 1);
  }

  addOption(fieldIndex: number) {
    this.canvasFields[fieldIndex].options.push(`Option ${this.canvasFields[fieldIndex].options.length + 1}`);
  }

  removeOption(fieldIndex: number, optionIndex: number) {
    this.canvasFields[fieldIndex].options.splice(optionIndex, 1);
  }

  // --- SWIPE GESTURE ---

  initSwipeGesture() {
    const track = document.querySelector('.swipe-track') as HTMLElement;
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (!track || !thumb) return;

    const trackWidth = track.clientWidth - thumb.clientWidth - 12;

    const gesture = this.gestureCtrl.create({
      el: thumb,
      threshold: 0,
      gestureName: 'swipe-to-save',
      onMove: ev => {
        if (this.swipeCompleted) return;
        let x = ev.deltaX;
        if (x < 0) x = 0;
        if (x > trackWidth) x = trackWidth;
        thumb.style.transform = `translateX(${x}px)`;
        const progress = x / trackWidth;
        track.style.setProperty('--progress', `${progress}`);
      },
      onEnd: ev => {
        if (this.swipeCompleted) return;
        const x = ev.deltaX;
        if (x >= trackWidth * this.swipeThreshold) {
          this.swipeCompleted = true;
          thumb.style.transform = `translateX(${trackWidth}px)`;
          this.saveConfiguration();
        } else {
          this.resetSwipe();
        }
      }
    });

    gesture.enable(true);
  }

  resetSwipe() {
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (thumb) {
      thumb.style.transition = 'transform 0.3s ease-out';
      thumb.style.transform = 'translateX(0px)';
    }
    const track = document.querySelector('.swipe-track') as HTMLElement;
    if (track) track.style.setProperty('--progress', '0');
    this.swipeCompleted = false;
  }

  // --- SYNC WITH BACKEND ---

  async saveConfiguration() {
    if (!this.reportType) {
      this.showToast("Please select a Report Type!", "danger");
      this.resetSwipe();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Saving Form...',
      spinner: 'dots'
    });
    await loading.present();

    const configPayload = {
      category: this.selectedCategory === 'Criminal Activity' ? 'crimes' : 'events',
      reportType: this.reportType,
      companyId: this.companyId,
      fields: this.canvasFields
    };

    this.dataService.saveFormConfig(configPayload).subscribe({
      next: async () => {
        await loading.dismiss();
        this.showToast("Form Saved Successfully! ✅", "success");
        setTimeout(() => this.resetSwipe(), 1000);
      },
      error: async (err) => {
        await loading.dismiss();
        this.showToast("Failed to save", "danger");
        this.resetSwipe();
      }
    });
  }

  private async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg, duration: 2000, color: color, position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}