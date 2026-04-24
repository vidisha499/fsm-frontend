import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { forkJoin, of } from 'rxjs';
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

  // Attendance tracking
  todayAttendanceIds: Set<any> = new Set();

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

    // First fetch attendance logs to determine who is on duty today
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Use forkJoin to fetch from multiple endpoints to guarantee photo availability
    forkJoin({
      staff: this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).pipe(catchError(() => of([]))),
      attendance: this.dataService.getAttendanceLogsByRanger(this.myCompanyId.toString()).pipe(catchError(() => of([]))),
      guards: this.dataService.getGuardsOnSite().pipe(catchError(() => of([]))),
      guardAtt: this.dataService.getGuardAttendance().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res: any) => {
        const staffList = res.staff.data || res.staff.users || res.staff || [];
        const logsArray = res.attendance.data || res.attendance.attendance || (Array.isArray(res.attendance) ? res.attendance : []);
        const guardsList = res.guards.data || res.guards.guards || res.guards || [];
        const guardAttList = res.guardAtt.data || res.guardAtt.attendance || res.guardAtt || [];

        // Add debug logs to see what the APIs actually returned
        console.log('--- DEBUG: PROFILE PHOTO APIs ---');
        console.log('1. getAssignableUsers (Staff List) count:', staffList.length);
        if (staffList.length > 0) console.log('Sample Staff:', staffList[0]);
        
        console.log('2. getGuardsOnSite count:', guardsList.length);
        if (guardsList.length > 0) console.log('Sample Guard:', guardsList[0]);
        
        console.log('3. getGuardAttendance count:', guardAttList.length);
        if (guardAttList.length > 0) console.log('Sample GuardAtt:', guardAttList[0]);
        console.log('---------------------------------');

        // Build set of user IDs who attended today
        this.todayAttendanceIds.clear();
        logsArray.forEach((log: any) => {
          const lDate = log.timestamp || log.entryDateTime || log.created_at || '';
          if (lDate && lDate.includes(todayYMD)) {
            this.todayAttendanceIds.add(log.user_id || log.staff_id || log.ranger_id);
          }
        });

        // Map officers with duty status
        this.allOfficers = staffList.map((u: any) => {
          const id = u.id || u.user_id;
          const hasAttended = this.todayAttendanceIds.has(id);
          
          const matchingGuard = guardsList.find((g: any) => g.id == id || g.user_id == id || g.staff_id == id) || {};
          const matchingGuardAtt = guardAttList.find((c: any) => c.id == id || c.user_id == id || c.guard_id == id || c.staff_id == id) || {};
          
          // More comprehensive field check including fallback sources
          const photoRaw = u.profile_pic || u.profile_Pic || u.image || u.photo || u.profile_image || u.avatar || u.user_photo || u.profilePic ||
                           matchingGuard.profile_pic || matchingGuard.photo || matchingGuard.image || matchingGuard.avatar ||
                           matchingGuardAtt.profile_pic || matchingGuardAtt.photo || matchingGuardAtt.image || matchingGuardAtt.avatar;
          
          if (id === staffList[0]?.id || id === staffList[0]?.user_id) {
             console.log(`DEBUG: Mapping first user (ID: ${id}) -> photoRaw determined as:`, photoRaw);
             console.log(`DEBUG: matchingGuard object:`, matchingGuard);
          }
          
          return {
            ...u,
            id: id,
            name: u.name || u.full_name || u.first_name || 'Staff',
            role: u.role_name || u.designation || this.getRoleName(u.role_id),
            site_name: u.site_name || u.beat_name || u.range_name || '',
            photo: this.getPhotoUrl(photoRaw),
            dutyStatus: hasAttended ? 'On Duty' : 'No Show',
            hasAttended: hasAttended
          };
        });

        // Sort: On Duty first, then No Show
        this.allOfficers.sort((a, b) => {
          if (a.hasAttended && !b.hasAttended) return -1;
          if (!a.hasAttended && b.hasAttended) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });

        this.filteredOfficers = [...this.allOfficers];
        this.totalCount = this.allOfficers.length;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading officers:', err);
        // Fallback if forkJoin entirely fails
        this.isLoading = false;
        this.cdr.detectChanges();
      }
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
    this.router.navigate(['/home/officer-details', officer.id]);
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
