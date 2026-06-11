import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-assets-records',
  templateUrl: './admin-assets-records.page.html',
  styleUrls: ['./admin-assets-records.page.scss'],
  standalone: false
})
export class AdminAssetsRecordsPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  assetList: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];
  public filterCategory: string = 'all';
  public filterCondition: string = 'all';
  public filterSearchQuery: string = '';
  public filterGuard: string = '';

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';
  public deepestFilterName: string = '';
  public hierarchyChain: string[] = [];

  goodCount: number = 0;
  badCount: number = 0;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    const gFilter = localStorage.getItem('global_date_filter') || 'today';
    const gFrom = localStorage.getItem('global_date_from');
    const gTo = localStorage.getItem('global_date_to');

    if (gFilter === 'custom' && gFrom && gTo) {
      this.filterFrom = gFrom;
      this.filterTo = gTo;
    } else if (gFilter === 'week') {
      const from = new Date(); from.setDate(from.getDate() - 7);
      this.filterFrom = from.toISOString().split('T')[0];
      this.filterTo = today;
    } else if (gFilter === 'month') {
      const from = new Date(); from.setDate(from.getDate() - 30);
      this.filterFrom = from.toISOString().split('T')[0];
      this.filterTo = today;
    } else {
      this.filterFrom = today;
      this.filterTo = today;
    }

    this.selectedRange = localStorage.getItem('global_range_filter') || 'all';
    this.selectedBeat = localStorage.getItem('global_beat_filter') || 'all';

    // Read V2 dynamic hierarchy filter from admin dashboard
    this.deepestFilterName = localStorage.getItem('global_deepest_filter_name') || '';
    try {
      this.hierarchyChain = JSON.parse(localStorage.getItem('global_hierarchy_chain') || '[]');
    } catch (e) {
      this.hierarchyChain = [];
    }

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

    const getTS = (d: any) => {
      if (!d) return 0;
      let ts = 0;
      if (typeof d === 'string') {
        const clean = d.split('T')[0].split(' ')[0].replace(/\//g, '-');
        const parts = clean.split('-');
        if (parts.length === 3) {
           if (parts[0].length === 2 && parts[2].length === 4) {
             ts = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
           } else if (parts[0].length === 4) {
             ts = new Date(clean).getTime();
           }
        }
      }
      if (!ts || isNaN(ts)) ts = new Date(d).getTime();
      return isNaN(ts) ? 0 : ts;
    };

    const obs = this.dataService.getAssets(companyId);

    obs.subscribe({
      next: (res: any) => {
        let raw = res?.data || res?.assets || res || [];
        if (!Array.isArray(raw)) {
          raw = Object.values(raw).filter((v: any) => v && typeof v === 'object');
        }

        const now = new Date();
        const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayDMY = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const today = now.toISOString().split('T')[0];

        this.assetList = raw.filter((a: any) => {
          // 1. Date Filter
          let matchesDate = true;
          const aDate = a.created_at || a.date_time || a.date || '';
          
          if (from && to) {
            if (from === today && to === today) {
              const rFullDate = aDate.toString();
              matchesDate = !!(rFullDate.includes(todayYMD) || rFullDate.includes(todayDMY) || rFullDate.includes(todayYMD.replace(/-/g, '/')) || rFullDate.includes(today) || rFullDate.includes(today.replace(/-/g, '/')));
            } else {
              const rTimestamp = getTS(aDate);
              const fromTS = new Date(from).setHours(0, 0, 0, 0);
              const toTS = new Date(to).setHours(23, 59, 59, 999);
              matchesDate = rTimestamp >= fromTS && rTimestamp <= toTS;
            }
          } else {
            // Default to today (Robust Check)
            matchesDate = !!(aDate && (aDate.includes(todayYMD) || aDate.includes(todayDMY) || aDate.includes(todayYMD.replace(/-/g, '/')) || aDate.includes(today)));
          }

          // 2. Hierarchy Filter (Bidirectional Inclusive)
          let matchesHierarchy = true;
          if (this.deepestFilterName) {
            matchesHierarchy = this.isRecordMatchingHierarchyName(a);
          } else {
            const rBeat = (a.beat_name || a.site_name || a.location || '').toLowerCase();
            const beatObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
            const rRange = (a.range_name || a.range || (beatObj ? beatObj.parentName : 'General Range')).toLowerCase();
            
            const matchesRange = this.selectedRange === 'all' || this.dataService.isNameMatching(rRange, this.selectedRange);
            const matchesBeat = this.selectedBeat === 'all' || this.dataService.isNameMatching(rBeat, this.selectedBeat);
            matchesHierarchy = matchesRange && matchesBeat;
          }

          // 📦 3. Category Filter
          let matchesCategory = true;
          if (this.filterCategory !== 'all') {
            const cat = (a.category_name || a.category || a.type || '').toLowerCase();
            matchesCategory = cat.includes(this.filterCategory.toLowerCase());
          }

          // 🛠️ 4. Condition Filter
          let matchesCondition = true;
          if (this.filterCondition !== 'all') {
            const cond = (a.status || a.condition || '').toLowerCase();
            if (this.filterCondition === 'good') {
              matchesCondition = ['good', 'operational', 'working', 'ok', 'active', 'available'].some(g => cond.includes(g));
            } else if (this.filterCondition === 'needs repair') {
              matchesCondition = cond.includes('repair') || cond.includes('bad') || cond.includes('fix');
            } else if (this.filterCondition === 'damaged') {
              matchesCondition = cond.includes('damage') || cond.includes('broken') || cond.includes('destroy');
            }
          }

          // 🔍 5. Search Query Filter
          let matchesSearch = true;
          if (this.filterSearchQuery) {
            const query = this.filterSearchQuery.trim().toLowerCase();
            const name = (a.name || a.asset_name || '').toLowerCase();
            const desc = (a.description || a.notes || '').toLowerCase();
            matchesSearch = name.includes(query) || desc.includes(query);
          }

          // 👤 6. Guard Name Filter
          let matchesGuard = true;
          if (this.filterGuard) {
            const query = this.filterGuard.trim().toLowerCase();
            const reporter = (a.added_by_name || a.ranger_name || a.officer_name || a.created_by_name || a.user_name || 'Officer').toLowerCase();
            matchesGuard = reporter.includes(query);
          }

          return matchesDate && matchesHierarchy && matchesCategory && matchesCondition && matchesSearch && matchesGuard;
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

  isRecordMatchingHierarchyName(a: any): boolean {
    const rBeat = String(a.beat_name || a.site_name || a.location || a.beat || '').toLowerCase().trim();
    const beatObj = this.allBeats?.find(b => b.name.toLowerCase() === rBeat);
    const rRange = String(a.range_name || a.range || (beatObj ? beatObj.parentName : '')).toLowerCase().trim();

    const fieldsToSearch = [
      a.beat_name, a.site_name, a.location, a.location_name,
      a.range_name, a.range, a.region, a.division_name, a.division,
      a.client_name, a.name, a.beat,
      rBeat, rRange
    ];

    if (!this.deepestFilterName) return true;
    const namesList = this.deepestFilterName.split(',').map((n: string) => n.trim().toLowerCase());
    for (const f of fieldsToSearch) {
      if (f) {
        const fLower = String(f).toLowerCase();
        if (namesList.some((n: string) => fLower.includes(n) || n.includes(fLower))) {
          return true;
        }
      }
    }

    if (this.hierarchyChain && this.hierarchyChain.length > 0) {
      const deepest = this.hierarchyChain[this.hierarchyChain.length - 1]?.toLowerCase() || '';
      if (deepest) {
        for (const f of fieldsToSearch) {
          if (f && String(f).toLowerCase().includes(deepest)) {
            return true;
          }
        }
      }
    }

    return false;
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
    this.filterCategory = 'all';
    this.filterCondition = 'all';
    this.filterSearchQuery = '';
    this.filterGuard = '';
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

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}
