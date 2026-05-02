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
    this.cdr.detectChanges();

    const companyIdStr = this.myCompanyId.toString();

<<<<<<< Updated upstream
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
=======
    // Reverting to getAssignableUsers as per user's "Sir's API" preference
    this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).subscribe({
      next: (res: any) => {
        const staffList = res.data || res || [];
>>>>>>> Stashed changes

          const logsArray = getArr(res.logs);
          const reqArray = getArr(res.requests);
          const onsiteArray = getArr(res.onsite);

<<<<<<< Updated upstream
          const nowL = new Date();
          const todayYMD = `${nowL.getFullYear()}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${String(nowL.getDate()).padStart(2, '0')}`;
          const todayDMY = `${String(nowL.getDate()).padStart(2, '0')}-${String(nowL.getMonth() + 1).padStart(2, '0')}-${nowL.getFullYear()}`;
          const todayISO = nowL.toISOString().split('T')[0];

          const activeOfficersMap = new Map<string, any>();

          const processRecord = (record: any) => {
            const rDate = (record.timestamp || record.entryDateTime || record.created_at || record.date || '').toString();
            if (!rDate) return;

            let isMatch = false;
            if (this.filterFrom && this.filterTo) {
              const rTS = new Date(rDate).getTime();
              const fromTS = new Date(this.filterFrom).setHours(0,0,0,0);
              const toTS = new Date(this.filterTo).setHours(23,59,59,999);
              isMatch = rTS >= fromTS && rTS <= toTS;
            } else {
              isMatch = rDate.includes(todayYMD) || rDate.includes(todayDMY) || rDate.includes(todayISO) || rDate.toLowerCase().includes('today');
            }
            
            const status = String(record.status || '').toLowerCase();
            const isRejected = status === 'rejected' || status === 'failed';

            if (isMatch && !isRejected) {
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
=======
            console.log('DEBUG: Full Data for First 3 Officers:', staffList.slice(0, 3));
            
            // Build set of user IDs who attended today
            logsArray.forEach((log: any) => {
              const lDate = log.timestamp || log.entryDateTime || log.created_at || '';
              if (lDate && lDate.includes(todayYMD)) {
                this.todayAttendanceIds.add(log.user_id || log.staff_id || log.ranger_id);
>>>>>>> Stashed changes
              }
            }
          };

<<<<<<< Updated upstream
          logsArray.forEach(processRecord);
          reqArray.forEach(processRecord);
          onsiteArray.forEach(processRecord);
=======
            // Get current user ID to handle "Self Photo" fallback
            const currentUserId = localStorage.getItem('ranger_id');

            // Map officers with duty status
            this.allOfficers = staffList.map((u: any) => {
              const id = (u.id || u.user_id || '').toString();
              const hasAttended = this.todayAttendanceIds.has(id);
              
              // 1. Extract raw photo from API (with EXHAUSTIVE fallback)
              let photoRaw = u.profile_pic || u.profile_Pic || u.image || u.photo || u.profile_image || u.avatar || u.user_photo || u.profilePic || 
                             u.user?.profile_pic || u.user?.profile_Pic || u.user?.image || u.user?.photo || u.user?.avatar ||
                             u.pic || u.profile_picture || u.thumbnail || u.user_image;
              
              // 2. Self-Photo Fallback: If this is ME, and API photo is missing, use my local session photo
              if ((!photoRaw || photoRaw === 'null') && id === currentUserId) {
                photoRaw = localStorage.getItem('user_photo');
              }

              // 3. Cached-Photo Fallback: Check if we have a locally cached photo for this contact number
              const contact = u.contact || u.phone || u.mobile;
              if ((!photoRaw || photoRaw === 'null') && contact) {
                const cached = localStorage.getItem(`cached_photo_${contact}`);
                if (cached) photoRaw = cached;
              }

              const finalPhoto = this.getPhotoUrl(photoRaw);
              
              return {
                ...u,
                id: id,
                name: u.name || u.full_name || u.first_name || 'Staff',
                role: u.role_name || u.designation || this.getRoleName(u.role_id),
                site_name: u.site_name || u.beat_name || u.range_name || '',
                photo: finalPhoto,
                dutyStatus: hasAttended ? 'On Duty' : 'No Show',
                hasAttended: hasAttended
              };
            });
>>>>>>> Stashed changes

          this.allOfficers = Array.from(activeOfficersMap.values());
          this.allOfficers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

<<<<<<< Updated upstream
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
=======
            this.filteredOfficers = [...this.allOfficers];
            this.totalCount = this.allOfficers.length;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            // If attendance fetch fails, still show officers but all as "No Show"
            this.allOfficers = staffList.map((u: any) => {
              const id = u.id || u.user_id;
              const photoRaw = u.profile_pic || u.profile_Pic || u.image || u.photo || u.profile_image || u.avatar || u.user_photo || u.profilePic;
              return {
                ...u,
                id: id,
                name: u.name || u.full_name || u.first_name || 'Staff',
                role: u.role_name || u.designation || this.getRoleName(u.role_id),
                site_name: u.site_name || u.beat_name || u.range_name || '',
                photo: this.getPhotoUrl(photoRaw),
                dutyStatus: 'No Show',
                hasAttended: false
              };
            });

            this.filteredOfficers = [...this.allOfficers];
            this.totalCount = this.allOfficers.length;
            this.isLoading = false;
            this.cdr.detectChanges();

            // 🔥 Progressive Fetch Fallback
            this.allOfficers.forEach((officer, index) => {
              if (!officer.photo || officer.photo === '') {
                this.fetchMissingPhoto(officer, index);
              }
            });
          }
        });
      },
      error: (err) => {
        console.error('Error loading officers:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
>>>>>>> Stashed changes
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

    // Fix for absolute URLs that are missing '/public/'
    if (url.includes('fms.pugarch.in/profilepics/') && !url.includes('/public/')) {
        url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/');
    }

    if (url.startsWith('http')) return url;
    if (url.startsWith('data:')) return url;
    
    // Clean leading slashes
    const cleaned = url.replace(/^\/+/, '');
    
    // If it contains the domain but no protocol
    if (cleaned.includes('fms.pugarch.in')) {
      return `https://${cleaned.replace('https://', '').replace('http://', '')}`;
    }

    // If it already has a directory path
    if (cleaned.includes('/')) {
      return `https://fms.pugarch.in/public/${cleaned}`;
    }

    // Fallback for filenames
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
