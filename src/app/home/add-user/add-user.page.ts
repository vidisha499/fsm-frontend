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

  // Permissions State
  rolePermissions: string[] = [];       // Flat list e.g. ["patrol.view", "report.create"]
  allPermissions: any[] = [];           // Master list from API [{name, actions}]
  userPermMap: any = {};                // { module: { action: boolean } }
  showPermEdit: boolean = false;        // Toggle edit mode

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
    const loader = await this.loadingCtrl.create({ message: 'Syncing V2 Hierarchy...' });
    await loader.present();

    try {
      // 0. Load Master Permissions for edit grid
      this.dataService.listMasterPermissions().subscribe({
        next: (res: any) => {
          const raw = res?.data || res || [];
          this.allPermissions = raw.map((item: any) => ({
            name: item.module,
            actions: (item.actions || []).map((act: any) => ({
              action: typeof act === 'string' ? act : (act.action || act.name || 'Unknown')
            }))
          }));
        }
      });

      // 1. Load Roles - merge old + V2
      this.dataService.getRoleIdList().subscribe({
        next: (res: any) => {
          console.log("🎭 [ADD-USER] Role List Response:", res);
          const oldRoles = res?.data || res || [];
          
          const processedOld = oldRoles.map((r: any) => ({
            ...r,
            id: String(r.id || r.role_id),
            displayName: r.name || r.role_name || r.title || `Role ${r.id}`
          }));

          this.staticRoles = processedOld.filter((r: any) => [1, 2, 3, 4, 7].includes(Number(r.id)));
          this.dynamicRoles = processedOld.filter((r: any) => ![1, 2, 3, 4, 7].includes(Number(r.id)));

          // Also load V2 custom roles and merge (passing companyId for filtering)
          this.dataService.listV2Roles(this.userData.companyId).subscribe({
            next: (v2Res: any) => {
              const v2Roles = v2Res?.data || v2Res || [];
              const processedV2 = v2Roles.map((r: any) => ({
                ...r,
                id: String(r.id),
                displayName: r.name || `Role ${r.id}`
              }));
              // Merge avoiding duplicates by name
              const existingNames = new Set(this.dynamicRoles.map((r: any) => r.displayName));
              const newOnes = processedV2.filter((r: any) => !existingNames.has(r.displayName) && String(r.id) !== '10');
              this.dynamicRoles = [...this.dynamicRoles, ...newOnes].filter(r => String(r.id) !== '10');
              
              // Only add a placeholder ID 10 if it doesn't exist to act as a trigger
              if (!this.staticRoles.find(r => r.id === '10')) {
                this.staticRoles.push({ id: '10', displayName: '-- Dynamic (Custom Role) --' });
              }
              
              console.log("✅ [ADD-USER] Static Roles (with ID 10):", this.staticRoles);
              this.cdr.detectChanges();
            }
          });

          this.cdr.detectChanges();
        }
      });

      // 2. Load V2 Hierarchy Layers
      this.dataService.listV2Layers().subscribe({
        next: (layerRes: any) => {
          const rawLayers = layerRes?.data || layerRes || [];
          
          if (rawLayers.length > 0) {
            this.layers = rawLayers
              .sort((a: any, b: any) => (Number(a.rank || a.id)) - (Number(b.rank || b.id)))
              .map((l: any) => ({
                id: Number(l.id),
                name: l.name || l.layer_name || l.label
              }));

            console.log("🎯 V2 Processed Layers:", this.layers);

            // 3. Load Initial Entities for the first layer
            if (this.layers.length > 0) {
              const firstLayer = this.layers[0];
              this.dataService.listV2Entities(firstLayer.id, null).subscribe({
                next: (entRes: any) => {
                  const nodes = entRes?.data || entRes || [];
                  this.layerEntities[firstLayer.id] = Array.isArray(nodes) ? nodes : [];
                  this.cdr.detectChanges();
                }
              });
            }

            this.stopHereFlags = new Array(this.layers.length).fill(true);
            loader.dismiss();
          } else {
            loader.dismiss();
          }
        },
        error: () => loader.dismiss()
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
    
    // 1. Clear all subsequent selections
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // 2. Load next layer entities from V2 API
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      
      this.dataService.listV2Entities(nextLayer.id, selectedEntityId).subscribe({
        next: (res: any) => {
          const nodes = res?.data || res || [];
          this.layerEntities[nextLayer.id] = Array.isArray(nodes) ? nodes : [];
          console.log(`🎯 V2: Populated ${this.layerEntities[nextLayer.id].length} entities for Level ${nextLayer.id}`);
          this.cdr.detectChanges();
        },
        error: (err) => console.error("❌ [V2] Failed to load entities:", err)
      });
    }
  }

  onRoleSelectChange(event: any) {
    const val = event.target.value;
    this.showPermEdit = false;
    this.rolePermissions = [];
    this.userPermMap = {};

    if (val === '10') {
      this.isDynamicSelected = true;
      this.userData.roleId = '10'; // Explicitly keep 10
      this.userData.dynamicRoleId = null; // Reset sub-role until selected
    } else {
      this.isDynamicSelected = false;
      this.userData.roleId = val;
      this.userData.dynamicRoleId = null;
    }

    // Load permissions for selected role
    if (val && val !== '10') this.loadRolePermissions(val);
    this.cdr.detectChanges();
  }

  onDynamicRoleChange(event: any) {
    const val = event.target.value;
    this.userData.dynamicRoleId = val;
    // DO NOT overwrite userData.roleId, keep it as '10'
    
    this.showPermEdit = false;
    this.rolePermissions = [];
    this.userPermMap = {};

    if (val && val !== 'null') {
      // Find from dynamicRoles to get pre-stored permissions
      const role = this.dynamicRoles.find((r: any) => String(r.id) === String(val));
      if (role?.permissions?.length > 0) {
        this.setPermissions(role.permissions);
      } else {
        this.loadRolePermissions(val);
      }
    }
    this.cdr.detectChanges();
  }

  loadRolePermissions(roleId: any) {
    // Always initialize empty map first so edit grid works
    this.setPermissions([]);

    // Check in-memory roles for existing permissions
    const allRoles = [...this.staticRoles, ...this.dynamicRoles];
    const role = allRoles.find(r => String(r.id) === String(roleId));
    
    if (role?.permissions?.length > 0) {
      this.setPermissions(role.permissions);
      return;
    }

    // Fallback to API
    this.dataService.getRolePermissions(roleId).subscribe({
      next: (res: any) => {
        const perms = res?.data || res || [];
        if (Array.isArray(perms) && perms.length > 0) {
          this.setPermissions(perms);
        }
      },
      error: () => console.warn('Could not load permissions for role', roleId)
    });
  }

  setPermissions(perms: any[]) {
    this.rolePermissions = [];
    this.userPermMap = {};

    // Initialize all to false
    this.allPermissions.forEach(mod => {
      this.userPermMap[mod.name] = {};
      mod.actions.forEach((act: any) => {
        this.userPermMap[mod.name][act.action] = false;
      });
    });

    // Apply given permissions (case-insensitive)
    perms.forEach((p: any) => {
      let modName = (p.module || '').toLowerCase();
      let actName = (p.action || p.name || p || '').toLowerCase();

      if (typeof p === 'string' && p.includes('.')) {
        const parts = p.split('.');
        modName = parts[0].toLowerCase();
        actName = parts[1].toLowerCase();
      }

      // Find matching key in userPermMap (case-insensitive)
      const mapKey = Object.keys(this.userPermMap).find(k => k.toLowerCase() === modName);
      if (mapKey) {
        const actKey = Object.keys(this.userPermMap[mapKey]).find(k => k.toLowerCase() === actName);
        if (actKey) this.userPermMap[mapKey][actKey] = true;
      }
    });

    this.buildPermissionsArray();
    this.cdr.detectChanges();
  }

  togglePerm(modName: string, actName: string, event: any) {
    if (!this.userPermMap[modName]) {
      this.userPermMap[modName] = {};
    }
    this.userPermMap[modName][actName] = event.target.checked;
    this.buildPermissionsArray();
    this.cdr.detectChanges();
  }

  onPermToggle() {
    this.buildPermissionsArray();
  }

  buildPermissionsArray() {
    this.rolePermissions = [];
    Object.keys(this.userPermMap).forEach(mod => {
      Object.keys(this.userPermMap[mod]).forEach(act => {
        if (this.userPermMap[mod][act]) {
          this.rolePermissions.push(`${mod}.${act}`);
        }
      });
    });
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

    const resolvedCustomRoleId = this.userData.dynamicRoleId || this.userData.roleId;

    // Find the actual name of the dynamic role to send as designation
    let dynamicRoleName = deepestEntityName || 'Officer';
    if (this.userData.dynamicRoleId) {
      const selectedRole = this.dynamicRoles.find(r => String(r.id) === String(this.userData.dynamicRoleId));
      if (selectedRole) dynamicRoleName = selectedRole.displayName;
    }

    const payload: any = {
      name: `${this.userData.firstName} ${this.userData.lastName}`.trim(),
      firstName: this.userData.firstName,
      lastName: this.userData.lastName,
      mobile: this.userData.contact,
      email: this.userData.email || (this.userData.contact + '@fsm.com'),
      password: '123456',
      role_id: String(this.userData.roleId),
      company_id: String(this.userData.companyId),
      company_name: localStorage.getItem('company_name') || '',
      entity_id: deepestEntityId,
      site_id: deepestEntityId,
      siteId: deepestEntityId, 
      site_name: deepestEntityName || 'Officer',
      attendance_type: 'multiple',
      custom_role_id: String(this.userData.dynamicRoleId || this.userData.roleId),
      dynamic_role_id: String(this.userData.dynamicRoleId || this.userData.roleId), 
      designation: dynamicRoleName,
      emp_id: `FSM-${Date.now().toString().slice(-6)}`,
      permissions: JSON.stringify(this.rolePermissions) 
    };

    console.log("🚀 V2 Registering User (addRegistration):", payload);

    // Revert to Stringify since the DB column expects a string
    const finalPayload = { ...payload, permissions: JSON.stringify(this.rolePermissions) };

    this.dataService.addRegistration(finalPayload).subscribe({
      next: async (res: any) => {
        this.isSaving = false;
        console.log("📥 [V2 REGISTER RESPONSE]:", res);

        const isSuccess = res?.status?.toLowerCase() === 'success' ||
                          res?.message?.toLowerCase().includes('success') ||
                          res?.code === 200;

        if (isSuccess) {
          const newUserId = res?.data?.id || res?.id;
          
          // 🚀 V2 SYNC: Link to Hierarchy and Role immediately
          if (newUserId) {
            const assignmentPayload = {
              user_id: newUserId,
              role_id: payload.role_id,
              custom_role_id: payload.custom_role_id,
              entity_id: payload.entity_id,
              company_id: payload.company_id,
              permissions: payload.permissions,
              role_name: payload.designation
            };

            this.dataService.saveV2Assignment(assignmentPayload).subscribe({
              next: (assignRes: any) => console.log("🔗 [ADD-USER] V2 Assignment Linked:", assignRes),
              error: (assignErr: any) => console.error("❌ [ADD-USER] V2 Assignment Failed:", assignErr)
            });
          }

          this.showToast('User registered successfully!', 'success');
          this.navCtrl.back();
          return;
        }

        if (!isSuccess) {
          this.showToast('Registration failed: ' + (res?.message || 'Unknown error'), 'danger');
          return;
        }

        // Extract new user ID
        const newUserId = res?.data?.id || res?.user?.id || res?.id ||
                          res?.add_employee_data?.id ||
                          (res?.data && res?.data[0]?.id) || null;

        console.log("✅ User Registered. ID:", newUserId);

        // Save assignment for hierarchy + role
        if (newUserId && deepestEntityId) {
          this.dataService.saveV2Assignment({
            assigned_user_id: Number(newUserId),
            entity_id: Number(deepestEntityId),
            custom_role_id: Number(resolvedCustomRoleId)
          }).subscribe({
            next: (r: any) => console.log(`✅ [ASSIGN] Done:`, r),
            error: (e: any) => console.warn(`⚠️ [ASSIGN] Failed:`, e)
          });
        }

        const toast = await this.toastCtrl.create({
          message: '✅ User Registered & Assigned Successfully!',
          duration: 2500, color: 'success', position: 'top'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: (err) => {
        this.isSaving = false;
        console.error("❌ [BACKEND ERROR] Registration Failed:", err);
        
        // Detailed log for Sir
        if (err.error && typeof err.error === 'object') {
          console.log('--- SERVER ERROR DETAILS (FOR BACKEND TEAM) ---');
          console.log('Message:', err.error.message);
          console.log('Exception:', err.error.exception);
          console.log('File:', err.error.file);
          console.log('Line:', err.error.line);
          console.log('-----------------------------------------------');
        }

        const msg = err.error?.message || 'Registration failed. Check fields.';
        this.showToast('Server Error: ' + msg, 'danger');
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
