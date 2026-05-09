import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.page.html',
  styleUrls: ['./add-user.page.scss'],
  standalone: false
})
export class AddUserPage implements OnInit {
  userData: any = {
    firstName: '',
    lastName: '',
    contact: '',
    email: '',
    roleCategory: 'static',
    roleId: null,
    range: null,
    beat: null,
    companyId: null
  };

  roles: any[] = [];
  staticRoles: any[] = [
    { id: 1, name: 'Super Admin' },
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Guard / Ranger' },
    { id: 4, name: 'Supervisor' }
  ];
  dynamicRoles: any[] = [];
  
  // Dynamic Hierarchy State
  layers: any[] = [];
  hierarchySelections: any[] = []; // Stores selected entity for each layer
  layerEntities: { [key: number]: any[] } = {}; // Stores entities for each layer_id
  
  ranges: any[] = [];
  allBeats: any[] = [];
  filteredBeats: any[] = [];
  isSaving: boolean = false;
  showBeatSuggestions: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.userData.companyId = localStorage.getItem('company_id');
    await this.loadInitialData();
  }

  async loadInitialData() {
    const loader = await this.loadingCtrl.create({ message: 'Loading Roles & Hierarchy...' });
    await loader.present();

    try {
      // 1. Fetch official roles from Sir's new API
      this.dataService.getRoleIdList().subscribe({
        next: (res: any) => {
          const allRoles = res?.data || [];
          
          // Categorize them as per your requirement
          this.staticRoles = allRoles.filter((r: any) => [1, 2, 3, 7].includes(Number(r.id)));
          this.dynamicRoles = allRoles.filter((r: any) => ![1, 2, 3, 7].includes(Number(r.id)));
          
          // Map names to match your UI (e.g., role_name -> name)
          this.staticRoles.forEach(r => r.name = r.role_name);
          this.dynamicRoles.forEach(r => r.name = r.role_name);
        }
      });

      // 2. Load Dynamic Org Layers
      this.dataService.listOrgLayers().subscribe({
        next: (res: any) => {
          this.layers = res?.data || [];
          console.log("📂 Dynamic Layers Loaded:", this.layers);
          
          // --- 🔥 PURANA DATA LOAD KARNE KA LOGIC (FALLBACK) ---
          if (this.layers.length > 0) {
            this.loadEntitiesForLayer(this.layers[0].id);
            
            // Check if Layer 1 (Ranges) is empty after loading
            setTimeout(() => {
              if (!this.layerEntities[this.layers[0].id] || this.layerEntities[this.layers[0].id].length === 0) {
                console.log("⚠️ New system is empty. Loading OLD hierarchy data...");
                this.loadOldHierarchy();
              }
            }, 1000);
          }
          loader.dismiss();
        },
        error: () => {
          console.log("❌ Dynamic layers failed, falling back to OLD hierarchy...");
          this.loadOldHierarchy();
          loader.dismiss();
        }
      });
    } catch (e) {
      loader.dismiss();
    }
  }

  loadOldHierarchy() {
    const companyId = localStorage.getItem('company_id') || '1';
    const apiToken = localStorage.getItem('api_token') || '';
    
    console.log("📡 Fetching fallback hierarchy from getSites for Company:", companyId);
    
    this.dataService.getSites({ api_token: apiToken, company_id: companyId }).subscribe({
      next: (res: any) => {
        const sites = res?.data || res || [];
        if (Array.isArray(sites)) {
          const rangeSet = new Set<string>();
          const beatArray: any[] = [];
          
          sites.forEach((s: any) => {
            const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
            const bName = s.name || s.beat_name || s.beat || s.site_name || s.site;
            if (rName) rangeSet.add(rName);
            if (bName) beatArray.push({ id: s.id || bName, name: bName, parentName: rName });
          });

          if (this.layers.length > 0) {
            const firstLayerId = this.layers[0].id;
            const secondLayerId = this.layers.length > 1 ? this.layers[1].id : null;

            // Map unique ranges
            this.layerEntities[firstLayerId] = Array.from(rangeSet).map(r => ({ id: r, name: r, parent_id: null }));

            // Map beats (these will be filtered when a range is selected)
            if (secondLayerId) {
              this.allOldBeats = beatArray; // Store for filtering
              // Initially empty, populated onRangeChange equivalent
              this.layerEntities[secondLayerId] = []; 
            }
            
            console.log(`✅ [FALLBACK SUCCESS] Loaded ${rangeSet.size} Ranges from Sites.`);
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => console.error("❌ Fallback getSites failed:", err)
    });
  }

  // Add this property to the class
  allOldBeats: any[] = [];

  loadEntitiesForLayer(layerId: number, parentId: any = null) {
    console.log(`🔍 Loading entities for Layer ID: ${layerId}, Parent ID: ${parentId}`);
    this.dataService.listOrgEntities(layerId).subscribe({
      next: (res: any) => {
        const allEntities = res?.data || [];
        console.log(`📦 Received ${allEntities.length} entities for Layer ${layerId}:`, allEntities);
        
        // Filter by parent if provided
        if (parentId) {
          this.layerEntities[layerId] = allEntities.filter((e: any) => String(e.parent_id) === String(parentId));
          console.log(`🎯 Filtered to ${this.layerEntities[layerId].length} entities for Parent ${parentId}`);
        } else {
          this.layerEntities[layerId] = allEntities;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`❌ Error loading entities for Layer ${layerId}:`, err);
      }
    });
  }

  onLayerChange(layerIndex: number) {
    const selectedEntityId = this.hierarchySelections[layerIndex];
    console.log(`🔄 Selection changed for Layer ${layerIndex}. Selected ID: ${selectedEntityId}`);
    
    // Clear subsequent selections
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // Load next layer entities
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      
      // 🔥 FALLBACK CHECK: If we have old beats and no dynamic ones yet
      if (this.allOldBeats.length > 0 && this.layerEntities[this.layers[0].id].some(e => typeof e.id === 'string')) {
        console.log(`🎯 Filtering OLD beats for Parent: ${selectedEntityId}`);
        this.layerEntities[nextLayer.id] = this.allOldBeats
          .filter(b => b.parentName === selectedEntityId)
          .map(b => ({ id: b.id, name: b.name }));
        this.cdr.detectChanges();
      } else {
        // Normal dynamic loading
        this.loadEntitiesForLayer(nextLayer.id, selectedEntityId);
      }
    }
  }

  shouldShowHierarchy(): boolean {
    if (!this.userData.roleId || this.userData.roleId === 'null') return false;
    
    // IDs 1 (Super Admin) and 7 (Admin) are global. Others need hierarchy.
    const globalRoles = [1, 2, 7]; // Added 2 as well for consistency
    return !globalRoles.includes(Number(this.userData.roleId));
  }

  getStandardRoles() {
    return [
      { id: 1, name: 'Super Admin', needs_hierarchy: false },
      { id: 2, name: 'Admin', needs_hierarchy: false },
      { id: 3, name: 'Guard / Ranger', needs_hierarchy: true },
      { id: 4, name: 'Supervisor', needs_hierarchy: true }
    ];
  }

  onRangeChange() {
    this.userData.beat = null;
    if (!this.userData.range || this.userData.range === 'all') {
      this.filteredBeats = [];
    } else {
      this.filteredBeats = this.allBeats.filter(b => b.parentName === this.userData.range);
    }
  }

  selectBeat(name: string) {
    this.userData.beat = name;
    this.showBeatSuggestions = false;
  }

  hideSuggestionsWithDelay() {
    setTimeout(() => {
      this.showBeatSuggestions = false;
    }, 200);
  }

  async saveUser() {
    if (!this.userData.firstName || !this.userData.contact || !this.userData.roleId) {
      this.showToast('Please fill required fields (Name, Contact, Role)', 'warning');
      return;
    }

    if (this.userData.contact.length !== 10) {
      this.showToast('Invalid Mobile Number', 'danger');
      return;
    }

    this.isSaving = true;
    const token = localStorage.getItem('api_token') || '';

    // Extract dynamic hierarchy values
    let deepestEntityId: any = null;
    let deepestEntityName: string = '';
    let parentEntityName: string = '';

    const showH = this.shouldShowHierarchy();
    if (showH) {
      // Find the deepest non-null selection
      for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
        if (this.hierarchySelections[i]) {
          deepestEntityId = this.hierarchySelections[i];
          const layerId = this.layers[i].id;
          const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(deepestEntityId));
          deepestEntityName = ent?.name || '';
          
          // Get parent name if available (for range/department fallback)
          if (i > 0 && this.hierarchySelections[i-1]) {
            const pLayerId = this.layers[i-1].id;
            const pEnt = this.layerEntities[pLayerId]?.find(e => String(e.id) === String(this.hierarchySelections[i-1]));
            parentEntityName = pEnt?.name || '';
          } else if (i === 0) {
             parentEntityName = deepestEntityName;
          }
          break;
        }
      }
    }

    const payload = {
      api_token: token,
      firstName: this.userData.firstName,
      lastName: this.userData.lastName,
      name: `${this.userData.firstName} ${this.userData.lastName}`.trim(),
      contact: this.userData.contact,
      mobile: this.userData.contact,
      phoneNo: this.userData.contact,
      email: this.userData.email || (this.userData.contact + '@fsm.com'),
      password: '123456',
      role_id: String(this.userData.roleId),
      company_id: String(this.userData.companyId),
      status: '1',
      
      // Dynamic Hierarchy Mappings
      entity_id: deepestEntityId,
      site_id: deepestEntityId,
      beat_id: deepestEntityId,
      
      // Legacy Fallbacks
      department: parentEntityName,
      range: parentEntityName,
      division: parentEntityName,
      designation: deepestEntityName,
      beat: deepestEntityName,
      site_name: deepestEntityName,
      
      registrationFlag: 0,
      showUser: 1
    };

    console.log("🚀 Pre-registering User with Dynamic Hierarchy:", payload);

    this.dataService.addRegistration(payload).subscribe({
      next: async (res: any) => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: 'User Pre-registered & Approved Successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Error in Pre-registration. Please try again.', 'danger');
      }
    });

  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
