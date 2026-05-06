import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HierarchyService } from 'src/app/services/hierarchy.service';

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
  attendedCount: number = 0;

  // Hierarchy Filters
  public allRanges: string[] = [];
  public allBeats: any[] = [];
  public displayBeats: string[] = [];
  public selectedRange: string = 'all';
  public selectedBeat: string = 'all';
  public isFilterModalOpen: boolean = false;
  public filterFrom: string = '';
  public filterTo: string = '';
  public maxDate: string = new Date().toISOString().split('T')[0];


  constructor(
    private router: Router,
    private navCtrl: NavController,
    private dataService: DataService,
    private hierarchyService: HierarchyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;

    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;
    
    this.loadHierarchy();
    this.loadOfficers();
  }

  loadOfficers() {
    this.isLoading = true;
    console.log('DEBUG [Officers]: loadOfficers started for Company:', this.myCompanyId);
    this.cdr.detectChanges();

    const companyIdStr = this.myCompanyId.toString();

    forkJoin({
      logs: this.dataService.getAttendanceLogsByRanger(companyIdStr).pipe(catchError(() => of([]))),
      requests: this.dataService.getAttendanceRequests(companyIdStr).pipe(catchError(() => of([]))),
      onsite: this.dataService.getGuardsOnSite(companyIdStr).pipe(catchError(() => of([]))),
      allUsersPHP: this.dataService.getAssignableUsers({ company_id: companyIdStr }).pipe(catchError(() => of([]))),
      allUsersNode: this.hierarchyService.getRangers(this.myCompanyId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res: any) => {
        console.log('DEBUG [Officers]: API Response received');
        
        const getArr = (obj: any) => {
          if (Array.isArray(obj)) return obj;
          if (!obj) return [];
          const list = obj.data || obj.users || obj.attendance || obj.requests || obj.requests_list || obj.items || obj.logs || obj.result;
          if (Array.isArray(list)) return list;
          return [];
        };

        const logsArray = getArr(res.logs);
        const reqArray = getArr(res.requests);
        const onsiteArray = getArr(res.onsite);
        const phpUsers = getArr(res.allUsersPHP);
        const nodeUsers = getArr(res.allUsersNode);

        console.log('DEBUG [Officers]: PHP Users:', phpUsers.length, 'Node Users:', nodeUsers.length);

        const nowL = new Date();
        const todayYMD = `${nowL.getFullYear()}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${String(nowL.getDate()).padStart(2, '0')}`;
        const todayISO = nowL.toISOString().split('T')[0];

        const attendedOfficerIds = new Set<string>();
        const attendanceDetailsMap = new Map<string, any>();

        const processAttendance = (record: any) => {
          const rDate = (record.timestamp || record.entryDateTime || record.created_at || record.date || '').toString();
          if (!rDate) return;

          let isMatch = rDate.includes(todayYMD) || rDate.includes(todayISO);
          if (this.filterFrom && this.filterTo) {
            const rTS = new Date(rDate).getTime();
            const fromTS = new Date(this.filterFrom).setHours(0, 0, 0, 0);
            const toTS = new Date(this.filterTo).setHours(23, 59, 59, 999);
            isMatch = rTS >= fromTS && rTS <= toTS;
          }

          const status = String(record.status || '').toLowerCase();
          const isRejected = status === 'rejected' || status === 'failed';

          if (isMatch && !isRejected) {
            const uId = (record.guard_id || record.guardId || record.user_id || record.userId || record.staff_id || record.ranger_id || '').toString();
            if (uId) {
              attendedOfficerIds.add(uId);
              if (!attendanceDetailsMap.has(uId)) {
                attendanceDetailsMap.set(uId, {
                  site_name: record.site_name || record.geo_name || record.beat_name || record.location_name || '',
                  photo: record.photo || record.profile_pic || record.profile_Pic || record.image || record.avatar || ''
                });
              }
            }
          }
        };

        logsArray.forEach(processAttendance);
        reqArray.forEach(processAttendance);
        onsiteArray.forEach(processAttendance);

        // Map Node Users by ID for quick photo lookup
        const nodePhotoMap = new Map<string, string>();
        nodeUsers.forEach((u: any) => {
          const uId = (u.id || u.user_id || u.staff_id || u.ranger_id || u.guard_id || '').toString();
          const photo = u.profile_pic || u.profile_Pic || u.image || u.photo || u.profile_image || u.avatar || u.user_photo || '';
          if (uId && photo) nodePhotoMap.set(uId, photo);
        });

        const officersMap = new Map<string, any>();

        // Step 1: Use PHP Users as the Master List (The full 15 people)
        phpUsers.forEach((user: any) => {
          const uId = (user.id || user.user_id || user.staff_id || user.ranger_id || user.guard_id || '').toString();
          if (!uId) return;

          const hasAttended = attendedOfficerIds.has(uId);
          const attDetails = attendanceDetailsMap.get(uId);
          
          // Enrich with photo from Node if missing in PHP
          const photoRaw = user.profile_pic || user.profile_Pic || user.profilePic || 
                           user.photo || user.image || user.profile_image || 
                           user.avatar || user.user_photo || nodePhotoMap.get(uId) || attDetails?.photo || '';

          officersMap.set(uId, {
            ...user,
            id: uId,
            name: user.name || user.full_name || user.guard_name || user.user_name || user.ranger_name || 'Officer',
            role: this.getRoleName(user.role_id || user.roleId),
            site_name: attDetails?.site_name || user.site_name || user.beat_name || user.geo_name || '',
            company_name: user.company_name || (user.company ? user.company.name : '') || '',
            photo: this.getPhotoUrl(photoRaw),
            dutyStatus: hasAttended ? 'On Duty' : 'Off Duty',
            hasAttended: hasAttended
          });
        });

        this.allOfficers = Array.from(officersMap.values());
        console.log('DEBUG [Officers]: Final Merged List size:', this.allOfficers.length);

        this.allOfficers.sort((a, b) => {
          if (a.hasAttended && !b.hasAttended) return -1;
          if (!a.hasAttended && b.hasAttended) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });

        this.filteredOfficers = [...this.allOfficers];
        this.totalCount = this.allOfficers.length;
        this.attendedCount = this.allOfficers.filter(o => o.hasAttended).length;
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('DEBUG [Officers]: API Error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchMissingPhoto(officer: any, index: number) {
    this.dataService.getRangerProfile(officer.id).subscribe({
      next: (profileRes: any) => {
        const profile = profileRes.data || profileRes;
        const photoRaw = profile.profile_pic || profile.profile_Pic || profile.image || profile.photo || profile.profile_image || profile.avatar || profile.user_photo || profile.profilePic;
        if (photoRaw && photoRaw !== 'null') {
          const finalPhoto = this.getPhotoUrl(photoRaw);
          if (finalPhoto) {
            this.allOfficers[index].photo = finalPhoto;
            // Also update filtered list if visible
            const fIndex = this.filteredOfficers.findIndex(o => o.id === officer.id);
            if (fIndex > -1) this.filteredOfficers[fIndex].photo = finalPhoto;
            
            this.cdr.detectChanges();
          }
        }
      }
    });
  }

  onSearch() {
    const term = (this.searchText || '').toLowerCase().trim();
    
    this.filteredOfficers = this.allOfficers.filter(o => {
      // 1. Text Search
      const matchesSearch = !term || 
        (o.name || '').toLowerCase().includes(term) ||
        (o.role || '').toLowerCase().includes(term) ||
        (o.site_name || '').toLowerCase().includes(term);

      // 2. Range Filter
      const siteBeat = (o.site_name || o.beat_name || '').toLowerCase();
      
      // We need to find the range for this officer's beat
      const officerBeatObj = this.allBeats.find((b: any) => b.name.toLowerCase() === siteBeat);
      const officerRange = officerBeatObj ? officerBeatObj.parentName : 'General Range';

      const matchesRange = this.selectedRange === 'all' || officerRange === this.selectedRange;

      // 3. Beat Filter
      const matchesBeat = this.selectedBeat === 'all' || siteBeat === this.selectedBeat.toLowerCase();

      return matchesSearch && matchesRange && matchesBeat;
    });

    this.totalCount = this.filteredOfficers.length;
    this.cdr.detectChanges();
  }

  loadHierarchy() {
    const companyId = this.myCompanyId || '1';
    this.dataService.getHierarchyForFilters(companyId.toString()).subscribe({
      next: (h) => {
        this.allRanges = h.ranges;
        this.allBeats = h.beats;
        this.updateVisibleBeats();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('❌ Hierarchy fetch failed:', err)
    });
  }

  updateVisibleBeats() {
    if (this.selectedRange === 'all') {
      this.displayBeats = Array.from(new Set(this.allBeats.map((b: any) => b.name))).sort();
    } else {
      this.displayBeats = this.allBeats
        .filter((b: any) => b.parentName === this.selectedRange)
        .map((b: any) => b.name)
        .sort();
    }
  }

  onRangeFilterChange() {
    this.selectedBeat = 'all';
    this.updateVisibleBeats();
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
    this.cdr.detectChanges();
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.loadOfficers(); // Fetch new data if dates changed
  }

  resetFilter() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.selectedRange = 'all';
    this.selectedBeat = 'all';
    this.searchText = '';
    this.updateVisibleBeats();
    this.applyFilter();
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
    
    let url = '';
    if (typeof photoPath === 'string') {
      url = photoPath.trim();
      // Handle JSON strings if the backend sends them as arrays
      if (url.startsWith('[') || url.startsWith('"{')) {
        try {
          const parsed = JSON.parse(url.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            url = parsed[0].photo || parsed[0].url || parsed[0].path || parsed[0] || '';
          } else if (typeof parsed === 'object' && parsed !== null) {
            url = parsed.photo || parsed.url || parsed.path || '';
          }
        } catch (e) {
          console.warn('Failed to parse photo JSON:', url);
        }
      }
    } else if (typeof photoPath === 'object' && photoPath !== null) {
      url = photoPath.photo || photoPath.url || photoPath.path || '';
    }

    if (!url || typeof url !== 'string' || url.length < 5) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    
    // Clean leading slashes
    let cleaned = url.replace(/^\/+/, '');
    
    // If it contains the domain but no protocol
    if (cleaned.includes('fms.pugarch.in')) {
      return `https://${cleaned.replace('https://', '').replace('http://', '')}`;
    }

    // Logic aligned with login.page.ts for production consistency
    if (!cleaned.includes('/')) {
      // It's just a filename like '1234.png'
      return `https://fms.pugarch.in/public/profilepics/${cleaned}`;
    } else {
      // It has some path but no domain
      return `https://fms.pugarch.in/public/${cleaned}`;
    }
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
