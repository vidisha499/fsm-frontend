import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-events-records',
  templateUrl: './admin-events-records.page.html',
  styleUrls: ['./admin-events-records.page.scss'],
  standalone: false
})
export class AdminEventsRecordsPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  submittedReports: any[] = [];
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
  public selectedType: string = 'all';
  public userRole: string = '3';
  public assignedRange: string = '';
  public assignedBeat: string = '';

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

  async refreshData() {
    this.isLoading = true;
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }

  loadSubmittedReports(from?: string, to?: string) {
    if (this.allReportsCache) {
      this.applyFiltersToCache(from, to);
      return;
    }

    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    // Fetch all reports to ensure consistency with Admin dashboard
    this.dataService.getForestReports().subscribe({
      next: (res: any) => {
        this.allReportsCache = res?.data || res || [];
        this.applyFiltersToCache(from, to);
      },
      error: (err) => {
        console.error('Failed to fetch event records', err);
        this.isLoading = false;
      }
    });
  }

  applyFiltersToCache(from?: string, to?: string) {
    if (!this.allReportsCache) return;

    // Helper for robust date parsing
    const getTS = (d: any) => {
      if (!d) return 0;
      let ts = 0;
      if (typeof d === 'string') {
        const clean = d.split(' ')[0].replace(/\//g, '-');
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

    const filtered = this.allReportsCache.filter((r: any) => {
      const cat = (r.category || '').toLowerCase();
      const rType = (r.report_type || r.event_type || r.type || '').toLowerCase();
      const combined = `${cat} ${rType}`.toLowerCase();

      const isEvent = combined.includes('event') || combined.includes('sight') || combined.includes('monit') || combined.includes('animal') || combined.includes('flora') || combined.includes('fauna');
      if (!isEvent) return false;

      // 1. Date Filter logic (Robust String-based matching)
      let matchesDate = true;
      if (from && to) {
        const rDate = r.created_at || r.date || r.date_time || r.timestamp || '';
        if (!rDate) matchesDate = false;
        else {
          // If from and to are same (Today filter), use robust string check
          const rTimestamp = getTS(rDate);
          const fromTS = new Date(from).setHours(0, 0, 0, 0);
          const toTS = new Date(to).setHours(23, 59, 59, 999);
          matchesDate = rTimestamp >= fromTS && rTimestamp <= toTS;
        }
      }

      // 2. Dynamic Type filter within category
      if (this.selectedType && this.selectedType !== 'all') {
        const typeVal = rType.replace(/[\/\s\-_]+/g, '');
        const filterVal = this.selectedType.toLowerCase().replace(/[\/\s\-_]+/g, '');
        if (!typeVal.includes(filterVal) && !filterVal.includes(typeVal)) {
          return false;
        }
      }

      return matchesDate;
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
          const rRange = String(r.displayRange || '').toLowerCase();
          const rBeat = String(r.displayBeat || '').toLowerCase();
          const filterRange = this.selectedRange.toLowerCase();
          const filterBeat = this.selectedBeat.toLowerCase();
          const matchesRange =
            this.selectedRange === 'all' ||
            rRange.includes(filterRange) ||
            filterRange.includes(rRange);
          const matchesBeat =
            this.selectedBeat === 'all' ||
            rBeat.includes(filterBeat) ||
            filterBeat.includes(rBeat);
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
    this.selectedType = 'all';
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
