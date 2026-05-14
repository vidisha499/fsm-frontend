import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-org-management',
  templateUrl: './org-management.page.html',
  styleUrls: ['./org-management.page.scss'],
  standalone: false
})
export class OrgManagementPage implements OnInit {
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
  
  // Permissions Data
  selectedRoleForPerms: any = null;
  allPermissions: any[] = []; // Master list from checkList (v2)
  userPermissions: any = {};  // { module: { action: true/false } }
  isPermissionsLoading: boolean = false;
  
  // Assignments Data
  assignments: any[] = [];
  allAssignments: any[] = [];

  // Add Role Modal State
  isAddRoleModalOpen: boolean = false;
  newRoleData: any = { name: '', rank: 1 };
  newRolePerms: any = {}; // { module: { action: boolean } }

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toast: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.loadData();
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
        
        this.dataService.listV2Roles().subscribe({
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
                uniqueMap.set(rName, { 
                  ...r, 
                  id: rId, 
                  role_id: rId, // Normalize for UI consistency
                  name: rName, 
                  rank: rRank,
                  sequence: rRank // Normalize for UI consistency
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
    // Initialize permissions structure for the new role
    this.newRolePerms = {};
    this.allPermissions.forEach(mod => {
      this.newRolePerms[mod.name] = {};
      mod.actions.forEach((act: any) => {
        this.newRolePerms[mod.name][act.action] = true;
      });
    });
    
    this.newRoleData = { id: null, name: '', rank: 3 };
    this.isAddRoleModalOpen = true;
  }

  async saveNewRoleWithPerms() {
    if (!this.newRoleData.name) {
      this.showToast('Role name is required', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Creating Role...' });
    await loader.present();

    // Flatten permissions: { "patrol": { "view": true, "delete": false } } -> ["patrol.view"]
    const flattenedPerms: string[] = [];
    Object.keys(this.newRolePerms).forEach(modName => {
      Object.keys(this.newRolePerms[modName]).forEach(actName => {
        if (this.newRolePerms[modName][actName]) {
          flattenedPerms.push(`${modName}.${actName}`);
        }
      });
    });

    const payload: any = {
      name: this.newRoleData.name,
      rank: this.newRoleData.rank,
      is_active: 1,
      permissions: flattenedPerms
    };

    // Include ID if manually provided
    if (this.newRoleData.id) {
      payload.id = this.newRoleData.id;
    }

    this.dataService.storeV2Role(payload).subscribe({
      next: () => {
        loader.dismiss();
        this.showToast('V2 Role created with permissions!', 'success');
        this.isAddRoleModalOpen = false;
        this.loadCustomRoles();
      },
      error: (err) => {
        loader.dismiss();
        console.error('Role creation failed', err);
        this.showToast('Failed to create role', 'danger');
      }
    });
  }

  async editRole(role: any) {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update V2 Role',
      inputs: [
        { name: 'name', type: 'text', value: role.name, placeholder: 'Role Name' },
        { name: 'rank', type: 'number', value: role.rank, placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            this.dataService.updateV2Role({ id: role.id, ...data }).subscribe({
              next: () => {
                this.showToast('V2 Role updated', 'success');
                this.loadCustomRoles();
              }
            });
          }
        }
      ]
    });
    await alert.present();
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

        this.allPermissions = raw.map((item: any) => ({
          name: item.module,
          displayName: this.getModuleDisplayName(item.module),
          actions: (item.actions || []).map((act: any) => {
            // If it's a string, wrap it. If it's an object, keep it.
            const actionLabel = typeof act === 'string' ? act : (act.action || act.name || act.label || 'Unknown');
            return {
              action: actionLabel,
              original: act // Keep original just in case
            };
          })
        }));

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
    const existing = this.selectedRoleForPerms.permissions || [];
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
      'patrol_report': 'Forest Reports',
      'attendance_request': 'Attendance',
      'asset_management': 'Assets',
      'forest_events': 'Forest Events',
      'incidence': 'Forest Events',
      'know_your_area': 'Know Your Area',
      'plantations': 'Plantation',
      'chat': 'Chat',
      'daily_updates': 'Daily Updates',
      'client_visits': 'Visits'
    };
    return map[mod.toLowerCase()] || mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, ' ');
  }

  async showToast(msg: string, color: string = 'dark') {
    const t = await this.toast.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    await t.present();
  }
}
