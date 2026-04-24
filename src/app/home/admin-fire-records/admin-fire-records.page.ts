import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-fire-records',
  templateUrl: './admin-fire-records.page.html',
  styleUrls: ['./admin-fire-records.page.scss'],
  standalone: false
})
export class AdminFireRecordsPage implements OnInit {
  submittedReports: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.refreshData();
  }

  async refreshData() {
    this.isLoading = true;
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }

  loadSubmittedReports(from?: string, to?: string) {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    // Helper for robust date parsing
    const getTS = (d: any) => {
      if (!d) return 0;
      if (typeof d === 'string' && d.includes('-')) {
        const parts = d.split(' ')[0].split('-');
        if (parts[0].length === 2 && parts[2].length === 4) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        }
      }
      return new Date(d).getTime();
    };

    console.log(`🔥 Fetching Fire Records for Company: ${companyId} | Period: ${from} to ${to}`);

    // Mirroring Admin Dashboard Logic: Use forkJoin for Reports + Dashboard Stats for Alerts
    forkJoin({
      reports: this.dataService.getForestReports(),
      stats: this.dataService.getDashboardStats(companyId, from, to)
    }).subscribe({
      next: (res: any) => {
        console.log('✅ Reports Data:', res.reports);
        console.log('✅ Dashboard Stats Data:', res.stats);

        const reportsList = Array.isArray(res.reports) ? res.reports : (res.reports?.data || []);
        const statsData = res.stats?.data || res.stats || {};
        const alertsList = statsData.alerts || statsData.sos || [];

        const combined = [...reportsList, ...alertsList];
        console.log(`📦 Combined Pool: ${combined.length} records (${reportsList.length} reports, ${alertsList.length} alerts)`);

        this.submittedReports = combined.filter((r: any) => {
          const cat = (r.category || '').toLowerCase();
          const rType = (r.report_type || r.event_type || r.type || '').toLowerCase();
          const rDesc = (r.description || r.message || '').toLowerCase();
          
          const isFire = cat.includes('fire') || rType.includes('fire') || rDesc.includes('fire');
          if (!isFire) return false;

          // Date Filter logic (Robust String-based matching)
          if (from && to) {
            const rDate = r.created_at || r.date || r.date_time || r.timestamp || '';
            if (!rDate) return false;
            
            // If from and to are same (Today filter), use robust string check
            if (from === to) {
               const ymd = from; // YYYY-MM-DD
               const dmy = from.split('-').reverse().join('-'); // DD-MM-YYYY
               const match = rDate.includes(ymd) || rDate.includes(dmy) || rDate.includes(ymd.replace(/-/g, '/'));
               if (match) return true;
            }

            const rTimestamp = getTS(rDate);
            const fromTS = new Date(from).setHours(0, 0, 0, 0);
            const toTS = new Date(to).setHours(23, 59, 59, 999);
            
            return rTimestamp >= fromTS && rTimestamp <= toTS;
          }
          return true;
        })
        .sort((a, b) => getTS(b.created_at || b.date) - getTS(a.created_at || a.date))
        .map((r: any) => this.processPhotos(r));
        
        console.log(`🎯 Final Filtered Fire Records: ${this.submittedReports.length}`);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to fetch fire records', err);
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
}
