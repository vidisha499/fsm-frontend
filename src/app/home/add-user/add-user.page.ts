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
  selectedAssignments: any[] = []; // Stores the list of added assignments for multi-assignment
  checkedEntities: { [key: string]: boolean } = {}; // Tracks checked hierarchy entities for multi-assignment

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

  /** Strips non-numeric characters and enforces 10-digit limit on phone fields */
  onPhoneInput(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').substring(0, 10);
    input.value = cleaned;
    this.userData[field] = cleaned;
  }

  async loadInitialData() {
    const loader = await this.loadingCtrl.create({ message: 'Syncing V2 Hierarchy...' });
    await loader.present();

    try {
      // 0. Load Master Permissions for edit grid
      this.dataService.listMasterPermissions().subscribe({
        next: (res: any) => {
          const raw = res?.data || res || [];
          console.log("%c🔑 [DATABASE] MASTER PERMISSIONS:", "color: #ff00ff; font-weight: bold;");
          console.table(raw.map((m: any) => ({
            module: m.module || m.name,
            actions: Array.isArray(m.actions) ? m.actions.join(', ') : m.actions
          })));
          
          this.allPermissions = raw.map((item: any) => ({
            name: item.module,
            displayName: this.getModuleDisplayName(item.module),
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
              .map((l: any) => {
                let lName = l.name || l.layer_name || l.label;
                if (String(l.id) === '9') lName = 'Section';
                if (String(l.id) === '10') lName = 'Beat';
                return {
                  id: Number(l.id),
                  name: lName
                };
              });

            console.log("🎯 V2 Processed Layers:", this.layers);

            // 3. Load Initial Entities for all layers
            if (this.layers.length > 0) {
              this.layers.forEach(layer => {
                this.dataService.listV2Entities(layer.id, null).subscribe({
                  next: (entRes: any) => {
                    const nodes = entRes?.data || entRes || [];
                    this.layerEntities[layer.id] = Array.isArray(nodes) ? nodes : [];
                    console.log(`🎯 Loaded V2 entities for Layer ${layer.name} (${layer.id}):`, this.layerEntities[layer.id].length);
                    this.cdr.detectChanges();
                  }
                });
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

    // Initialize all to true by default (as per user request)
    this.allPermissions.forEach(mod => {
      this.userPermMap[mod.name] = {};
      mod.actions.forEach((act: any) => {
        this.userPermMap[mod.name][act.action] = true;
      });
    });

    // If we have explicit perms, reset to false first so we only check what's granted
    if (perms.length > 0) {
      this.allPermissions.forEach(mod => {
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
    }

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
    
    // 🛡️ IF Dynamic Role (ID 10) is selected, WAIT until a specific sub-role is picked
    if (this.userData.roleId === '10' && (!this.userData.dynamicRoleId || this.userData.dynamicRoleId === 'null')) {
      return false;
    }

    // Only Super Admin (1) and specialized global roles (7) are truly global.
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
      // Checkbox CHECKED (assign at this level only): clear all selections below
      for (let i = layerIndex + 1; i < this.layers.length; i++) {
        this.hierarchySelections[i] = null;
        this.stopHereFlags[i] = true;
      }
    } else {
      // Checkbox UNCHECKED: load children for the next level
      if (this.hierarchySelections[layerIndex] && layerIndex + 1 < this.layers.length) {
        const nextLayer = this.layers[layerIndex + 1];
        this.dataService.listV2Entities(nextLayer.id, this.hierarchySelections[layerIndex]).subscribe({
          next: (res: any) => {
            const nodes = res?.data || res || [];
            this.layerEntities[nextLayer.id] = Array.isArray(nodes) ? nodes : [];
            this.cdr.detectChanges();
          }
        });
      }
    }
    this.cdr.detectChanges();
  }

  // Check karo ki koi layer show honi chahiye ya nahi
  shouldShowLayer(layerIndex: number): boolean {
    if (layerIndex === 0) return true;
    // Pichla layer select hua ho AND pichle layer ka stopHere false ho
    return !!this.hierarchySelections[layerIndex - 1] && !this.stopHereFlags[layerIndex - 1];
  }

  getDeepestSelectedEntity(): any {
    if (!this.shouldShowHierarchy()) return null;
    
    // Walk from bottom to top, find the deepest layer with a valid selection
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
        const layerId = this.layers[i].id;
        const entId = this.hierarchySelections[i];
        const ent = this.layerEntities[layerId]?.find((e: any) => String(e.id) === String(entId));
        if (ent) {
          return {
            id: entId,
            name: ent.name,
            layerName: this.layers[i].name
          };
        }
      }
    }
    return null;
  }

  addSelectedAssignment() {
    const selected = this.getDeepestSelectedEntity();
    if (!selected) {
      this.showToast('Please select a range or beat first', 'warning');
      return;
    }
    
    // Check duplicate
    const exists = this.selectedAssignments.some(item => String(item.id) === String(selected.id));
    if (exists) {
      this.showToast('This assignment is already added', 'warning');
      return;
    }

    this.selectedAssignments.push(selected);
    this.showToast(`Added: ${selected.name} (${selected.layerName})`, 'success');

    // DON'T fully reset - keep the parent selections so user can quickly add
    // more entities from the same Range. Only clear the deepest selected level.
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
        this.hierarchySelections[i] = null;
        this.stopHereFlags[i] = true;
        break; // only clear the deepest one
      }
    }
    this.cdr.detectChanges();
  }

  removeSelectedAssignment(index: number) {
    this.selectedAssignments.splice(index, 1);
    this.cdr.detectChanges();
  }

  getVisibleEntities(layerIndex: number): any[] {
    if (!this.layers || this.layers.length === 0 || !this.layers[layerIndex]) return [];
    
    // First layer is always fully visible
    if (layerIndex === 0) {
      return this.layerEntities[this.layers[layerIndex].id] || [];
    }

    const parentLayer = this.layers[layerIndex - 1];
    const parentEntities = this.layerEntities[parentLayer.id] || [];

    // Filter parents that are checked
    const checkedParentIds = parentEntities
      .filter((p: any) => this.checkedEntities[String(p.id)] === true)
      .map((p: any) => String(p.id));

    if (checkedParentIds.length === 0) return [];

    const currentLayer = this.layers[layerIndex];
    const entities = this.layerEntities[currentLayer.id] || [];
    return entities.filter((e: any) => checkedParentIds.includes(String(e.parent_id)));
  }

  hasVisibleEntities(layerIndex: number): boolean {
    return this.getVisibleEntities(layerIndex).length > 0;
  }

  toggleEntity(entityId: any, layerIndex: number, event: any) {
    const isChecked = event.target.checked;
    const strId = String(entityId);
    this.checkedEntities[strId] = isChecked;

    if (!isChecked) {
      // Recursively uncheck all child entities
      this.uncheckChildren(strId, layerIndex);
    }
    this.cdr.detectChanges();
  }

  uncheckChildren(parentId: string, parentLayerIndex: number) {
    const nextLayerIndex = parentLayerIndex + 1;
    if (nextLayerIndex >= this.layers.length) return;

    const nextLayer = this.layers[nextLayerIndex];
    const children = this.layerEntities[nextLayer.id]?.filter((e: any) => String(e.parent_id) === parentId) || [];

    children.forEach((child: any) => {
      const childId = String(child.id);
      if (this.checkedEntities[childId]) {
        this.checkedEntities[childId] = false;
        // Recursively uncheck downstream children
        this.uncheckChildren(childId, nextLayerIndex);
      }
    });
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

    // --- DUPLICATE MOBILE CHECK ---
    try {
      const loader = await this.loadingCtrl.create({ message: 'Checking if user exists...' });
      await loader.present();

      const existingUsers: any = await this.dataService.getUsersByCompany(this.userData.companyId).toPromise();
      loader.dismiss();

      const users = existingUsers?.data || existingUsers || [];
      const duplicate = users.find((u: any) => {
        const uMobile = String(u.mobile || u.phone || u.contact || '').trim();
        return uMobile === String(this.userData.contact).trim();
      });

      if (duplicate) {
        const name = duplicate.name || duplicate.firstName || 'Unknown';
        this.showToast(`⚠️ User already exists! (${name} - ${this.userData.contact})`, 'danger');
        return;
      }
    } catch (err) {
      console.warn('⚠️ Could not verify duplicate, proceeding with registration...', err);
    }

    this.isSaving = true;
    
    // -------------------
    // Determine all entity IDs that should be assigned.
    // Priority: selectedAssignments list > current dropdown selection
    // -------------------
    const assignedEntityIds: any[] = [];
    
    // 1. Primary: from the "Add to Assignments" list
    if (this.selectedAssignments.length > 0) {
      this.selectedAssignments.forEach(item => {
        assignedEntityIds.push(item.id);
      });
    }

    // 2. Also include current dropdown selection if not already in list
    const currentSelection = this.getDeepestSelectedEntity();
    if (currentSelection) {
      const alreadyAdded = assignedEntityIds.some(id => String(id) === String(currentSelection.id));
      if (!alreadyAdded) {
        assignedEntityIds.push(currentSelection.id);
      }
    }

    // 3. Fallback to old dropdown selections if both are empty
    if (assignedEntityIds.length === 0) {
      for (let i = 0; i < this.layers.length; i++) {
        if (this.hierarchySelections[i] && this.stopHereFlags[i]) {
          assignedEntityIds.push(this.hierarchySelections[i]);
        }
      }
      if (assignedEntityIds.length === 0) {
        const deepest = this.getDeepestSelectedEntity();
        if (deepest) {
          assignedEntityIds.push(deepest.id);
        }
      }
    }

    // The deepest entity (used for user profile) is the last selected one.
    let deepestEntityId: any = null;
    let deepestEntityName: string = '';
    let parentEntityName: string = '';
    if (assignedEntityIds.length > 0) {
      deepestEntityId = assignedEntityIds[assignedEntityIds.length - 1];
      
      // Attempt to find layer id and entity details
      let foundEnt: any = null;
      for (let layer of this.layers) {
        foundEnt = this.layerEntities[layer.id]?.find(e => String(e.id) === String(deepestEntityId));
        if (foundEnt) {
          deepestEntityName = foundEnt.name || '';
          break;
        }
      }

      // Fallback parent names
      if (assignedEntityIds.length > 1) {
        const parentId = assignedEntityIds[assignedEntityIds.length - 2];
        let foundParent: any = null;
        for (let layer of this.layers) {
          foundParent = this.layerEntities[layer.id]?.find(e => String(e.id) === String(parentId));
          if (foundParent) {
            parentEntityName = foundParent.name || '';
            break;
          }
        }
      } else {
        parentEntityName = deepestEntityName;
      }
    }
    // ------------------- End of entity ID gathering -------------------

    // Build payload for user registration
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
          
          // -------------------
          // MULTI‑ASSIGNMENT: iterate over all assignedEntityIds and link each.
          // -------------------
          if (newUserId && assignedEntityIds.length > 0) {
            assignedEntityIds.forEach(assignedId => {
              const assignmentPayload = {
                user_id: newUserId,
                role_id: payload.role_id,
                custom_role_id: payload.custom_role_id,
                entity_id: assignedId,
                company_id: payload.company_id,
                permissions: payload.permissions,
                role_name: dynamicRoleName
              };
              this.dataService.saveV2Assignment(assignmentPayload).subscribe({
                next: (assignRes: any) => console.log('🔗 [ADD-USER] V2 Assignment Linked (multi):', assignRes),
                error: (assignErr: any) => console.error('❌ [ADD-USER] V2 Assignment Failed (multi):', assignErr)
              });
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

  getModuleDisplayName(mod: string): string {
    const map: any = {
      'patrol': 'Patrolling',
      'attendance': 'Attendance',
      'patrol_report': 'Forest Events',
      'attendance_request': 'Attendance',
      'asset_management': 'Assets',
      'forest_events': 'Forest Events',
      'forest_reports': 'Forest Events',
      'forest_report': 'Forest Events',
      'forestreport': 'Forest Events',
      'forestreports': 'Forest Events',
      'forest reports': 'Forest Events',
      'forest report': 'Forest Events',
      'incidence': 'Forest Events',
      'know_your_area': 'Know Your Area',
      'plantations': 'Plantation',
      'chat': 'Chat',
      'daily_updates': 'Daily Updates',
      'client_visits': 'Visits'
    };
    return map[mod.toLowerCase()] || mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, ' ');
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
