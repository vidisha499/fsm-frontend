import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

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

    // Fetch all reports to ensure consistency with Admin dashboard
    this.dataService.getForestReports().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        
        // Robust Client-Side Filtering matching Admin Page logic
        this.submittedReports = data.filter((r: any) => {
          const cat = (r.category || '').toLowerCase();
          const isFire = cat.includes('fire');
          
          if (!isFire) return false;

          // Date Filter logic
          if (from && to) {
            const rDate = r.created_at || r.date || r.date_time || '';
            if (!rDate) return false;
            const rTimestamp = new Date(rDate).getTime();
            const fromTS = new Date(from).getTime();
            const toTS = new Date(to).getTime() + (24 * 60 * 60 * 1000); // include full 'to' day
            return rTimestamp >= fromTS && rTimestamp <= toTS;
          }
          return true;
        }).map((r: any) => this.processPhotos(r));
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch fire records', err);
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
