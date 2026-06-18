import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-fire-records',
  templateUrl: './admin-fire-records.page.html',
  styleUrls: ['./admin-fire-records.page.scss'],
  standalone: false
})
export class AdminFireRecordsPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  submittedReports: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];
  public filterSeverity: string = 'all';
  public filterGuard: string = '';

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';
  public userRole: string = '3';
  public assignedRange: string = '';
  public assignedBeat: string = '';
  public deepestFilterName: string = '';
  public hierarchyChain: string[] = [];

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.userRole = localStorage.getItem('user_role') || '3';
    
    // 🌐 Read Global Filter from Admin Dashboard
    const globalFilter = localStorage.getItem('global_date_filter') || 'today';
    const globalFrom   = localStorage.getItem('global_date_from')   || '';
    const globalTo     = localStorage.getItem('global_date_to')     || '';

    // Resolve hierarchy assignments for non-Superadmins (roles 2, 7, etc.)
    if (this.userRole !== '1') {
      const storageData = localStorage.getItem('user_data');
      if (storageData) {
        try {
          const user = JSON.parse(storageData);
          this.assignedRange = user.range_name || user.range || user.division || user.division_name || '';
          this.assignedBeat = user.site_name || user.beat_name || user.beat || '';
        } catch (e) {
          console.error("Error parsing user_data for hierarchy resolution:", e);
        }
      }
      if (!this.assignedBeat) {
        this.assignedBeat = localStorage.getItem('user_site_name') || localStorage.getItem('site_name') || '';
      }

      if (this.assignedRange) {
        this.selectedRange = this.assignedRange;
      } else {
        this.selectedRange = localStorage.getItem('global_range_filter') || 'all';
      }

      if (this.assignedBeat) {
        this.selectedBeat = this.assignedBeat;
      } else {
        this.selectedBeat = localStorage.getItem('global_beat_filter') || 'all';
      }
    } else {
      this.selectedRange = localStorage.getItem('global_range_filter') || 'all';
      this.selectedBeat = localStorage.getItem('global_beat_filter') || 'all';
    }

    // Read V2 dynamic hierarchy filter from admin dashboard
    this.deepestFilterName = localStorage.getItem('global_deepest_filter_name') || '';
    try {
      this.hierarchyChain = JSON.parse(localStorage.getItem('global_hierarchy_chain') || '[]');
    } catch (e) {
      this.hierarchyChain = [];
    }

    const today = new Date().toISOString().split('T')[0];

    if (globalFilter === 'custom' && globalFrom && globalTo) {
      this.filterFrom = globalFrom;
      this.filterTo   = globalTo;
    } else if (globalFilter === 'week') {
      const from = new Date(); from.setDate(from.getDate() - 7);
      this.filterFrom = from.toISOString().split('T')[0];
      this.filterTo   = today;
    } else if (globalFilter === 'month') {
      const from = new Date(); from.setDate(from.getDate() - 30);
      this.filterFrom = from.toISOString().split('T')[0];
      this.filterTo   = today;
    } else {
      this.filterFrom = today;
      this.filterTo   = today;
    }

    this.loadHierarchy();
    this.refreshData();
  }

  allReportsCache: any[] | null = null;
  allStatsCache: any | null = null;

  async refreshData() {
    this.isLoading = true;
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }

  loadSubmittedReports(from?: string, to?: string) {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    const statsObs = this.dataService.getDashboardStats(companyId, from, to);

    if (this.allReportsCache) {
      statsObs.subscribe({
        next: (statsRes: any) => {
          this.allStatsCache = statsRes?.data || statsRes || {};
          this.applyFiltersToCache(from, to);
        },
        error: (err) => {
          console.error('Stats fetch failed', err);
          this.isLoading = false;
        }
      });
      return;
    }

    console.log(`🔥 Fetching Fire Records for Company: ${companyId} | Period: ${from} to ${to}`);

    forkJoin({
      reports: this.dataService.getForestReports(),
      stats: statsObs
    }).subscribe({
      next: (res: any) => {
        this.allReportsCache = Array.isArray(res.reports) ? res.reports : (res.reports?.data || []);
        this.allStatsCache = res.stats?.data || res.stats || {};
        this.applyFiltersToCache(from, to);
      },
      error: (err) => {
        console.error('Failed to fetch data', err);
        this.isLoading = false;
      }
    });
  }

  applyFiltersToCache(from?: string, to?: string) {
    if (!this.allReportsCache || !this.allStatsCache) return;

    // Helper for robust date parsing
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

    const alertsList = this.allStatsCache.alerts || this.allStatsCache.sos || [];
    const combined = [...this.allReportsCache, ...alertsList];

    const filtered = combined.filter((r: any) => {
      const cat = (r.category || '').toLowerCase();
      const rType = (r.report_type || r.event_type || r.type || '').toLowerCase();
      const rDesc = (r.description || r.message || '').toLowerCase();
      
      const isFire = cat.includes('fire') || rType.includes('fire') || rDesc.includes('fire');
      if (!isFire) return false;

      // 1. Date Filter logic (Robust String-based matching)
      let matchesDate = true;
      if (from && to) {
        const rDate = r.created_at || r.date || r.date_time || r.timestamp || '';
        if (!rDate) matchesDate = false;
        else {
          const rTimestamp = getTS(rDate);
          
          const today = new Date().toISOString().split('T')[0];
          const nowL = new Date();
          const todayYMD = `${nowL.getFullYear()}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${String(nowL.getDate()).padStart(2, '0')}`;
          const todayDMY = `${String(nowL.getDate()).padStart(2, '0')}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${nowL.getFullYear()}`;
          const rFullDate = rDate.toString();
          
          if (from === today && to === today) {
            matchesDate = !!(rFullDate.includes(todayYMD) || rFullDate.includes(todayDMY) || rFullDate.includes(todayYMD.replace(/-/g, '/')) || rFullDate.includes(today) || rFullDate.includes(today.replace(/-/g, '/')));
          } else {
            const fromTS = new Date(from).setHours(0, 0, 0, 0);
            const toTS = new Date(to).setHours(23, 59, 59, 999);
            matchesDate = rTimestamp >= fromTS && rTimestamp <= toTS;
          }
        }
      }

      // 2. Severity Filter
      let matchesSeverity = true;
      if (this.filterSeverity !== 'all') {
        const severity = ((r.title || r.message || rType).toLowerCase().includes('fire') ? 'critical' : 'warning');
        const sevVal = (r.severity || severity || 'info').toLowerCase();
        matchesSeverity = sevVal.includes(this.filterSeverity.toLowerCase());
      }

      // 👤 3. Guard Name Filter
      let matchesGuard = true;
      if (this.filterGuard) {
        const query = this.filterGuard.trim().toLowerCase();
        const rReporter = (r.displayReporter || r.staff_name || r.name || r.user_name || r.reporter_name || 'Officer').toLowerCase();
        matchesGuard = rReporter.includes(query);
      }

      return matchesDate && matchesSeverity && matchesGuard;
    })
    .sort((a, b) => getTS(b.created_at || b.date) - getTS(a.created_at || a.date))
    .map((r: any) => this.processPhotos(r));

    const companyId = (() => {
      try {
        const u = JSON.parse(localStorage.getItem('user_data') || '{}');
        return u.company_id || u.companyId || localStorage.getItem('company_id') || '0';
      } catch {
        return localStorage.getItem('company_id') || '0';
      }
    })();

    this.dataService.enrichReportsWithReporterHierarchy(filtered, companyId).subscribe({
      next: (enriched) => {
        this.submittedReports = enriched.filter((r: any) => {
          // Check V2 Allowed Entity IDs first (Restricted Admin / Dynamic User)
          if (!this.isRecordMatchingAllowedIds(r)) {
            return false;
          }

          // V2 Dynamic Hierarchy Filter (takes priority)
          if (this.deepestFilterName) {
            return this.isRecordMatchingHierarchyName(r);
          }

          // Legacy range/beat filters
          const rRange = String(r.displayRange || r.range_name || r.range || '');
          const rBeat = String(r.displayBeat || r.beat_name || r.beat || r.site_name || '');
          const matchesRange =
            this.selectedRange === 'all' ||
            this.dataService.isNameMatching(rRange, this.selectedRange);
          const matchesBeat =
            this.selectedBeat === 'all' ||
            this.dataService.isNameMatching(rBeat, this.selectedBeat);
          return matchesRange && matchesBeat;
        });
        this.isLoading = false;
      },
      error: () => {
        this.submittedReports = filtered;
        this.isLoading = false;
      }
    });
  }

  isRecordMatchingAllowedIds(r: any): boolean {
    const allowedIdsStr = localStorage.getItem('global_allowed_entity_ids');
    if (!allowedIdsStr) return true;
    
    try {
      const allowedIds = JSON.parse(allowedIdsStr);
      if (!Array.isArray(allowedIds) || allowedIds.length === 0) return true;
      
      const rawSiteId = r.reporter_entity_id || r.reporter_parent_id || '';
      
      let recordIds: string[] = [];
      if (Array.isArray(rawSiteId)) {
        recordIds = rawSiteId.map(id => String(id).trim());
      } else if (rawSiteId) {
        recordIds = String(rawSiteId).split(',').map(id => id.trim());
      }
      
      if (recordIds.length > 0) {
        const matchesId = recordIds.some(id => allowedIds.includes(id));
        if (matchesId) return true;
      }
      
      // Fallback: If record has no IDs or ID matching failed, check by name matching as fallback
      const rBeat = String(r.displayBeat || r.beat_name || r.beat || r.site_name || '').toLowerCase().trim();
      const beatObj = this.allBeats?.find((b: any) => b.name.toLowerCase() === rBeat);
      const rRange = String(r.displayRange && r.displayRange !== 'Forest Range' ? r.displayRange : (r.range_name || r.range || (beatObj ? beatObj.parentName : ''))).toLowerCase().trim();
      const deepestName = localStorage.getItem('global_deepest_filter_name') || '';
      if (deepestName) {
        const names = deepestName.split(',').map(n => n.trim().toLowerCase());
        return names.some(n => rRange.includes(n) || rBeat.includes(n) || n.includes(rRange) || n.includes(rBeat));
      }
    } catch (e) {
      console.error("Error parsing allowed entity IDs:", e);
    }
    return true;
  }

  isRecordMatchingHierarchyName(r: any): boolean {
    const rBeat = String(r.beat_name || r.site_name || r.location || r.beat || r.displayBeat || '').toLowerCase().trim();
    const beatObj = this.allBeats?.find(b => b.name.toLowerCase() === rBeat);
    const rRange = String(r.range_name || r.range || r.displayRange || (beatObj ? beatObj.parentName : '')).toLowerCase().trim();

    const fieldsToSearch = [
      r.beat_name, r.site_name, r.location, r.location_name,
      r.range_name, r.range, r.region, r.division_name, r.division,
      r.client_name, r.name, r.beat,
      r.displayRange, r.displayBeat,
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

  processPhotos(report: any) {
    let thumb = null;
    let photosList: string[] = [];
    
    if (Array.isArray(report.photos)) {
      photosList = [...report.photos];
    }
    
    if (report.photo) {
      if (typeof report.photo === 'string') {
        let cleaned = report.photo.trim();
        if (cleaned.startsWith('"[') && cleaned.endsWith(']"')) {
          cleaned = cleaned.substring(1, cleaned.length - 1).replace(/\\"/g, '"');
        }
        
        if (cleaned.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
              parsed.forEach((p: any) => {
                if (p && p.photo) photosList.push(p.photo);
                else if (p && p.url) photosList.push(p.url);
                else if (p && p.path) photosList.push(p.path);
                else if (typeof p === 'string') photosList.push(p);
              });
            }
          } catch(e) {
             let stripped = cleaned.replace(/^\["?|"?]$/g, '');
             if (stripped.length > 5) photosList.push(stripped);
          }
        } else {
          photosList.push(cleaned);
        }
      } else if (Array.isArray(report.photo)) {
        report.photo.forEach((p: any) => {
          if (p && p.photo) photosList.push(p.photo);
          else if (typeof p === 'string') photosList.push(p);
        });
      }
    }

    if (photosList.length === 0 && report.report_data) {
      try {
        const rd = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
        if (rd.photo) photosList.push(rd.photo);
        if (rd.photos && Array.isArray(rd.photos)) photosList.push(...rd.photos);
        
        Object.keys(rd).forEach(key => {
          if (key.toLowerCase().includes('photo') && typeof rd[key] === 'string' && rd[key].length > 5) {
             photosList.push(rd[key]);
          }
        });
      } catch(e) {}
    }

    let validPhotos = photosList
      .filter(p => typeof p === 'string' && p.length > 5 && !p.startsWith('[') && !p.startsWith('{'))
      .map(url => {
        if (url.includes('fms.pugarch.in/profilepics/')) {
            url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/');
        }
        
        if (!url.startsWith('http') && !url.startsWith('data:')) {
            if (url.includes('patrol')) {
              return `https://fms.pugarch.in/public/profilepics/patrols/${url}`;
            }
            if (url.length < 25) {
               return `https://fms.pugarch.in/public/profilepics/${url}`;
            }
            return `https://fms.pugarch.in/public/profilepics/forest_reports/${url}`;
        }
        return url;
      });

    if (validPhotos.length > 0) {
      thumb = validPhotos[0];
    }

    return { 
      ...report, 
      displayPhoto: thumb,
      allPhotos: validPhotos,
      displayDate: report.created_at || report.createdAt || report.date_time || report.timestamp || new Date().toISOString()
    };
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

  viewDetails(report: any) {
    this.navCtrl.navigateForward(['/home/sightings-details'], {
      state: { data: report }
    });
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.isLoading = true;
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    this.filterFrom = '';
    this.filterTo = '';
    this.filterSeverity = 'all';
    this.filterGuard = '';
    if (this.userRole === '1') {
      this.selectedRange = 'all';
      this.selectedBeat = 'all';
    } else {
      this.selectedRange = this.assignedRange || 'all';
      this.selectedBeat = this.assignedBeat || 'all';
    }
    this.updateVisibleBeats();
    this.applyFilter();
  }

  goBack() {
    this.navCtrl.back();
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatTitle(str: string) {
    if (!str) return '';
    return str.replace(/_/g, ' ').toUpperCase();
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}
