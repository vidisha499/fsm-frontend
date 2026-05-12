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
    const loader = await this.loadingCtrl.create({ message: 'Syncing Hierarchy...' });
    await loader.present();

    const companyId = localStorage.getItem('company_id');

    try {
      // 1. Load Roles
      this.dataService.getRoleIdList().subscribe({
        next: (res: any) => {
          const allRoles = res?.data || [];
          this.staticRoles = allRoles.filter((r: any) => [1, 2, 3, 4, 7].includes(Number(r.id)));
          this.dynamicRoles = allRoles.filter((r: any) => ![1, 2, 3, 4, 7].includes(Number(r.id)));
          this.staticRoles.forEach(r => r.name = r.role_name || r.name);
          this.dynamicRoles.forEach(r => r.name = r.role_name || r.name);
          this.cdr.detectChanges();
        }
      });

      // 2. Load ACTUAL Layers from Org Management
      this.dataService.listOrgLayers(companyId).subscribe({
        next: (layerRes: any) => {
          const rawLayers = layerRes?.data || [];
          console.log("📏 Actual Org Layers:", rawLayers);
          
          if (rawLayers.length > 0) {
            if (companyId === '64') {
              // 🔥 SPECIAL FORCE: For Company 64, we know the hierarchy is 8 (Range) -> 9 (Section) -> 10 (Beat)
              // We ignore their broken ranks (Beat has rank 1, which is wrong)
              const forcedIds = [8, 9, 10];
              this.layers = forcedIds.map(id => {
                const l = rawLayers.find((rl: any) => Number(rl.id) === id);
                let name = l?.name || l?.layer_name || (id === 9 ? 'Section' : id === 10 ? 'Beat' : 'Layer');
                if (id === 9) name = 'Section';
                if (id === 10) name = 'Beat';
                return { id: id, name: name };
              }).filter(l => !!l);
            } else {
              // Standard Logic for other companies
              this.layers = rawLayers
                .sort((a: any, b: any) => (Number(a.rank || 0)) - (Number(b.rank || 0)))
                .filter((l: any) => Number(l.rank || 0) >= 3)
                .map((l: any) => ({
                  id: Number(l.id),
                  name: l.name || l.layer_name
                }));
            }

            console.log("🎯 Processed & Sorted Layers:", this.layers);

            // 3. Load ALL Entities for these layers
            this.dataService.listOrgEntities('all', companyId).subscribe({
              next: (entRes: any) => {
                const nodes = entRes?.data || entRes || [];
                console.log("📦 All Entities for Dropdowns:", nodes);

                this.layers.forEach(layer => {
                  this.layerEntities[layer.id] = nodes.filter((n: any) => Number(n.layer_id) === layer.id);
                });

                // Initialize flags
                this.stopHereFlags = new Array(this.layers.length).fill(true);
                this.cdr.detectChanges();
                loader.dismiss();
              },
              error: () => {
                this.loadOldHierarchy();
                loader.dismiss();
              }
            });
          } else {
            this.loadOldHierarchy();
            loader.dismiss();
          }
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

    // 2. Load next layer entities from LOCAL CACHE (Faster)
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      
      // Get all entities again from the master list (cached or re-fetched if needed)
      this.dataService.listOrgEntities('all').subscribe((res: any) => {
        const allNodes = res?.data || res || [];
        this.layerEntities[nextLayer.id] = allNodes.filter((n: any) => 
          Number(n.layer_id) === Number(nextLayer.id) && Number(n.parent_id) === Number(selectedEntityId)
        );
        console.log(`🎯 Populated ${this.layerEntities[nextLayer.id].length} entities for Level ${nextLayer.id}`);
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
      this.userData.roleId = val;
    }
    this.cdr.detectChanges();
  }

  shouldShowHierarchy(): boolean {
    if (!this.userData.roleId || this.userData.roleId === 'null') return false;
    // Only Super Admin (1) and specialized global roles (7) are truly global.
    // Admin/Supervisor (2) should be assignable to specific nodes.
    const globalRoles = [1, 7];
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
      company_name: localStorage.getItem('company_name') || 'Forest Department',
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
        const newUserId = res?.data?.id || res?.user?.id || res?.id || null;
        console.log("✅ User Registered. ID:", newUserId);

        if (newUserId && deepestEntityId) {
          console.log(`🔗 Attempting Assignment: User ${newUserId} -> Entity ${deepestEntityId}`);
          
          // 🚀 SYNC TO DYNAMIC HIERARCHY
          this.dataService.assignUserToNode({
            user_id: Number(newUserId),
            entity_id: Number(deepestEntityId)
          }).subscribe({
            next: (r: any) => console.log(`✅ [SYNC] Assignment Successful:`, r),
            error: (e: any) => console.warn(`⚠️ [SYNC] Assignment Failed:`, e)
          });
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
