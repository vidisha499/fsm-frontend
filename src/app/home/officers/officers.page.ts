import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-officers',
  templateUrl: './officers.page.html',
  styleUrls: ['./officers.page.scss'],
  standalone: false
})
export class OfficersPage implements OnInit {
  allOfficers: any[] = [];
  filteredOfficers: any[] = [];
  isLoading: boolean = true;
  searchText: string = '';
  myCompanyId: any;
  totalCount: number = 0;


  constructor(
    private router: Router,
    private navCtrl: NavController,
    private dataService: DataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;
    this.loadOfficers();
  }

  loadOfficers() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const companyIdStr = this.myCompanyId.toString();

    // Fetch from all attendance sources to ensure nobody is missed
    import('rxjs').then(({ forkJoin, of }) => {
      forkJoin({
        logs: this.dataService.getAttendanceLogsByRanger(companyIdStr).pipe(catchError(() => of([]))),
        requests: this.dataService.getAttendanceRequests(companyIdStr).pipe(catchError(() => of([]))),
        onsite: this.dataService.getGuardsOnSite().pipe(catchError(() => of([])))
      }).subscribe({
        next: (res: any) => {
          const getArr = (obj: any) => {
            if (Array.isArray(obj)) return obj;
            if (!obj) return [];
            const firstArray = Object.values(obj).find(v => Array.isArray(v)) as any[];
            if (firstArray) return firstArray;
            return obj.data || obj.attendance || obj.requests || obj.requests_list || obj.items || obj.logs || (Array.isArray(obj.result) ? obj.result : []);
          };

          const logsArray = getArr(res.logs);
          const reqArray = getArr(res.requests);
          const onsiteArray = getArr(res.onsite);

          const nowL = new Date();
          const todayYMD = `${nowL.getFullYear()}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${String(nowL.getDate()).padStart(2, '0')}`;
          const todayDMY = `${String(nowL.getDate()).padStart(2, '0')}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${nowL.getFullYear()}`;
          const todayISO = nowL.toISOString().split('T')[0];

          const activeOfficersMap = new Map<string, any>();

          const processRecord = (record: any) => {
            const rDate = (record.timestamp || record.entryDateTime || record.created_at || record.date || '').toString();
            if (!rDate) return;

            const isToday = rDate.includes(todayYMD) || rDate.includes(todayDMY) || rDate.includes(todayISO) || rDate.toLowerCase().includes('today');
            
            const status = String(record.status || '').toLowerCase();
            const isRejected = status === 'rejected' || status === 'failed';

            if (isToday && !isRejected) {
              const uId = record.guard_id || record.guardId || record.user_id || record.userId || record.staff_id || record.ranger_id || record.added_by || record.created_by;
              
              if (uId && !activeOfficersMap.has(uId.toString())) {
                const photoRaw = record.photo || record.profile_pic || record.profile_Pic || record.image || record.avatar || record.profile_image;
                
                activeOfficersMap.set(uId.toString(), {
                  ...record, // Keep original data for details page
                  id: uId.toString(),
                  name: record.name || record.full_name || record.guard_name || record.user_name || record.ranger_name || 'Officer',
                  role: this.getRoleName(record.role_id),
                  site_name: record.site_name || record.geo_name || record.beat_name || record.location_name || '',
                  company_name: record.company_name || (record.company ? record.company.name : '') || record.client_name || '',
                  photo: this.getPhotoUrl(photoRaw),
                  dutyStatus: 'On Duty',
                  hasAttended: true
                });
              }
            }
          };

          logsArray.forEach(processRecord);
          reqArray.forEach(processRecord);
          onsiteArray.forEach(processRecord);

          this.allOfficers = Array.from(activeOfficersMap.values());
          this.allOfficers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

          this.filteredOfficers = [...this.allOfficers];
          this.totalCount = this.allOfficers.length;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error unifying officers:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    });
  }

  onSearch() {
    const term = (this.searchText || '').toLowerCase().trim();
    if (!term) {
      this.filteredOfficers = [...this.allOfficers];
    } else {
      this.filteredOfficers = this.allOfficers.filter(o =>
        (o.name || '').toLowerCase().includes(term) ||
        (o.role || '').toLowerCase().includes(term) ||
        (o.site_name || '').toLowerCase().includes(term)
      );
    }
  }

  doRefresh() {
    this.loadOfficers();
  }

  openOfficerDetail(officer: any) {
    // Pass the full object via state so details page has all fields (photo, phone, email, etc.)
    this.router.navigate(['/home/officer-details', officer.id], { state: { officerData: officer } });
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') return '';
    
    let url = String(photoPath).trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('data:')) return url;
    
    // Clean leading slashes
    const cleaned = url.replace(/^\/+/, '');
    
    // If it contains the domain but no protocol
    if (cleaned.includes('fms.pugarch.in')) {
      return `https://${cleaned.replace('https://', '').replace('http://', '')}`;
    }

    // Try standard public path
    return `https://fms.pugarch.in/public/profilepics/${cleaned}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  getRoleName(roleId: any): string {
    const id = Number(roleId);
    switch (id) {
      case 1: return 'Super Admin';
      case 2: return 'Admin';
      case 3: return 'Manager';
      case 4: return 'Forest Guard';
      case 5: return 'Forester';
      case 6: return 'Range Officer';
      default: return 'Staff';
    }
  }
}
