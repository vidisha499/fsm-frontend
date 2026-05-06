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
      next: (res: any) => this.orgLayers = res?.data || res || [],
      error: (err) => console.error('Org layers load failed', err)
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
    if (layerId === 'all') {
      this.filteredEntities = [...this.orgEntities];
    } else {
      this.filteredEntities = this.orgEntities.filter(e => String(e.layer_id) === String(layerId));
    }
  }

  async openAddOrgEntity() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'New Org Entity',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Entity Name' },
        { name: 'code', type: 'text', placeholder: 'Code (E001)' },
        { name: 'layer_id', type: 'number', placeholder: 'Layer ID' },
        { name: 'parent_id', type: 'number', placeholder: 'Parent ID' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
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
    this.dataService.listCustomRoles().subscribe({
      next: (res: any) => this.customRoles = res?.data || res || [],
      error: (err) => {
        console.error('Roles load failed', err);
        this.showToast('Failed to load custom roles', 'danger');
      }
    });
  }


  getAvailableModules() {
    // Collect all unique module_keys from existing roles + our standard list
    const standardModules = [
      { key: 'attendance', label: 'Attendance' },
      { key: 'patrol', label: 'Patrol / Patrolling' },
      { key: 'assets', label: 'Asset Management' },
      { key: 'criminal', label: 'Criminal Activity' },
      { key: 'fire', label: 'Fire Records' },
      { key: 'events', label: 'Forest Events' },
      { key: 'tasks', label: 'Tasks & Assignments' },
      { key: 'analytics', label: 'Advanced Analytics' },
      { key: 'reports', label: 'Reports & Logs' },
      { key: 'chat', label: 'Communication (Chat)' },
      { key: 'daily_updates', label: 'Daily Updates' },
      { key: 'client_visits', label: 'Client Visits' },
      { key: 'geofences', label: 'Geofencing' },
      { key: 'dynamic_forms', label: 'Dynamic Forms' },
      { key: 'dynamic_labels', label: 'Dynamic Labels' },
      { key: 'org_management', label: 'Org Management' },
      { key: 'notifications', label: 'Notifications' }
    ];

    // Extract from existing roles to be truly dynamic
    const existingKeys = new Set();
    this.customRoles.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((p: any) => existingKeys.add(p.module_key));
      }
    });

    // Merge them
    const finalModules = [...standardModules];
    existingKeys.forEach(key => {
      if (key && !finalModules.find(m => m.key === key)) {
        finalModules.push({ key: key as string, label: (key as string).replace(/_/g, ' ').toUpperCase() });
      }
    });

    return finalModules;
  }

  async openAddRole() {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Create Custom Role',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Role Name (e.g. Officer)' },
        { name: 'rank', type: 'number', placeholder: 'Rank' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Next (Perms)',
          handler: (data) => {
            this.setRolePermissions(data);
          }
        }
      ]
    });
    await alert.present();
  }

  async setRolePermissions(roleData: any) {
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Set Permissions',
      message: 'Select access for this role',
      inputs: this.getAvailableModules().map(m => ({
        name: m.key,
        type: 'checkbox' as const,
        label: m.label,
        value: m.key,
        checked: true
      })),
      buttons: [
        { text: 'Back', role: 'cancel' },
        {
          text: 'Save Role',
          handler: (perms) => {
            const payload = {
              ...roleData,
              is_active: true,
              permissions: perms.map((p: string) => ({ module_key: p, permissions: { view: true, edit: true } }))
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
          text: 'Next (Perms)',
          handler: (data) => {
            this.setUpdatePermissions(role, data);
          }
        }
      ]
    });
    await alert.present();
  }

  async setUpdatePermissions(originalRole: any, updatedData: any) {
    const currentModuleKeys = originalRole.permissions?.map((p: any) => p.module_key) || [];
    
    const alert = await this.alertCtrl.create({
      mode: 'md',
      header: 'Update Permissions',
      message: 'Select access for ' + updatedData.name,
      inputs: this.getAvailableModules().map(m => ({
        name: m.key,
        type: 'checkbox' as const,
        label: m.label,
        value: m.key,
        checked: currentModuleKeys.includes(m.key)
      })),
      buttons: [
        { text: 'Back', role: 'cancel' },
        {
          text: 'Update Role',
          handler: (perms) => {
            const payload = {
              ...updatedData,
              is_active: originalRole.is_active,
              permissions: perms.map((p: string) => ({ module_key: p, permissions: { view: true, edit: true } }))
            };
            this.dataService.updateCustomRole(originalRole.id, payload).subscribe({
              next: () => {
                this.showToast('Role updated successfully', 'success');
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
