import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-patrol-logs',
  templateUrl: './admin-patrol-logs.page.html',
  styleUrls: ['./admin-patrol-logs.page.scss'],
  standalone: false
})
export class AdminPatrolLogsPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  patrolLogs: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];
  rangers: any[] = [];
  public filterGuard: string = '';

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';
  public selectedPatrolType: string = 'all';
  public selectedPatrolMethod: string = 'all';
  public userRole: string = '3';
  public assignedRange: string = '';
  public assignedBeat: string = '';
  public deepestFilterName: string = '';
  public hierarchyChain: string[] = [];

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
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

    // 🚀 Load dependencies first, then fetch data
    Promise.all([
      this.loadHierarchy(),
      this.loadRangers()
    ]).then(() => {
      this.refreshData();
    });
  }

  loadRangers(): Promise<void> {
    return new Promise((resolve) => {
      const rawData = localStorage.getItem('user_data');
      const user = rawData ? JSON.parse(rawData) : null;
      const companyId = user ? Number(user.company_id || user.companyId) : 0;
      if (!companyId) return resolve();

      this.dataService.getAssignableUsers({ company_id: companyId.toString() }).subscribe({
        next: (res: any) => {
          const list = res.data || res.users || res.result || res.rangers || res.staff || res.subordinates || (Array.isArray(res) ? res : []);
          this.rangers = Array.isArray(list) ? list : [];
          resolve();
        },
        error: (err) => {
          console.error('Failed to load rangers', err);
          resolve();
        }
      });
    });
  }

  async refreshData() {
    this.isLoading = true;
    this.loadPatrolLogs(this.filterFrom, this.filterTo);
  }

  loadPatrolLogs(from?: string, to?: string) {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    if (!companyId) {
      this.isLoading = false;
      return;
    }

    // Use the specific patrol API
    this.dataService.getPatrolsByCompany(companyId, from || this.filterFrom, to || this.filterTo).subscribe({
      next: (res: any) => {
        const rawLogs = res?.data || res?.patrols || (Array.isArray(res) ? res : []);
        
        const getTS = (d: any) => {
          if (!d) return 0;
          let ts = new Date(d).getTime();
          // If suspicious or NaN, try manual swap
          if (!ts || isNaN(ts) || ts < 1577836800000) {
             const clean = d.toString().split('T')[0].split(' ')[0].replace(/\//g, '-');
             const p = clean.split('-');
             if (p.length === 3) {
                if (p[0].length === 2 && p[2].length === 4) ts = new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
                else if (p[0].length === 4) ts = new Date(clean).getTime();
             }
          }
          return isNaN(ts) ? 0 : ts;
        };

        const activeFrom = from || this.filterFrom;
        const activeTo = to || this.filterTo;
        console.log(`🔍 [PatrolFilter] Filtering logs from ${activeFrom} to ${activeTo}`);

        // Client-side Filtering (Date & Hierarchy)
        const mappedLogs = rawLogs.map((log: any) => this.processPatrolLog(log));
        const filtered = mappedLogs.filter((log: any) => {
          // Check V2 Allowed Entity IDs first (Restricted Admin / Dynamic User)
          if (!this.isRecordMatchingAllowedIds(log)) {
            return false;
          }

          const rDate = log.created_at || log.start_time || log.date || '';
          if (!rDate) return false;

          const rTimestamp = getTS(rDate);
          
          // 📅 1. Date Filter (Strict Today check aligned with Dashboard)
          let matchesDate = true;
          if (activeFrom && activeTo) {
            const today = new Date().toISOString().split('T')[0];
            const nowL = new Date();
            const todayYMD = `${nowL.getFullYear()}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${String(nowL.getDate()).padStart(2, '0')}`;
            const todayDMY = `${String(nowL.getDate()).padStart(2, '0')}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${nowL.getFullYear()}`;
            const rFullDate = rDate.toString();

            if (activeFrom === today && activeTo === today) {
              matchesDate = !!(rFullDate.includes(todayYMD) || rFullDate.includes(todayDMY) || rFullDate.includes(todayYMD.replace(/-/g, '/')) || rFullDate.includes(today) || rFullDate.includes(today.replace(/-/g, '/')));
            } else {
              const d = new Date(rTimestamp);
              const rLocalDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (activeFrom === activeTo) {
                matchesDate = rLocalDate === activeFrom;
              } else {
                const fromTS = new Date(activeFrom).setHours(0, 0, 0, 0);
                const toTS = new Date(activeTo).setHours(23, 59, 59, 999);
                matchesDate = rTimestamp >= fromTS && rTimestamp <= toTS;
              }
            }
          }

          if (!matchesDate) return false;

          // 🌲 2. Hierarchy Filter (Range & Beat)
          let matchesHierarchy = true;
          if (this.deepestFilterName) {
            matchesHierarchy = this.isRecordMatchingHierarchyName(log);
          } else {
            const rBeat = (log.beat_name || log.site_name || log.location || log.beat || log.displayBeat || '').toLowerCase();
            const beatObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
            const rRange = (log.range_name || log.range || log.displayRange || (beatObj ? beatObj.parentName : '')).toLowerCase();
            
            const matchesRange = this.selectedRange === 'all' || this.dataService.isNameMatching(rRange, this.selectedRange);
            const matchesBeat  = this.selectedBeat === 'all' || this.dataService.isNameMatching(rBeat, this.selectedBeat);
            matchesHierarchy = matchesRange && matchesBeat;
          }

          if (!matchesHierarchy) return false;

          // 🏃‍♂️ 3. Patrol Type & Method Filters
          const logType = (log.patrol_type || log.type || '').toLowerCase();
          const logMethod = (log.patrol_method || log.method || '').toLowerCase();
          
          const matchesPatrolType = this.selectedPatrolType === 'all' || logType.includes(this.selectedPatrolType.toLowerCase());
          const matchesPatrolMethod = this.selectedPatrolMethod === 'all' || logMethod.includes(this.selectedPatrolMethod.toLowerCase());

          // 👤 4. Guard Name Filter
          let matchesGuard = true;
          if (this.filterGuard) {
            const query = this.filterGuard.trim().toLowerCase();
            const uId = log.user_id || log.ranger_id || log.staff_id || log.guard_id || log.created_by;
            
            // Search in directly attached names
            const name = (log.user_name || log.ranger_name || log.full_name || log.guard_name || log.officer_name || '').toLowerCase();
            
            // Search in resolved rangers list
            let resolvedName = '';
            if (uId && this.rangers.length > 0) {
              const found = this.rangers.find(r => (r.id || r.user_id || r.staff_id) == uId);
              if (found) {
                resolvedName = (found.name || found.full_name || found.user_name || found.ranger_name || '').toLowerCase();
              }
            }
            
            matchesGuard = name.includes(query) || resolvedName.includes(query);
          }

          return matchesPatrolType && matchesPatrolMethod && matchesGuard;
        });

        this.patrolLogs = filtered
          .sort((a: any, b: any) => getTS(b.created_at || b.start_time) - getTS(a.created_at || a.start_time));
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch patrol logs', err);
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
      
      const rawSiteId = r.reporter_entity_id || r.reporter_parent_id || r.site_id || r.siteId || r.beat_id || r.entity_id || r.range_id || '';
      
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

  isRecordMatchingHierarchyName(log: any): boolean {
    const rBeat = String(log.beat_name || log.site_name || log.location || log.beat || log.displayBeat || '').toLowerCase().trim();
    const beatObj = this.allBeats?.find(b => b.name.toLowerCase() === rBeat);
    const rRange = String(log.range_name || log.range || log.displayRange || (beatObj ? beatObj.parentName : '')).toLowerCase().trim();

    const fieldsToSearch = [
      log.beat_name, log.site_name, log.location, log.location_name,
      log.range_name, log.range, log.region, log.division_name, log.division,
      log.client_name, log.name, log.beat,
      log.displayRange, log.displayBeat,
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

  processPatrolLog(log: any) {
    // 1. Resolve Name and Beat
    let name = log.user_name || log.ranger_name || log.full_name || log.guard_name || log.officer_name;
    let beatName = log.beat_name || log.site_name || log.location || log.beat;
    
    const uId = log.user_id || log.ranger_id || log.staff_id || log.guard_id || log.created_by;

    // Get the logged-in user's full profile from localStorage (has dynamic_assignment)
    const loggedInUserData = (() => {
      try { return JSON.parse(localStorage.getItem('user_data') || '{}'); } catch(e) { return {}; }
    })();
    const loggedInUserId = String(loggedInUserData?.id || loggedInUserData?.user_id || '');

    if (uId) {
      // A. If this log belongs to the logged-in user, use their cached profile directly
      if (String(uId) === loggedInUserId) {
        if (!name) name = loggedInUserData.name || loggedInUserData.full_name || loggedInUserData.user_name;
        if (!beatName) beatName = loggedInUserData.dynamic_assignment?.entity?.name || 
                                  loggedInUserData.site_name || loggedInUserData.beat_name;
      }

      // B. Try resolving from the pre-fetched rangers list
      if (!name && this.rangers.length > 0) {
        const found = this.rangers.find(r => (r.id || r.user_id || r.staff_id) == uId);
        if (found) {
          name = found.name || found.full_name || found.user_name || found.ranger_name;
        }
      }
    }
    
    // 2. Process Photos
    let thumb = null;
    let photosList: string[] = [];
    const rawPhotos = log.patrol_photos || log.patrolPhotos || log.photos || log.photo;
    
    if (Array.isArray(rawPhotos)) {
      photosList = [...rawPhotos];
    } else if (typeof rawPhotos === 'string' && rawPhotos.length > 5) {
      if (rawPhotos.startsWith('[') || rawPhotos.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawPhotos);
          if (Array.isArray(parsed)) photosList = parsed;
          else if (parsed.photo) photosList = [parsed.photo];
        } catch(e) {}
      } else {
        photosList = [rawPhotos];
      }
    }

    const validPhotos = photosList.map(url => {
      if (typeof url !== 'string') return null;
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      return `https://fms.pugarch.in/public/profilepics/patrols/${url}`;
    }).filter(p => !!p);

    if (validPhotos.length > 0) thumb = validPhotos[0];

    // 3. Determine Status
    let status = log.status || (log.end_time || log.ended_at || log.endTime ? 'completed' : 'In Progress');

    // Create the returned object first, so async callbacks can modify IT instead of the unmapped log
    const displayObj = {
      ...log,
      displayName: name || 'Unknown Officer',
      displayBeat: beatName || 'Unknown Beat',
      displayRange: log.range_name || 'Forest Range',
      displayPhoto: thumb,
      displayStatus: status,
      formattedDate: this.formatDate(log.start_time || log.created_at)
    };

    // C. If still unresolved after localStorage check, fetch from API as last resort
    if (uId && (!name || name === 'Unknown Officer' || !beatName)) {
      const cId = log.company_id || localStorage.getItem('company_id') || '0';
      this.dataService.getUserDetails(uId, cId).subscribe({
        next: (userRes: any) => {
          const u = userRes?.data || userRes;
          if (u) {
            const resolvedName = u.name || u.full_name || u.user_name || u.ranger_name || u.reporter_name;
            if (resolvedName && (!name || name === 'Unknown Officer')) {
              displayObj.displayName = resolvedName;
            }
            const resolvedBeat = u.dynamic_assignment?.entity?.name || u.site_name || u.beat_name || u.geo_name || u.location_name || u.beat;
            if (resolvedBeat && !beatName) {
              displayObj.displayBeat = resolvedBeat;
            }
            this.cdr.detectChanges();
          }
        },
        error: (err) => console.warn(`Silent fail resolving officer ${uId}:`, err)
      });
    }

    return displayObj;
  }

  loadHierarchy(): Promise<void> {
    return new Promise((resolve) => {
      const rawData = localStorage.getItem('user_data');
      const user = rawData ? JSON.parse(rawData) : null;
      const companyId = user ? (user.company_id || user.companyId) : '1';

      this.dataService.getHierarchyForFilters(companyId.toString()).subscribe({
        next: (h) => {
          this.allRanges = h.ranges;
          this.allBeats = h.beats;
          this.updateVisibleBeats();
          resolve();
        },
        error: (err) => {
          console.error('❌ Hierarchy fetch failed:', err);
          resolve();
        }
      });
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

  viewDetails(log: any) {
    this.navCtrl.navigateForward(['/home/patrol-details'], {
      state: { data: log }
    });
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.isLoading = true;
    this.loadPatrolLogs(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.selectedPatrolType = 'all';
    this.selectedPatrolMethod = 'all';
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

  formatStatus(status: string) {
    if (!status || status.toLowerCase() === 'in progress' || status.toLowerCase() === 'active') return 'In Progress';
    if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'ended' || status.toLowerCase() === 'finished') return 'Completed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}
