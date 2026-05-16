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
    const layerId = this.selectedLayer === 'all' ? null : this.selectedLayer;
    
    this.dataService.listV2Entities(layerId).subscribe({ 
      next: (res: any) => {
        console.log(`📥 [Org V2 Entities] Layer ${layerId || 'All'} Response:`, res);
        this.orgEntities = res?.data || res || [];
        this.filterEntities(this.selectedLayer);
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

    if (layerId === 'all') {
      this.filteredEntities = [...this.orgEntities];
    } else {
      // Find the layer object to get its name for a smarter match
      const selectedLayerObj = this.orgLayers.find(l => String(l.id) === String(layerId));
      const layerName = selectedLayerObj?.name?.toLowerCase();

      this.filteredEntities = this.orgEntities.filter(e => {
        const matchesId = String(e.layer_id) === String(layerId);
        // Fallback: If ID doesn't match, check if the entity's layer name matches the tab name
        const matchesName = layerName && e.layer_name && String(e.layer_name).toLowerCase().includes(layerName);
        return matchesId || matchesName;
      });
    }
    console.log("✅ Filtered Count:", this.filteredEntities.length);
  }

  async editOrgLayer(layer: any) {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update V2 Layer',
      inputs: [
        { name: 'name', type: 'text', value: layer.name, placeholder: 'Layer Name' },
        { name: 'rank', type: 'number', value: layer.rank, placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            this.dataService.updateV2Layer({ id: layer.id, ...data }).subscribe({
              next: () => {
                this.showToast('V2 Layer updated', 'success');
                this.loadOrgLayers();
              }
            });
          }
        }
      ]
    });
    await alert.present();
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

  async openAddOrgLayer() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'New V2 Layer',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Layer Name' },
        { name: 'rank', type: 'number', placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            this.dataService.storeV2Layer({ ...data, is_active: 1 }).subscribe({
              next: () => {
                this.showToast('V2 Layer created', 'success');
                this.loadOrgLayers();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openAddOrgEntity() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'New V2 Entity',
      message: 'Select a layer and enter entity details.',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Entity Name' },
        { name: 'code', type: 'text', placeholder: 'Code (e.g. NAG-01)' },
        { name: 'layer_id', type: 'number', placeholder: 'Layer ID' },
        { name: 'parent_id', type: 'number', placeholder: 'Parent Entity ID (Optional)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            if (!data.name || !data.layer_id) {
              this.showToast('Name and Layer ID are required', 'warning');
              return;
            }
            this.dataService.storeV2Entity(data).subscribe({
              next: () => {
                this.showToast('V2 Entity created', 'success');
                this.loadOrgEntities();
              }
            });
          }
        }
      ]
    });
    await alert.present();
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

  async editOrgEntity(entity: any) {
     const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update V2 Entity',
       inputs: [
        { name: 'name', type: 'text', value: entity.name, placeholder: 'Entity Name' },
        { name: 'code', type: 'text', value: entity.code, placeholder: 'Code' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            this.dataService.updateV2Entity({ id: entity.id, ...data }).subscribe({
              next: () => {
                this.showToast('V2 Entity updated', 'success');
                this.loadOrgEntities();
              }
            });
          }
        }
      ]
    });
    await alert.present();
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
      error: (err) => {
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
<<<<<<< Updated upstream
        this.showToast(this.isUpdateMode ? 'Role updated successfully!' : 'Role created successfully!', 'success');
        this.isRoleModalOpen = false;
        
        // 🔥 FORCE IMMEDIATE SYNC
        this.dataService.permissionsUpdated$.next();
        
=======
        this.showToast('V2 Role created with permissions!', 'success');
        this.dataService.refreshPermissions();
        this.isAddRoleModalOpen = false;
>>>>>>> Stashed changes
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
      error: (err) => {
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
}
