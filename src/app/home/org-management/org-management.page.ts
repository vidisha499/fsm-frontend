import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, ToastController, AlertController, LoadingController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-org-management',
  templateUrl: './org-management.page.html',
  styleUrls: ['./org-management.page.scss'],
  standalone: false
})
export class OrgManagementPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  activeSegment: string = 'hierarchy';
  
  // Hierarchy Data
  hierarchyNodes: any[] = [];
  
  // Org Structure Data
  orgLayers: any[] = [];
  orgEntities: any[] = [];
  filteredEntities: any[] = [];
  selectedLayer: any = 'all';
  isLoadingEntities: boolean = false;
  
  // Tree View State
  isTreeView: boolean = true;
  orgTree: any[] = [];

  // Unified Structure Modal (Add/Edit Layer & Entity)
  isStructureModalOpen: boolean = false;
  structureModalMode: 'create' | 'edit' = 'create';
  structureModalType: 'layer' | 'entity' = 'layer';
  
  structureForm: any = {
    id: null,
    layerName: '',
    layerRank: null,
    entityName: '',
    entityCode: '',
    entityLayerId: '',
    entityParentId: '',
    parentLocked: false
  };

  structureFormTouched: any = {
    layerName: false,
    layerRank: false,
    entityName: false,
    entityLayerId: false
  };

  // Bulk Import State
  isBulkModalOpen: boolean = false;
  bulkImportData = {
    layer_id: '',
    parent_id: '',
    rawText: ''
  };

  // Search State
  searchQuery: string = '';
  
  // Roles Data
  customRoles: any[] = [];
  myCompanyId: any = null;
  
  // Permissions Data
  selectedRoleForPerms: any = null;
  allPermissions: any[] = []; // Master list from checkList (v2)
  userPermissions: any = {};  // { module: { action: true/false } }
  isPermissionsLoading: boolean = false;
  
  // Assignments Data
  assignments: any[] = [];
  allAssignments: any[] = [];

  // Role Modal State
  isRoleModalOpen: boolean = false;
  isUpdateMode: boolean = false;
  roleModalData: any = { name: '', rank: 1 };
  roleModalPerms: any = {}; // { module: { action: boolean } }

  constructor(
    private navCtrl: NavController,
    public dataService: DataService,
    private toast: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.myCompanyId = localStorage.getItem('company_id');
    this.loadData();
    this.dataService.permissionsUpdated$.subscribe(() => {
      this.loadData();
    });
  }

  loadData() {
    this.loadHierarchy();
    this.loadOrgLayers();
    this.loadOrgEntities();
    this.loadCustomRoles();
    this.loadAssignments();
    this.loadMasterPermissions();
  }

  onSegmentChange() {
    // Refresh logic if needed
  }

  goBack() {
    this.navCtrl.back();
  }

  // --- HIERARCHY LOGIC ---
  async loadHierarchy() {
    this.dataService.getHierarchies().subscribe({
      next: (res: any) => {
        this.hierarchyNodes = res?.data || res || [];
      },
      error: (err) => {
        console.error('Hierarchy load failed', err);
        this.showToast('Failed to load hierarchy nodes', 'danger');
      }
    });
  }

  async openAddHierarchyNode() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Add Hierarchy Node',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Node Name' },
        { name: 'layer_id', type: 'number', placeholder: 'Layer ID' },
        { name: 'parent_id', type: 'number', placeholder: 'Parent ID (Optional)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            this.createHierarchyNode(data);
          }
        }
      ]
    });
    await alert.present();
  }

  createHierarchyNode(payload: any) {
    this.dataService.createHierarchyNode(payload).subscribe({
      next: () => {
        this.showToast('Node added successfully', 'success');
        this.loadHierarchy();
      },
      error: (err) => this.showToast('Failed to add node', 'danger')
    });
  }

  async editHierarchyNode(node: any) {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update Node',
      inputs: [
        { name: 'name', type: 'text', value: node.name, placeholder: 'Node Name' },
        { name: 'layer_id', type: 'number', value: node.layer_id, placeholder: 'Layer ID' },
        { name: 'parent_id', type: 'number', value: node.parent_id, placeholder: 'Parent ID' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            this.dataService.updateHierarchyNode(node.id, data).subscribe({
              next: () => {
                this.showToast('Node updated', 'success');
                this.loadHierarchy();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteHierarchyNode(id: any) {
    const confirm = await this.alertCtrl.create({
      mode: 'md',
      header: 'Delete Node?',
      message: 'This action cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: () => {
            this.dataService.deleteHierarchyNode(id).subscribe({
              next: () => {
                this.showToast('Node deleted', 'success');
                this.loadHierarchy();
              }
            });
          }
        }
      ]
    });
    await confirm.present();
  }

  // --- ORG STRUCTURE LOGIC ---
  async loadOrgLayers() {
    this.dataService.listV2Layers().subscribe({
      next: (res: any) => {
        const layers = res?.data || res || [];
        this.orgLayers = layers.map((l: any) => {
          let lName = l.name;
          if (String(l.id) === '9') lName = 'Section';
          if (String(l.id) === '10') lName = 'Beat';
          return { ...l, name: lName };
        }).sort((a: any, b: any) => Number(a.rank || a.id) - Number(b.rank || b.id));
      },
      error: (err) => console.error('V2 Layers load failed', err)
    });
  }

  async loadOrgEntities() {
    if (!this.selectedLayer) return;
    
    this.isLoadingEntities = true;
    
    // Always fetch all entities to build a complete tree. Flat list filters local array.
    this.dataService.listV2Entities(null).subscribe({ 
      next: (res: any) => {
        console.log(`📥 [Org V2 Entities] Response:`, res);
        this.orgEntities = res?.data || res || [];
        this.filterEntities(this.selectedLayer);
        this.buildOrgTree();
        this.isLoadingEntities = false;
      },
      error: (err) => {
        console.error('V2 Org entities load failed', err);
        this.isLoadingEntities = false;
      }
    });
  }

  filterEntities(layerId: any) {
    this.selectedLayer = layerId;
    console.log("🎯 Filtering for Layer ID:", layerId);

    let list = [...this.orgEntities];

    if (layerId !== 'all') {
      // Find the layer object to get its name for a smarter match
      const selectedLayerObj = this.orgLayers.find(l => String(l.id) === String(layerId));
      const layerName = selectedLayerObj?.name?.toLowerCase();

      list = list.filter(e => {
        const matchesId = String(e.layer_id) === String(layerId);
        // Fallback: If ID doesn't match, check if the entity's layer name matches the tab name
        const matchesName = layerName && e.layer_name && String(e.layer_name).toLowerCase().includes(layerName);
        return matchesId || matchesName;
      });
    }

    // Apply search query filter if typed
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.name || '').toLowerCase().includes(q) || 
        (e.code || '').toLowerCase().includes(q) ||
        this.getLayerName(e.layer_id).toLowerCase().includes(q)
      );
    }

    this.filteredEntities = list;
    console.log("✅ Filtered Count:", this.filteredEntities.length);
  }

  editOrgLayer(layer: any) {
    this.structureModalMode = 'edit';
    this.structureModalType = 'layer';
    this.structureForm = {
      id: layer.id,
      layerName: layer.name,
      layerRank: layer.rank,
      entityName: '',
      entityCode: '',
      entityLayerId: '',
      entityParentId: '',
      parentLocked: false
    };
    this.resetStructureFormTouched();
    this.isStructureModalOpen = true;
  }

  async deleteOrgLayer(id: any) {
    const confirm = await this.alertCtrl.create({
      header: 'Delete Layer?',
      message: 'This will remove this hierarchy level. Proceed?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: () => {
            this.dataService.deleteV2Layer(id).subscribe({
              next: () => {
                this.showToast('V2 Layer deleted', 'success');
                this.loadOrgLayers();
                this.selectedLayer = 'all';
              }
            });
          }
        }
      ]
    });
    await confirm.present();
  }

  openAddOrgLayer() {
    this.structureModalMode = 'create';
    this.structureModalType = 'layer';
    this.structureForm = {
      id: null,
      layerName: '',
      layerRank: this.orgLayers.length + 1,
      entityName: '',
      entityCode: '',
      entityLayerId: '',
      entityParentId: '',
      parentLocked: false
    };
    this.resetStructureFormTouched();
    this.isStructureModalOpen = true;
  }

  openAddOrgEntity() {
    this.structureModalMode = 'create';
    this.structureModalType = 'entity';
    this.structureForm = {
      id: null,
      layerName: '',
      layerRank: null,
      entityName: '',
      entityCode: '',
      entityLayerId: '',
      entityParentId: '',
      parentLocked: false
    };
    this.resetStructureFormTouched();
    this.isStructureModalOpen = true;
  }

  async deleteOrgEntity(id: any) {
    this.dataService.deleteV2Entity(id).subscribe({
      next: () => {
        this.showToast('V2 Entity deleted', 'success');
        this.loadOrgEntities();
      },
      error: (err) => {
        console.error('V2 Delete failed:', err);
        this.showToast('⚠️ Delete failed', 'danger');
      }
    });
  }

  editOrgEntity(entity: any) {
    this.structureModalMode = 'edit';
    this.structureModalType = 'entity';
    this.structureForm = {
      id: entity.id,
      layerName: '',
      layerRank: null,
      entityName: entity.name,
      entityCode: entity.code || '',
      entityLayerId: entity.layer_id ? String(entity.layer_id) : '',
      entityParentId: entity.parent_id ? String(entity.parent_id) : '',
      parentLocked: false
    };
    this.resetStructureFormTouched();
    this.isStructureModalOpen = true;
  }

  setStructureType(type: 'layer' | 'entity') {
    this.structureModalType = type;
    this.resetStructureFormTouched();
  }

  resetStructureFormTouched() {
    this.structureFormTouched = {
      layerName: false,
      layerRank: false,
      entityName: false,
      entityLayerId: false
    };
  }

  onStructureModalDismiss() {
    this.isStructureModalOpen = false;
    this.resetStructureFormTouched();
  }

  onEntityLayerChange() {
    // Optional additional filtering logic
  }

  // --- INLINE VALIDATION METHODS ---
  isLayerNameInvalid(): boolean {
    return !this.structureForm.layerName || !this.structureForm.layerName.trim();
  }

  isLayerRankInvalid(): boolean {
    const val = this.structureForm.layerRank;
    return val === null || val === undefined || String(val).trim() === '';
  }

  isEntityNameInvalid(): boolean {
    return !this.structureForm.entityName || !this.structureForm.entityName.trim();
  }

  isEntityLayerIdInvalid(): boolean {
    return !this.structureForm.entityLayerId;
  }

  async saveStructure() {
    if (this.structureModalType === 'layer') {
      this.structureFormTouched.layerName = true;
      this.structureFormTouched.layerRank = true;

      if (this.isLayerNameInvalid() || this.isLayerRankInvalid()) {
        this.showToast('Please fill all required Layer fields', 'warning');
        return;
      }

      const loader = await this.loadingCtrl.create({
        message: this.structureModalMode === 'create' ? 'Creating Layer...' : 'Updating Layer...',
        mode: 'md'
      });
      await loader.present();

      const payload: any = {
        name: this.structureForm.layerName,
        rank: Number(this.structureForm.layerRank),
        is_active: 1
      };

      if (this.structureModalMode === 'edit') {
        payload.id = this.structureForm.id;
      }

      const obs = this.structureModalMode === 'edit'
        ? this.dataService.updateV2Layer(payload)
        : this.dataService.storeV2Layer(payload);

      obs.subscribe({
        next: () => {
          loader.dismiss();
          this.showToast(this.structureModalMode === 'edit' ? 'Layer updated successfully!' : 'Layer created successfully!', 'success');
          this.isStructureModalOpen = false;
          this.loadOrgLayers();
        },
        error: (err) => {
          loader.dismiss();
          console.error('Layer save failed', err);
          this.showToast('Failed to save layer', 'danger');
        }
      });

    } else {
      this.structureFormTouched.entityName = true;
      this.structureFormTouched.entityLayerId = true;

      if (this.isEntityNameInvalid() || this.isEntityLayerIdInvalid()) {
        this.showToast('Please fill all required Entity fields', 'warning');
        return;
      }

      const loader = await this.loadingCtrl.create({
        message: this.structureModalMode === 'create' ? 'Creating Entity...' : 'Updating Entity...',
        mode: 'md'
      });
      await loader.present();

      const payload: any = {
        name: this.structureForm.entityName,
        code: this.structureForm.entityCode,
        layer_id: Number(this.structureForm.entityLayerId)
      };

      if (this.structureForm.entityParentId) {
        payload.parent_id = Number(this.structureForm.entityParentId);
      } else {
        payload.parent_id = null;
      }

      if (this.structureModalMode === 'edit') {
        payload.id = this.structureForm.id;
      }

      const obs = this.structureModalMode === 'edit'
        ? this.dataService.updateV2Entity(payload)
        : this.dataService.storeV2Entity(payload);

      obs.subscribe({
        next: () => {
          loader.dismiss();
          this.showToast(this.structureModalMode === 'edit' ? 'Entity updated successfully!' : 'Entity created successfully!', 'success');
          this.isStructureModalOpen = false;
          this.loadOrgEntities();
        },
        error: (err) => {
          loader.dismiss();
          console.error('Entity save failed', err);
          this.showToast('Failed to save entity', 'danger');
        }
      });
    }
  }

  // --- ROLES LOGIC ---
  async loadCustomRoles() {
    this.dataService.getRoleIdList().subscribe({
      next: (oldRes: any) => {
        const oldRoles = oldRes?.data || oldRes || [];
        
        this.dataService.listV2Roles(this.myCompanyId).subscribe({
          next: (v2Res: any) => {
            const v2Roles = v2Res?.data || v2Res || [];
            
            // Merge both lists, ensuring uniqueness by Name
            const combined = [...oldRoles, ...v2Roles];
            const uniqueMap = new Map();
            
            combined.forEach((r: any) => {
              const rId = String(r.id || r.role_id || '');
              const rName = r.name || r.role_name || r.title || `Role ${rId}`;
              const rRank = r.rank || r.sequence || 0;
              
              if (!uniqueMap.has(rName)) {
                let perms = r.permissions || [];
                if (typeof perms === 'string' && perms.length > 0) {
                  try { perms = JSON.parse(perms); } catch (e) { perms = []; }
                }

                uniqueMap.set(rName, { 
                  ...r, 
                  id: rId, 
                  role_id: rId, // Normalize for UI consistency
                  name: rName, 
                  rank: rRank,
                  sequence: rRank, // Normalize for UI consistency
                  permissions: perms
                });
              }
            });
            
            this.customRoles = Array.from(uniqueMap.values());
            console.log("✅ [Roles Normalized & Merged]:", this.customRoles);
          },
          error: (err) => {
            console.warn('V2 Roles load failed', err);
            this.customRoles = oldRoles.map((r: any) => ({
              ...r,
              name: r.name || r.role_name || r.title || `Role ${r.id}`,
              role_id: r.role_id || r.id,
              sequence: r.sequence || r.rank
            }));
          }
        });
      },
      error: (err) => console.error('Roles load failed', err)
    });
  }



  openAddRole() {
    this.isUpdateMode = false;
    // Initialize permissions structure for the new role
    this.roleModalPerms = {};
    this.allPermissions.forEach(mod => {
      this.roleModalPerms[mod.name] = {};
      mod.actions.forEach((act: any) => {
        this.roleModalPerms[mod.name][act.action] = true;
      });
    });
    
    this.roleModalData = { id: null, name: '', rank: 3 };
    this.isRoleModalOpen = true;
  }

  async editRole(role: any) {
    this.isUpdateMode = true;
    this.roleModalData = { ...role };
    this.roleModalPerms = {};

    // Initialize all permissions to false
    this.allPermissions.forEach(mod => {
      this.roleModalPerms[mod.name] = {};
      mod.actions.forEach((act: any) => {
        this.roleModalPerms[mod.name][act.action] = false;
      });
    });

    // 1. Pre-populate from the role object itself if available (V2 style)
    console.log("📝 [EDIT ROLE] Initial Permissions:", role.permissions);
    
    let permsArray = role.permissions || [];
    if (typeof permsArray === 'string' && permsArray.length > 0) {
      try {
        permsArray = JSON.parse(permsArray);
      } catch (e) {
        console.warn("⚠️ Failed to parse permissions string", e);
        permsArray = [];
      }
    }

    if (Array.isArray(permsArray)) {
      console.log("📍 [PERMS] Pre-populating from role object:", permsArray);
      this.mapPermissionsToModal(permsArray);
    }

    const loader = await this.loadingCtrl.create({
      message: 'Loading Deep Permissions...',
      mode: 'md'
    });
    await loader.present();

    // 2. Fetch deep permissions from API for full sync
    this.dataService.getRolePermissions(role.id).subscribe({
      next: (res: any) => {
        loader.dismiss();
        let perms = res?.data || res || [];
        if (typeof perms === 'string' && perms.length > 0) {
          try { perms = JSON.parse(perms); } catch (e) { perms = []; }
        }
        console.log("🔑 [PERMS] API Sync for Role:", role.id, perms);
        
        // 🔥 ONLY OVERWRITE if API actually returned data, otherwise keep the pre-populated perms
        if (Array.isArray(perms) && perms.length > 0) {
          this.mapPermissionsToModal(perms);
        } else {
          console.log("🛡️ [SYNC] Keeping pre-populated permissions as API returned empty.");
        }
        
        this.isRoleModalOpen = true;
      },
      error: (err: any) => {
        loader.dismiss();
        console.error("❌ Failed to load permissions", err);
        this.isRoleModalOpen = true;
      }
    });
  }

  mapPermissionsToModal(perms: any[]) {
    if (!Array.isArray(perms)) return;

    perms.forEach((p: any) => {
      let modName = p.module || '';
      let actionName = p.action || p.name || p.label || '';

      // Handle string format "Module.Action" (e.g., "Patrolling.View")
      if (typeof p === 'string' && p.includes('.')) {
        const parts = p.split('.');
        modName = parts[0].trim();
        actionName = parts[1].trim();
      } else if (typeof p === 'string') {
        actionName = p.trim();
      }

      if (!actionName) return;
      
      // Canonical mapping for search
      const mLow = modName.toLowerCase();
      if (mLow === 'patrol_report' || mLow === 'forest_reports' || 
          mLow === 'forest_report' || mLow === 'forestreport' || mLow === 'forestreports') {
        modName = 'forest_events';
      }

      // 1. Find the module key
      let targetModKey = '';
      
      if (modName) {
        // Try matching against normalized internal name OR normalized displayName
        const mod = this.allPermissions.find(m => {
          const normM = m.name.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
          const normD = m.displayName.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
          const normSearch = modName.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
          
          return normM === normSearch || normD === normSearch;
        });
        if (mod) targetModKey = mod.name;
      }

      // If no module name was provided (e.g., just a string "view"), 
      // we might not be able to map it unless we search all modules.
      // But usually, we have a module name.

      if (targetModKey && this.roleModalPerms[targetModKey]) {
        // 2. Find the correct action key (case-insensitive)
        const targetActKey = Object.keys(this.roleModalPerms[targetModKey]).find(
          k => k.toLowerCase() === actionName.toLowerCase() ||
               k.toLowerCase().replace(/_/g, ' ') === actionName.toLowerCase().replace(/_/g, ' ')
        );

        if (targetActKey) {
          this.roleModalPerms[targetModKey][targetActKey] = true;
        }
      }
    });
  }

  async saveRole() {
    if (!this.roleModalData.name) {
      this.showToast('Role name is required', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ 
      message: this.isUpdateMode ? 'Updating Role...' : 'Creating Role...',
      mode: 'md'
    });
    await loader.present();

    // Flatten permissions: { "patrol": { "view": true, "delete": false } } -> ["patrol.view"]
    const flattenedPerms: string[] = [];
    Object.keys(this.roleModalPerms).forEach(modName => {
      Object.keys(this.roleModalPerms[modName]).forEach(actName => {
        if (this.roleModalPerms[modName][actName]) {
          flattenedPerms.push(`${modName}.${actName}`);
        }
      });
    });

    const payload: any = {
      name: this.roleModalData.name,
      rank: Number(this.roleModalData.rank),
      is_active: 1,
      company_id: Number(this.myCompanyId),
      permissions: JSON.stringify(flattenedPerms)
    };

    // Include ID if present (essential for update)
    if (this.roleModalData.id) {
      payload.id = Number(this.roleModalData.id);
    }

    const obs = this.isUpdateMode 
      ? this.dataService.updateV2Role(payload)
      : this.dataService.storeV2Role(payload);

    obs.subscribe({
      next: () => {
        loader.dismiss();
        this.showToast(this.isUpdateMode ? 'Role updated successfully!' : 'Role created successfully!', 'success');
        this.isRoleModalOpen = false;
        
        // 🔥 FORCE IMMEDIATE SYNC
        this.dataService.permissionsUpdated$.next();
        this.dataService.refreshPermissions();
        
        this.loadCustomRoles();
      },
      error: (err) => {
        loader.dismiss();
        console.error('Role save failed', err);
        this.showToast('Failed to save role', 'danger');
      }
    });
  }

  async deleteRole(id: any) {
    this.dataService.deleteV2Role(id).subscribe({
      next: () => {
        this.showToast('V2 Role deleted', 'success');
        this.loadCustomRoles();
      }
    });
  }

  // --- PERMISSIONS TAB LOGIC (V2) ---
  loadMasterPermissions() {
    this.dataService.listMasterPermissions().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        console.log("📊 [PERMS] Master List Raw:", raw);
        
        if (raw.length > 0 && raw[0].actions && raw[0].actions.length > 0) {
          console.log("🔍 [PERMS] FIRST ACTION KEYS:", Object.keys(raw[0].actions[0]));
          console.log("🔍 [PERMS] FIRST ACTION DATA:", JSON.stringify(raw[0].actions[0]));
        }

        this.allPermissions = raw.map((item: any) => {
          // Canonical Mapping: 'patrol_report' and others should act as 'forest_events'
          let internalName = item.module;
          if (internalName === 'patrol_report' || internalName === 'forest_reports' || 
              internalName === 'forest_report' || internalName === 'forestreport' || 
              internalName === 'incidence') {
            internalName = 'forest_events';
          }

          return {
            name: internalName,
            displayName: this.getModuleDisplayName(item.module),
            actions: (item.actions || []).map((act: any) => {
              const actionLabel = typeof act === 'string' ? act : (act.action || act.name || act.label || 'Unknown');
              return {
                action: actionLabel,
                original: act
              };
            })
          };
        });

        // Deduplicate: If multiple modules mapped to the same internal name, merge their actions
        const uniquePerms: any[] = [];
        this.allPermissions.forEach(p => {
          const existing = uniquePerms.find(u => u.name === p.name);
          if (existing) {
            // Merge actions if they don't exist
            p.actions.forEach((a: any) => {
              if (!existing.actions.find((ea: any) => ea.action === a.action)) {
                existing.actions.push(a);
              }
            });
          } else {
            uniquePerms.push(p);
          }
        });
        this.allPermissions = uniquePerms;

        console.log("🛠️ [PERMS] Grouped for UI:", this.allPermissions);
      },
      error: (err) => console.error("❌ Master Permissions failed", err)
    });
  }

  onRoleSelectForPerms() {
    if (!this.selectedRoleForPerms) return;
    
    this.isPermissionsLoading = true;
    this.userPermissions = {};

    // 1. Initialize all master perms to false
    this.allPermissions.forEach(mod => {
      this.userPermissions[mod.name] = {};
      if (mod.actions) {
        mod.actions.forEach((act: any) => {
          this.userPermissions[mod.name][act.action] = true; // Default to true
        });
      }
    });

    // 2. Pre-populate from role object if available (V2 style)
    let existing = this.selectedRoleForPerms.permissions || [];
    
    // 🔥 NEW: Robust Parsing if it's a string
    if (typeof existing === 'string' && existing.length > 0) {
      try { existing = JSON.parse(existing); } catch (e) { existing = []; }
    }

    if (Array.isArray(existing) && existing.length > 0) {
      console.log("📍 [PERMS] Using existing perms from role object:", existing);
      
      // If we have existing perms, we should probably start from false and only enable what's there
      // Otherwise, the default 'true' from above will keep unassigned perms active.
      this.resetPermissionsToFalse(this.userPermissions);

      existing.forEach((d: any) => {
        let modName = d.module;
        let actionName = d.action || d.name || d.label || d;

        if (typeof d === 'string' && d.includes('.')) {
          const parts = d.split('.');
          modName = parts[0];
          actionName = parts[1];
        }

        if (this.userPermissions[modName] && actionName) {
          this.userPermissions[modName][actionName] = true;
        }
      });
    }

    // 3. Fallback to API for deep sync
    this.dataService.getRolePermissions(this.selectedRoleForPerms.id).subscribe({
      next: (res: any) => {
        console.log(`🔑 [PERMS] API Sync for Role ${this.selectedRoleForPerms.id}:`, res);
        this.isPermissionsLoading = false;
        const defaults = res?.data || res || [];
        
        if (Array.isArray(defaults) && defaults.length > 0) {
          // Sync with API: Reset to false first to strictly follow the saved state
          this.resetPermissionsToFalse(this.userPermissions);

          defaults.forEach((d: any) => {
            let modName = d.module;
            let actionName = d.action || d.name || d.label;

            if (typeof d === 'string' && d.includes('.')) {
              const parts = d.split('.');
              modName = parts[0];
              actionName = parts[1];
            }

            if (this.userPermissions[modName] && actionName) {
              this.userPermissions[modName][actionName] = true;
            }
          });
        }
        console.log("✅ [PERMS] Final Mapped State:", this.userPermissions);
      },
      error: (err: any) => {
        this.isPermissionsLoading = false;
        console.error("❌ Role Permissions API failed", err);
      }
    });
  }

  resetPermissionsToFalse(permMap: any) {
    Object.keys(permMap).forEach(modName => {
      Object.keys(permMap[modName]).forEach(actName => {
        permMap[modName][actName] = false;
      });
    });
  }

  saveRolePermissions() {
    if (!this.selectedRoleForPerms) return;
    
    // Flatten permissions: { "patrol": { "view": true } } -> ["patrol.view"]
    const flattenedPerms: string[] = [];
    Object.keys(this.userPermissions).forEach(modName => {
      Object.keys(this.userPermissions[modName]).forEach(actName => {
        if (this.userPermissions[modName][actName]) {
          flattenedPerms.push(`${modName}.${actName}`);
        }
      });
    });

    const payload = {
      id: this.selectedRoleForPerms.id,
      name: this.selectedRoleForPerms.name,
      rank: this.selectedRoleForPerms.rank,
      permissions: flattenedPerms
    };
    
    console.log("📤 [PERMS V2] SAVING PAYLOAD:", payload);

    this.dataService.updateV2Role(payload).subscribe({
      next: () => {
        this.showToast('V2 Permissions updated successfully', 'success');
        this.dataService.refreshPermissions(); // 🚀 NEW: Sync UI immediately
        this.loadCustomRoles(); 
      },
      error: (err) => {
        console.error("V2 Perm Update Failed", err);
        this.showToast('Failed to update V2 permissions', 'danger');
      }
    });
  }

  cancelPermissions() {
    this.selectedRoleForPerms = null;
    this.userPermissions = {};
  }

  // --- ASSIGNMENTS LOGIC ---
  async loadAssignments() {
    this.dataService.getMySubordinates().subscribe({
      next: (res: any) => {
        console.log('📥 [Assignments] Raw Response:', res);
        const rawAssignments = res?.data || res || [];
        
        // Map missing names if backend only sent IDs
        this.allAssignments = rawAssignments.map((a: any) => {
          const role = this.customRoles.find((r: any) => String(r.id) === String(a.role_id));
          const entity = this.orgEntities.find((e: any) => String(e.id) === String(a.entity_id));
          return {
            ...a,
            user_name: a.user_name || `User ID: ${a.user_id}`,
            role_name: a.role_name || (role ? role.name : 'Unknown Role'),
            entity_name: a.entity_name || (entity ? entity.name : 'Unknown Entity')
          };
        });
        
        this.assignments = [...this.allAssignments];
        console.log('✅ [Assignments] Parsed Count:', this.assignments.length);
      },
      error: (err) => {
        console.error('Assignments load failed (Backend Issue)', err);
        // Fallback: Try to load for a default entity if subordinates fail, 
        // or just show empty list gracefully
        this.allAssignments = [];
        this.assignments = [];
        this.showToast('Assignments sync temporarily unavailable', 'warning');
      }
    });
  }

  async openAssignUser() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'V2 User Assignment',
      inputs: [
        { name: 'assigned_user_id', type: 'number', placeholder: 'User ID' },
        { name: 'entity_id', type: 'number', placeholder: 'Entity ID' },
        { name: 'custom_role_id', type: 'number', placeholder: 'Custom Role ID' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Assign',
          handler: (data) => {
            this.dataService.saveV2Assignment(data).subscribe({
              next: () => {
                this.showToast('User assigned via V2!', 'success');
                this.loadAssignments();
              },
              error: (err) => this.showToast('V2 Assignment failed', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async unassignUser(assign: any) {
    this.dataService.unassignUser({ user_id: assign.user_id, entity_id: assign.entity_id }).subscribe({
      next: () => {
        this.showToast('User unassigned', 'success');
        this.loadAssignments();
      }
    });
  }

  searchAssignments(event: any) {
    const term = event.target.value.toLowerCase();
    if (!term) {
      this.assignments = [...this.allAssignments];
      return;
    }
    this.assignments = this.allAssignments.filter(a => 
      a.user_name?.toLowerCase().includes(term) || 
      a.entity_name?.toLowerCase().includes(term)
    );
  }

  // --- HELPERS ---
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
      'client_visits': 'Visits',
      'sos': 'SOS',
      'system': 'System'
    };
    return map[mod.toLowerCase()] || mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, ' ');
  }

  async showToast(msg: string, color: string = 'dark') {
    this.toast.create({ message: msg, color, duration: 2000, position: 'bottom' }).then(t => t.present());
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }

  // --- TREE VIEW HELPER METHODS ---
  buildOrgTree() {
    if (!this.orgEntities || this.orgEntities.length === 0) {
      this.orgTree = [];
      return;
    }

    // 1. Create a map of all entities for O(1) lookup
    const map = new Map();
    this.orgEntities.forEach(e => {
      map.set(String(e.id), {
        ...e,
        children: [],
        expanded: true // Default to expanded
      });
    });

    const roots: any[] = [];

    // 2. Build the tree
    map.forEach(node => {
      if (node.parent_id && map.has(String(node.parent_id))) {
        const parent = map.get(String(node.parent_id));
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // 3. Sort roots and children by name
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };

    sortNodes(roots);
    this.orgTree = roots;
    console.log("🌳 [Org Tree Built Successfully]:", this.orgTree);
  }

  getLayerName(layerId: any): string {
    const layer = this.orgLayers.find(l => String(l.id) === String(layerId));
    return layer ? layer.name : `Layer ${layerId}`;
  }

  getLayerColor(layerId: any): string {
    const colors: any = {
      '26': 'rgba(16, 185, 129, 0.12)', // Range - emerald green
      '27': 'rgba(59, 130, 246, 0.12)',  // Beat - cool blue
      '9': 'rgba(139, 92, 246, 0.12)',   // Section - violet/purple
      '10': 'rgba(245, 158, 11, 0.12)',  // Beat/other - warm orange
    };
    if (colors[String(layerId)]) return colors[String(layerId)];
    const num = Number(layerId) || 0;
    const hue = (num * 137) % 360;
    return `hsla(${hue}, 70%, 45%, 0.12)`;
  }

  getLayerTextColor(layerId: any): string {
    const colors: any = {
      '26': '#10b981', // Emerald
      '27': '#3b82f6', // Blue
      '9': '#8b5cf6',  // Purple
      '10': '#f59e0b', // Orange
    };
    if (colors[String(layerId)]) return colors[String(layerId)];
    const num = Number(layerId) || 0;
    const hue = (num * 137) % 360;
    return `hsl(${hue}, 70%, 40%)`;
  }

  expandAllTreeNodes(expanded: boolean) {
    const toggle = (nodes: any[]) => {
      nodes.forEach(n => {
        n.expanded = expanded;
        if (n.children && n.children.length > 0) {
          toggle(n.children);
        }
      });
    };
    toggle(this.orgTree);
  }

  openAddOrgEntityWithParent(parent: any) {
    // Find next layer rank
    const currentLayer = this.orgLayers.find(l => String(l.id) === String(parent.layer_id));
    const currentRank = currentLayer ? Number(currentLayer.rank || currentLayer.id) : 0;
    
    // Find next layer in sequence
    const nextLayer = this.orgLayers.find(l => Number(l.rank || l.id) > currentRank) || this.orgLayers[this.orgLayers.length - 1];

    this.structureModalMode = 'create';
    this.structureModalType = 'entity';
    this.structureForm = {
      id: null,
      layerName: '',
      layerRank: null,
      entityName: '',
      entityCode: '',
      entityLayerId: nextLayer ? String(nextLayer.id) : String(parent.layer_id),
      entityParentId: String(parent.id),
      parentLocked: true
    };
    this.resetStructureFormTouched();
    this.isStructureModalOpen = true;
  }

  async importBulkEntities() {
    if (!this.bulkImportData.layer_id) {
      this.showToast('Please select a target layer', 'warning');
      return;
    }
    if (!this.bulkImportData.rawText.trim()) {
      this.showToast('Please enter some entity data', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Processing bulk import...',
      mode: 'md'
    });
    await loader.present();

    const lines = this.bulkImportData.rawText.split('\n');
    const importPromises: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parse comma-separated values: Name, Code, ParentId
      const parts = trimmed.split(',').map(p => p.trim());
      const name = parts[0];
      const code = parts[1] || '';
      const parentId = parts[2] || this.bulkImportData.parent_id || null;

      if (!name) continue;

      const payload: any = {
        name: name,
        code: code,
        layer_id: Number(this.bulkImportData.layer_id),
      };
      if (parentId) {
        payload.parent_id = Number(parentId);
      }

      // Convert observable to promise
      const p = new Promise<void>((resolve) => {
        this.dataService.storeV2Entity(payload).subscribe({
          next: () => {
            successCount++;
            resolve();
          },
          error: (err) => {
            console.error(`Failed to import ${name}:`, err);
            failCount++;
            resolve(); // Resolve anyway so loop completes
          }
        });
      });
      importPromises.push(p);
    }

    // Wait for all imports to finish
    await Promise.all(importPromises);
    await loader.dismiss();

    if (successCount > 0) {
      this.showToast(`Successfully imported ${successCount} entities! ${failCount > 0 ? `(${failCount} failed)` : ''}`, 'success');
      this.isBulkModalOpen = false;
      this.bulkImportData.rawText = '';
      this.loadOrgEntities(); // Refresh tree and list views
    } else {
      this.showToast('Failed to import entities. Please check the format.', 'danger');
    }
  }

  // --- REACTIVE TREE FILTERING ENGINE ---
  get displayedOrgTree(): any[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.orgTree;
    }
    return this.filterTreeBySearch(this.orgTree, this.searchQuery);
  }

  filterTreeBySearch(nodes: any[], query: string): any[] {
    if (!query || !query.trim()) {
      return nodes.map(n => ({
        ...n,
        expanded: true,
        children: n.children ? this.filterTreeBySearch(n.children, '') : []
      }));
    }

    const q = query.toLowerCase().trim();

    return nodes
      .map(node => {
        // Recursively filter children first
        const filteredChildren = node.children ? this.filterTreeBySearch(node.children, query) : [];
        
        // Check if current node matches the query
        const matchesName = (node.name || '').toLowerCase().includes(q);
        const matchesCode = (node.code || '').toLowerCase().includes(q);
        const matchesLayer = this.getLayerName(node.layer_id).toLowerCase().includes(q);
        const matchesCurrent = matchesName || matchesCode || matchesLayer;

        // If current matches OR any children matches, keep it
        if (matchesCurrent || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
            expanded: true // Automatically expand matching paths!
          };
        }
        return null;
      })
      .filter(n => n !== null);
  }

  onSearchChange() {
    this.filterEntities(this.selectedLayer);
  }
}
