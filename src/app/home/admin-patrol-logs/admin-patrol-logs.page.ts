import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-patrol-logs',
  templateUrl: './admin-patrol-logs.page.html',
  styleUrls: ['./admin-patrol-logs.page.scss'],
  standalone: false
})
export class AdminPatrolLogsPage implements OnInit {
  patrolLogs: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];
  rangers: any[] = [];

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.loadHierarchy();
    this.loadRangers();
    this.refreshData();
  }

  loadRangers() {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;
    if (!companyId) return;

    this.dataService.getAssignableUsers({ company_id: companyId.toString() }).subscribe({
      next: (res: any) => {
        this.rangers = res.data || res.users || (Array.isArray(res) ? res : []);
      },
      error: (err) => console.error('Failed to load rangers', err)
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
        
        // Client-side Hierarchy Filtering
        this.patrolLogs = rawLogs.filter((log: any) => {
          const rBeat = (log.beat_name || log.site_name || log.location || '').toLowerCase();
          const beatObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
          const rRange = beatObj ? beatObj.parentName : 'General Range';
          
          const matchesRange = this.selectedRange === 'all' || rRange === this.selectedRange;
          const matchesBeat = this.selectedBeat === 'all' || rBeat === this.selectedBeat.toLowerCase();

          return matchesRange && matchesBeat;
        }).map((log: any) => this.processPatrolLog(log));
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch patrol logs', err);
        this.isLoading = false;
      }
    });
  }

  processPatrolLog(log: any) {
    // 1. Resolve Name
    let name = log.user_name || log.ranger_name || log.full_name;
    if (!name || name === 'Unknown Officer') {
      const uId = log.user_id || log.ranger_id || log.staff_id;
      if (uId && this.rangers.length > 0) {
        const found = this.rangers.find(r => (r.id || r.user_id) == uId);
        if (found) name = found.name || found.full_name;
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

    return {
      ...log,
      displayName: name || 'Unknown Officer',
      displayPhoto: thumb,
      displayStatus: status,
      formattedDate: this.formatDate(log.start_time || log.created_at)
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
    this.selectedRange = 'all';
    this.selectedBeat = 'all';
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
}
