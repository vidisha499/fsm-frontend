import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-geofences',
  templateUrl: './geofences.page.html',
  styleUrls: ['./geofences.page.scss'],
  standalone: false
})
export class GeofencesPage implements OnInit {
  public sites: any[] = [];
  public statusFilter: string = 'sites'; // 'sites' or 'geofences'
  public isLoading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadSites();
  }

  async loadSites() {
    this.isLoading = true;
    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '1';
    const userRole = localStorage.getItem('user_role');
    const rangerId = localStorage.getItem('ranger_id');

    // Include company_id and for rangers, also include user_id to filter for the logged-in user
    const payload: any = { api_token: apiToken, company_id: companyId };
    if (userRole !== '1' && userRole !== '2' && userRole !== '3') {
      payload.user_id = rangerId;
    }

    this.dataService.getSites(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('Sites API Response:', res);
        
        let fetchedData = res && res.data ? res.data : res;

        if (Array.isArray(fetchedData)) {
          this.sites = fetchedData;
        } else if (fetchedData && typeof fetchedData === 'object' && !Array.isArray(fetchedData)) {
          this.sites = [fetchedData];
        } else {
          this.sites = [];
        }

        // Additional Frontend Privacy Guard: Double-check that non-admins only see their own data
        if (userRole !== '1' && userRole !== '2' && userRole !== '3' && rangerId) {
          this.sites = this.sites.filter(s => 
            String(s.user_id) === String(rangerId) || 
            String(s.ranger_id) === String(rangerId) ||
            !s.user_id // Include if unassigned/system records
          );
        }
      },
      error: async (err) => {
        this.isLoading = false;
        console.error('Failed to load sites:', err);
      }
    });
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    // If role is 1 (Super Admin), 2 (Admin), or 3 (Manager), go to Admin dashboard
    if (roleId === '1' || roleId === '2' || roleId === '3') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}
