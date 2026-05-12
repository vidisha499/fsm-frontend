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
    this.dataService.listOrgLayers().subscribe({
      next: (res: any) => {
        const layers = res?.data || res || [];
        this.orgLayers = layers.map((l: any) => {
          if (String(l.id) === '9') return { ...l, name: 'Section' };
          if (String(l.id) === '10') return { ...l, name: 'Beat' };
          return l;
        }).sort((a: any, b: any) => Number(a.id) - Number(b.id));
      },
      error: (err) => console.error('Layers load failed', err)
    });
  }

  async loadOrgEntities() {
    this.isLoadingEntities = true;
    this.dataService.listOrgEntities('').subscribe({ 
      next: (res: any) => {
        console.log('📥 [Org Entities] Raw Response:', res);
        this.orgEntities = res?.data || res || [];
        console.log('✅ [Org Entities] Total Count:', this.orgEntities.length);
        this.filterEntities(this.selectedLayer || 'all');
        this.isLoadingEntities = false;
      },
      error: (err) => {
        console.error('Org entities load failed', err);
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

  async openAddOrgLayer() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'New Org Layer',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Layer Name' },
        { name: 'rank', type: 'number', placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            this.dataService.createOrgLayer(data).subscribe({
              next: () => {
                this.showToast('Layer created', 'success');
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
      header: 'New Org Entity',
      message: 'Select a layer and enter entity details. Available Layers: ' + 
               this.orgLayers.map(l => `${l.name} (ID: ${l.id})`).join(', '),
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Entity Name (e.g. Nagpur Circle)' },
        { name: 'code', type: 'text', placeholder: 'Code (e.g. NAG-01)' },
        { name: 'layer_id', type: 'number', placeholder: 'Layer ID (See above list)' },
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
            this.dataService.createOrgEntity(data).subscribe({
              next: () => {
                this.showToast('Entity created', 'success');
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
    this.dataService.deleteOrgEntity(id).subscribe({
      next: () => {
        this.showToast('Entity deleted', 'success');
        this.loadOrgEntities();
      },
      error: (err) => {
        console.error('Delete failed:', err);
        const msg = err.error?.error || err.error?.message || 'Delete failed';
        this.showToast('⚠️ ' + msg, 'danger');
      }
    });
  }

  async editOrgEntity(entity: any) {
     const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update Entity',
       inputs: [
        { name: 'name', type: 'text', value: entity.name, placeholder: 'Entity Name' },
        { name: 'code', type: 'text', value: entity.code, placeholder: 'Code (E001)' },
        { name: 'layer_id', type: 'number', value: entity.layer_id, placeholder: 'Layer ID' },
        { name: 'parent_id', type: 'number', value: entity.parent_id, placeholder: 'Parent ID' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            this.dataService.updateOrgEntity(entity.id, data).subscribe({
              next: () => {
                this.showToast('Entity updated', 'success');
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
      next: (res: any) => {
        this.customRoles = res?.data || res || [];
        // Map role_name to name so UI can display it
        this.customRoles.forEach((r: any) => {
          if (r.role_name && !r.name) r.name = r.role_name;
        });
        console.log("Fetched and Mapped Roles:", this.customRoles);
      },
      error: (err) => {
        console.error('Roles load failed', err);
        this.showToast('Failed to load roles', 'danger');
      }
    });
  }



  async openAddRole() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Create Custom Role',
      inputs: [
        { name: 'id', type: 'number', placeholder: 'Role ID (e.g. 10)' },
        { name: 'name', type: 'text', placeholder: 'Role Name (e.g. Officer)' },
        { name: 'rank', type: 'number', placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            const payload = {
              ...data,
              is_active: true,
              permissions: [] // Start with empty perms, assign in Perms tab
            };
            this.dataService.createCustomRole(payload).subscribe({
              next: () => {
                this.showToast('Role created', 'success');
                this.loadCustomRoles();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async editRole(role: any) {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update Role',
      inputs: [
        { name: 'name', type: 'text', value: role.name, placeholder: 'Role Name' },
        { name: 'rank', type: 'number', value: role.rank, placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            const payload = {
              ...data,
              is_active: role.is_active,
              permissions: role.permissions || []
            };
            this.dataService.updateCustomRole(role.id, payload).subscribe({
              next: () => {
                this.showToast('Role updated', 'success');
                this.loadCustomRoles();
              },
              error: (err) => this.showToast('Failed to update role', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteRole(id: any) {
    this.dataService.deleteCustomRole(id).subscribe({
      next: () => {
        this.showToast('Role deleted', 'success');
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

    // Initialize all master perms to false for this role
    this.allPermissions.forEach(mod => {
      this.userPermissions[mod.name] = {};
      if (mod.actions) {
        mod.actions.forEach((act: any) => {
          // Now act is the object we mapped above: { action: 'view', original: 'view' }
          const actionName = act.action;
          if (actionName) this.userPermissions[mod.name][actionName] = false;
        });
      }
    });

    this.dataService.getRolePermissions(this.selectedRoleForPerms.id).subscribe({
      next: (res: any) => {
        console.log(`🔑 [PERMS] Defaults for Role ${this.selectedRoleForPerms.id}:`, res);
        this.isPermissionsLoading = false;
        const defaults = res?.data || res || [];
        
        if (Array.isArray(defaults)) {
          // Format 1: Array of action objects
          defaults.forEach((d: any) => {
            const actionName = d.action || d.name || d.label;
            if (this.userPermissions[d.module] && actionName) {
              this.userPermissions[d.module][actionName] = true;
            }
          });
        } else if (typeof defaults === 'object') {
          // Format 2: Object mapping { module: { action: true } }
          // Just merge it into userPermissions
          for (let mod in defaults) {
            if (this.userPermissions[mod]) {
              for (let act in defaults[mod]) {
                this.userPermissions[mod][act] = !!defaults[mod][act];
              }
            }
          }
        }
        console.log("✅ [PERMS] Final User State Mapping:", this.userPermissions);
      },
      error: (err) => {
        this.isPermissionsLoading = false;
        console.error("❌ Role Permissions failed", err);
      }
    });
  }

  saveRolePermissions() {
    if (!this.selectedRoleForPerms) return;
    
    // Send granular permissions as a mapping
    const payload = {
      ...this.selectedRoleForPerms,
      permissions: JSON.stringify(this.userPermissions)
    };
    
    console.log("📤 [PERMS] SAVING PAYLOAD:", payload);

    this.dataService.updateCustomRole(this.selectedRoleForPerms.id, payload).subscribe({
      next: () => {
        this.showToast('Permissions updated successfully', 'success');
        this.loadCustomRoles(); 
        this.cancelPermissions(); 
      },
      error: (err) => this.showToast('Failed to update permissions', 'danger')
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
      header: 'Assign User to Node',
      inputs: [
        { name: 'user_id', type: 'number', placeholder: 'User ID' },
        { name: 'entity_id', type: 'number', placeholder: 'Entity ID' },
        { name: 'role_id', type: 'number', placeholder: 'Role ID' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Assign',
          handler: (data) => {
            const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id') || '1';
            const payload = {
              ...data,
              reporting_to: currentUserId
            };
            this.dataService.assignUserToNode(payload).subscribe({
              next: () => {
                this.showToast('User assigned successfully!', 'success');
                this.loadAssignments();
              },
              error: (err) => {
                console.error('Assignment failed:', err);
                const backendMsg = err.error?.message || '';
                if (backendMsg.includes('custom_permissions') || backendMsg.includes('reporting_to') || backendMsg.includes('Column not found')) {
                  this.showToast('⚠️ Backend DB columns missing! Sir ko SQL bhejiye.', 'danger');
                } else {
                  this.showToast('Assignment failed: ' + (backendMsg || 'Server error'), 'danger');
                }
              }
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
