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

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';

  goodCount: number = 0;
  badCount: number = 0;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.loadHierarchy();
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
    const obs = (from && to)
      ? this.dataService.getAssetsAnalytics(companyId, from, to)
      : this.dataService.getAssets(companyId);

    obs.subscribe({
      next: (res: any) => {
        let raw = res?.data || res?.assets || res || [];
        if (!Array.isArray(raw)) {
          raw = Object.values(raw).filter((v: any) => v && typeof v === 'object');
        }

        const now = new Date();
        const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayDMY = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

        this.assetList = raw.filter((a: any) => {
          // 1. Date Filter (if no range set, default to today)
          let matchesDate = true;
          if (!from && !to) {
            const aDate = a.created_at || a.date_time || a.date || '';
            matchesDate = !!(aDate && (aDate.includes(todayYMD) || aDate.includes(todayDMY)));
          }

          // 2. Hierarchy Filter
          const rBeat = (a.beat_name || a.site_name || a.location || '').toLowerCase();
          const beatObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
          const rRange = beatObj ? beatObj.parentName : 'General Range';
          
          const matchesRange = this.selectedRange === 'all' || rRange === this.selectedRange;
          const matchesBeat = this.selectedBeat === 'all' || rBeat === this.selectedBeat.toLowerCase();

          return matchesDate && matchesRange && matchesBeat;
        });

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

  loadHierarchy() {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? (user.company_id || user.companyId) : '1';

    this.dataService.getHierarchyForFilters(companyId.toString()).subscribe({
      next: (h) => {
        this.allRanges = h.ranges;
        this.allBeats = h.beats;
        this.updateVisibleBeats();
      },
      error: (err) => console.error('❌ Hierarchy fetch failed:', err)
    });
  }

  updateVisibleBeats() {
    if (this.selectedRange === 'all') {
      this.displayBeats = Array.from(new Set(this.allBeats.map(b => b.name))).sort();
    } else {
      this.displayBeats = this.allBeats
        .filter(b => b.parentName === this.selectedRange)
        .map(b => b.name)
        .sort();
    }
  }

  onRangeFilterChange() {
    this.selectedBeat = 'all';
    this.updateVisibleBeats();
    this.refreshData();
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
    this.selectedRange = 'all';
    this.selectedBeat = 'all';
    this.updateVisibleBeats();
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
