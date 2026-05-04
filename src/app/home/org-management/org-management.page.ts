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
    this.dataService.listOrgEntities(1).subscribe({ // Default layer 1
      next: (res: any) => {
        this.orgEntities = res?.data || res || [];
        this.filterEntities('all');
      },
      error: (err) => {
        console.error('Org entities load failed', err);
        this.showToast('Failed to load organization entities', 'danger');
      }
    });
  }

  filterEntities(layerId: any) {
    this.selectedLayer = layerId;
    if (layerId === 'all') {
      this.filteredEntities = [...this.orgEntities];
    } else {
      this.filteredEntities = this.orgEntities.filter(e => e.layer_id === layerId);
    }
  }

  async openAddOrgEntity() {
    const alert = await this.alertCtrl.create({
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
      }
    });
  }

  async editOrgEntity(entity: any) {
     const alert = await this.alertCtrl.create({
      header: 'Update Entity',
      inputs: [
        { name: 'name', type: 'text', value: entity.name, placeholder: 'Entity Name' }
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

  async openAddRole() {
    const alert = await this.alertCtrl.create({
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
      header: 'Set Permissions',
      message: 'Select access for this role',
      inputs: [
        { name: 'attendance', type: 'checkbox', label: 'Attendance', value: 'attendance', checked: true },
        { name: 'patrol', type: 'checkbox', label: 'Patrol', value: 'patrol', checked: true },
        { name: 'reports', type: 'checkbox', label: 'Reports', value: 'reports' }
      ],
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
    // Similar to add but with update API
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
        this.allAssignments = res?.data || res || [];
        this.assignments = [...this.allAssignments];
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
            this.dataService.assignUserToNode(data).subscribe({
              next: () => {
                this.showToast('User assigned', 'success');
                this.loadAssignments();
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
