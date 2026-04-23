import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-assets-records',
  templateUrl: './admin-assets-records.page.html',
  styleUrls: ['./admin-assets-records.page.scss'],
  standalone: false
})
export class AdminAssetsRecordsPage implements OnInit {
  assetList: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];

  goodCount: number = 0;
  badCount: number = 0;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.refreshData();
  }

  async refreshData() {
    this.isLoading = true;
    this.loadAssets(this.filterFrom, this.filterTo);
  }

  loadAssets(from?: string, to?: string) {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    if (!companyId) {
      this.isLoading = false;
      return;
    }

    // Use analytics endpoint when date filter is active (it supports date range)
    // Otherwise use the plain asset-list endpoint
    const obs = (from && to)
      ? this.dataService.getAssetsAnalytics(companyId, from, to)
      : this.dataService.getAssets(companyId);

    obs.subscribe({
      next: (res: any) => {
        // Handle various response shapes from the backend
        let raw = res?.data || res?.assets || res || [];
        if (!Array.isArray(raw)) {
          raw = Object.values(raw).filter((v: any) => v && typeof v === 'object');
        }

        this.assetList = raw;
        this.computeCounts();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch assets', err);
        this.isLoading = false;
      }
    });
  }

  computeCounts() {
    const goodStatuses = ['good', 'operational', 'working', 'ok', 'active', 'available'];
    this.goodCount = this.assetList.filter(a => {
      const s = (a.status || a.condition || '').toLowerCase();
      return goodStatuses.some(g => s.includes(g));
    }).length;
    this.badCount = this.assetList.length - this.goodCount;
  }

  getStatusClass(status: string): string {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (['good', 'operational', 'working', 'ok', 'active', 'available'].some(g => s.includes(g))) {
      return 'success';
    }
    return 'pending';
  }

  viewDetails(asset: any) {
    this.navCtrl.navigateForward(['/home/assets-details'], {
      state: { data: asset }
    });
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.isLoading = true;
    this.loadAssets(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilter();
  }

  goBack() {
    this.navCtrl.back();
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
