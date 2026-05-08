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
    roleId: null,
    range: null,
    beat: null,
    companyId: null
  };

  roles: any[] = [];
  ranges: any[] = [];
  allBeats: any[] = [];
  filteredBeats: any[] = [];
  isSaving: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user_data');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userData.companyId = user.company_id || 1;
    }
    this.loadInitialData();
  }

  async loadInitialData() {
    const loading = await this.loadingCtrl.create({
      message: 'Fetching Hierarchy...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // 1. Load Roles
      this.dataService.listCustomRoles().subscribe({
        next: (res: any) => {
          this.roles = res?.data || res || [];
        }
      });

      // 2. Load Ranges & Beats from Hierarchy
      this.dataService.getHierarchyForFilters(this.userData.companyId).subscribe({
        next: (res: any) => {
          this.ranges = res.ranges || [];
          this.allBeats = res.beats || [];
          loading.dismiss();
        },
        error: () => loading.dismiss()
      });
    } catch (e) {
      loading.dismiss();
    }
  }

  onRangeChange() {
    this.userData.beat = null;
    if (!this.userData.range || this.userData.range === 'all') {
      this.filteredBeats = [];
    } else {
      this.filteredBeats = this.allBeats.filter(b => b.parentName === this.userData.range);
    }
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

    // Finding IDs for the selected range and beat
    const selectedRangeObj = this.ranges.find((r: any) => r.name === this.userData.range);
    const selectedBeatObj = this.allBeats.find((b: any) => b.name === this.userData.beat);
    
    const range_id = selectedRangeObj ? selectedRangeObj.id : null;
    const site_id = selectedBeatObj ? selectedBeatObj.id : null;
    const token = localStorage.getItem('api_token') || '';

    const payload = {
      api_token: token,
      firstName: this.userData.firstName,
      lastName: this.userData.lastName,
      name: `${this.userData.firstName} ${this.userData.lastName}`.trim(),
      full_name: `${this.userData.firstName} ${this.userData.lastName}`.trim(),
      contact: this.userData.contact,
      mobile: this.userData.contact,
      phoneNo: this.userData.contact,
      email: this.userData.contact + '@fsm.com', // Using mobile for unique email
      password: '123456',
      role_id: String(this.userData.roleId),
      company_id: String(this.userData.companyId),
      status: '1',
      // Hierarchy Mappings
      range: this.userData.range || '',
      range_id: range_id,
      department: this.userData.range || '', 
      client_name: this.userData.range || '', // New possible key for Range
      block: this.userData.range || '',      // Another possible key
      division: this.userData.range || '',
      address: this.userData.range || '',
      beat: this.userData.beat || '',
      beat_id: site_id,
      designation: this.userData.beat || '', 
      site_name: this.userData.beat || '',
      site_id: site_id,
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
