import { Component, OnInit } from '@angular/core';
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
    range: null,
    beat: null,
    companyId: null
  };

  roles: any[] = [];
  staticRoles: any[] = [
    { id: 1, name: 'Super Admin' },
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Guard / Ranger' },
    { id: 4, name: 'Supervisor' }
  ];
  dynamicRoles: any[] = [];
  
  ranges: any[] = [];
  allBeats: any[] = [];
  filteredBeats: any[] = [];
  isSaving: boolean = false;
  showBeatSuggestions: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.userData.companyId = localStorage.getItem('company_id');
    await this.loadInitialData();
  }

  async loadInitialData() {
    const loader = await this.loadingCtrl.create({ message: 'Loading Roles & Hierarchy...' });
    await loader.present();

    try {
      // 1. Fetch official roles from Sir's new API
      this.dataService.getRoleIdList().subscribe({
        next: (res: any) => {
          const allRoles = res?.data || [];
          
          // Categorize them as per your requirement
          this.staticRoles = allRoles.filter((r: any) => [1, 2, 3, 7].includes(Number(r.id)));
          this.dynamicRoles = allRoles.filter((r: any) => ![1, 2, 3, 7].includes(Number(r.id)));
          
          // Map names to match your UI (e.g., role_name -> name)
          this.staticRoles.forEach(r => r.name = r.role_name);
          this.dynamicRoles.forEach(r => r.name = r.role_name);
        }
      });

      // 2. Load Ranges & Beats from Hierarchy
      this.dataService.getHierarchyForFilters(this.userData.companyId).subscribe({
        next: (res: any) => {
          this.ranges = res.ranges || [];
          this.allBeats = res.beats || [];
          loader.dismiss();
        },
        error: () => loader.dismiss()
      });
    } catch (e) {
      loader.dismiss();
    }
  }

  getStandardRoles() {
    return [
      { id: 1, name: 'Super Admin', needs_hierarchy: false },
      { id: 2, name: 'Admin', needs_hierarchy: false },
      { id: 3, name: 'Guard / Ranger', needs_hierarchy: true },
      { id: 4, name: 'Supervisor', needs_hierarchy: true }
    ];
  }

  shouldShowHierarchy(): boolean {
    // Hide hierarchy until a role is actually selected
    if (!this.userData.roleId || this.userData.roleId === 'null') {
      return false;
    }
    
    // IDs 1 (Super Admin) and 7 (Admin) are global
    const globalRoles = ['1', '7', 1, 7];
    if (globalRoles.includes(this.userData.roleId)) {
      return false;
    }
    
    // All other roles (Supervisor, Ranger, Custom) get hierarchy options
    return true;
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

    const showH = this.shouldShowHierarchy();
    const selectedBeatObj = showH ? this.allBeats.find((b: any) => b.name === this.userData.beat) : null;
    const site_id = selectedBeatObj ? selectedBeatObj.id : '';
    const token = localStorage.getItem('api_token') || '';

    const payload = {
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
      
      // Hierarchy - DEPARTMENT (Range)
      department: showH ? (this.userData.range || '') : '',
      range: showH ? (this.userData.range || '') : '',
      client_name: showH ? (this.userData.range || '') : '',
      division: showH ? (this.userData.range || '') : '',
      
      // Hierarchy - DESIGNATION (Beat)
      designation: showH ? (this.userData.beat || '') : '',
      beat: showH ? (this.userData.beat || '') : '',
      site_name: showH ? (this.userData.beat || '') : '',
      site_id: site_id,
      beat_id: site_id,
      
      registrationFlag: 0,
      showUser: 1
    };

    // Using addRegistration as per Sir's new instruction for Admin-side creation
    this.dataService.addRegistration(payload).subscribe({
      next: async (res: any) => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: 'User Pre-registered & Approved Successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast('Error in Pre-registration. Please try again.', 'danger');
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
