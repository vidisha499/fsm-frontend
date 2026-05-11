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
    dynamicRoleId: null,
    range: null,
    beat: null,
    companyId: null
  };
 
  isDynamicSelected: boolean = false;

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
  stopHereFlags: boolean[] = []; // Per-layer "assign at this level" checkbox state

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
      this.dataService.getRoleIdList().subscribe({
        next: (res: any) => {
          const allRoles = res?.data || [];
          console.log("🎭 Roles Loaded:", allRoles);
          
          // Categorize them
          this.staticRoles = allRoles.filter((r: any) => [1, 2, 3, 4, 7].includes(Number(r.id)));
          this.dynamicRoles = allRoles.filter((r: any) => ![1, 2, 3, 4, 7].includes(Number(r.id)));
          
          this.staticRoles.forEach(r => r.name = r.role_name || r.name);
          this.dynamicRoles.forEach(r => r.name = r.role_name || r.name);
          this.cdr.detectChanges();
        },
        error: (err) => console.error("❌ Error loading Roles:", err)
      });

      // 2. Load Hierarchy Nodes from Org Management (Official Source)
      this.dataService.listOrgEntities('').subscribe({
        next: (res: any) => {
          const nodes = res?.data || res || [];
          console.log("📂 Org Entities Loaded for Dropdowns:", nodes);
          
          if (nodes.length > 0) {
            // Group nodes by Layer ID to simulate layers
            const layerMap = new Map<number, string>();
            nodes.forEach((n: any) => {
              if (n.layer_id && !layerMap.has(Number(n.layer_id))) {
                // Map layer names (Fallback if layer name not in node)
                const names: any = { 
                  1: 'Circle', 2: 'Division', 3: 'Range', 4: 'Beat', 5: 'Section',
                  6: 'Circle', 7: 'Division', 8: 'Range', 9: 'Section', 10: 'Beat'
                };
                const lId = Number(n.layer_id);
                layerMap.set(lId, n.layer_name || names[lId] || `Level ${lId}`);
              }
            });

            this.layers = Array.from(layerMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([id, name]) => ({ id, name }));

            // Map entities by layer
            this.layers.forEach(layer => {
              this.layerEntities[layer.id] = nodes.filter((n: any) => Number(n.layer_id) === layer.id);
            });

            console.log("🎯 Dynamic Layers Prepared:", this.layers);
            // Initialize stopHereFlags as all true (CHECKED BY DEFAULT)
            this.stopHereFlags = new Array(this.layers.length).fill(true);
          } else {
            console.log("⚠️ No entities found. Loading fallback sites...");
            this.loadOldHierarchy();
          }
          loader.dismiss();
        },
        error: () => {
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

  loadEntitiesForLayer(layerId: any, parentId: any = null) {
    console.log(`🔍 Loading V2 entities for Layer ID: ${layerId}, Parent ID: ${parentId}`);
    this.dataService.listV2Entities(layerId, parentId).subscribe({
      next: (res: any) => {
        this.layerEntities[layerId] = res?.data || [];
        console.log(`📦 Received ${this.layerEntities[layerId].length} V2 entities for Layer ${layerId}:`, this.layerEntities[layerId]);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`❌ Error loading V2 entities for Layer ${layerId}:`, err);
      }
    });
  }

  onLayerChange(layerIndex: number) {
    const selectedEntityId = this.hierarchySelections[layerIndex];
    console.log(`🔄 Selection change at Index ${layerIndex}. Selected ID: ${selectedEntityId}`);
    
    // 1. Clear all subsequent selections
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // 2. Load next layer entities from the MASTER hierarchy list (Official Source)
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      console.log(`🎯 Filtering Level ${nextLayer.id} for Parent: ${selectedEntityId}`);
      
      this.dataService.listOrgEntities('').subscribe((res: any) => {
        const allNodes = res?.data || res || [];
        // Filter: same layer ID AND parent ID matches selected ID
        this.layerEntities[nextLayer.id] = allNodes.filter((n: any) => 
          Number(n.layer_id) === Number(nextLayer.id) && Number(n.parent_id) === Number(selectedEntityId)
        );
        this.cdr.detectChanges();
      });
    }
  }

  onRoleSelectChange(event: any) {
    const val = event.target.value;
    if (val === 'dynamic_selection') {
      this.isDynamicSelected = true;
      this.userData.roleId = null; // Wait for secondary selection
    } else {
      this.isDynamicSelected = false;
      this.userData.dynamicRoleId = null;
    }
    this.cdr.detectChanges();
  }

  shouldShowHierarchy(): boolean {
    if (!this.userData.roleId || this.userData.roleId === 'null') return false;
    const globalRoles = [1, 2, 7];
    return !globalRoles.includes(Number(this.userData.roleId));
  }

  // Role ID 3 (Employee/Guard) ko sirf Beat (last level) dikhao
  isEmployeeRole(): boolean {
    return Number(this.userData.roleId) === 3;
  }

  // Saare levels hamesha dikhao (Range→Section→Beat cascade ke liye zaroori hai)
  // Fark sirf ASSIGNMENT mein hoga, display mein nahi
  getVisibleLayers(): any[] {
    return this.layers || [];
  }

  // Jab "Assign at this level" checkbox change ho
  onStopHereChange(layerIndex: number) {
    if (this.stopHereFlags[layerIndex]) {
      // Checkbox ticked: clear all selections below this level
      for (let i = layerIndex + 1; i < this.layers.length; i++) {
        this.hierarchySelections[i] = null;
        this.layerEntities[this.layers[i].id] = [];
        this.stopHereFlags[i] = true; // Reset to default true
      }
    } else {
      // Checkbox UN-TICKED: Trigger loading of the next level
      this.onLayerChange(layerIndex);
    }
    this.cdr.detectChanges();
  }

  // Check karo ki koi layer show honi chahiye ya nahi
  shouldShowLayer(layerIndex: number): boolean {
    if (layerIndex === 0) return true;
    // Pichla layer select hua ho AND pichle layer ka stopHere false ho
    return !!this.hierarchySelections[layerIndex - 1] && !this.stopHereFlags[layerIndex - 1];
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

    const isFallbackId = this.allOldBeats.some(b => String(b.id) === String(deepestEntityId));

    const payload: any = {
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

    if (isFallbackId) {
      console.log("⚠️ Fallback Beat detected. Sending as site_id only.");
    } else {
      payload.entity_id = deepestEntityId;
    }

    console.log("🚀 Pre-registering User:", payload);

    this.dataService.addRegistration(payload).subscribe({
      next: async (res: any) => {
        this.isSaving = false;

        // Get the newly created user's ID from response
        const newUserId = res?.data?.id || res?.user?.id || res?.id || null;
        console.log("✅ User Registered. ID:", newUserId);

        if (newUserId && this.shouldShowHierarchy()) {
          const allSelections = this.hierarchySelections.filter(s => s !== null && s !== undefined);

          // Hamesha sirf SABSE LAST (deepest) selection assign karo
          // Parent selections (Range, Section) sirf filtering ke liye hain
          // Example: Range → Section select kiya → sirf Section assign hogi
          //          Range → Section → Beat select kiya → sirf Beat assign hogi
          const deepestSelection = allSelections.length > 0 
            ? allSelections[allSelections.length - 1] 
            : null;

          if (deepestSelection) {
            const layerIndex = allSelections.length - 1;
            const layerName = this.layers[layerIndex]?.name || 'Entity';
            console.log(`🔗 Assigning user to deepest node [${layerName}]: ${deepestSelection}`);

            this.dataService.assignUserToNode({
              user_id: newUserId,
              entity_id: deepestSelection
            }).subscribe({
              next: (r: any) => console.log(`✅ Assigned to ${layerName} (${deepestSelection}):`, r),
              error: (e: any) => console.warn(`⚠️ Assignment failed:`, e)
            });
          }
        }

        const toast = await this.toastCtrl.create({
          message: 'User Registered & Assigned Successfully!',
          duration: 2500,
          color: 'success',
          position: 'top'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Error in Registration. Please try again.', 'danger');
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
