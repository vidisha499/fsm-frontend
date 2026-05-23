import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DataService } from 'src/app/data.service';
import { HierarchyService } from 'src/app/services/hierarchy.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false
})
export class UsersPage implements OnInit {
  isLoading: boolean = true;
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedFilter: string = 'all'; // Default filter shows all users
  myCompanyId: any;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private dataService: DataService,
    private hierarchyService: HierarchyService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;
    this.loadAllUsers();
  }

  goBack() {
    this.navCtrl.back();
  }

  loadAllUsers() {
    this.isLoading = true;
    const companyIdStr = this.myCompanyId.toString();

    forkJoin({
      v2Subordinates: this.dataService.listV2Subordinates().pipe(catchError(() => of([]))),
      v2Assignments: this.dataService.getMySubordinates().pipe(catchError(() => of([]))),
      v2UserList: this.dataService.getV2UserList({ paginate: false, per_page: 1000 }).pipe(catchError(() => of([]))),
      acfList: this.dataService.getAdminList(companyIdStr).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res: any) => {
        const getArr = (obj: any) => {
          if (Array.isArray(obj)) return obj;
          if (!obj) return [];
          const list = obj.data || obj.users || obj.rangers || obj.staff || obj.subordinates || obj.result || obj.guards || obj.supervisor;
          return Array.isArray(list) ? list : [];
        };

        const v2Sub = getArr(res.v2Subordinates);
        const v2Assign = getArr(res.v2Assignments);
        const v2List = getArr(res.v2UserList);
        const acf = getArr(res.acfList);

        // Unified list with de-duplication by ID
        const unifiedMap = new Map();
        const allSources = [...v2Sub, ...v2Assign, ...v2List, ...acf];

        allSources.forEach((u: any) => {
          const id = String(u.id || u.user_id || u.staff_id || u.ranger_id || u.guard_id || '');
          if (id && !unifiedMap.has(id)) {
            const status = (u.attendance_status || u.status || '').toLowerCase();
            const roleId = u.role_id || u.role || (u.role ? u.role.id : '');
            let resolvedRoleName = u.role_name || this.getRoleName(roleId);
            
            // Special rule: if the user came from getAdminList, make sure their role_name is 'Admin'
            const isAcfUser = acf.some((a: any) => String(a.id || a.user_id || '') === id);
            if (isAcfUser) {
              resolvedRoleName = 'Admin';
            }

            unifiedMap.set(id, {
              ...u,
              id: id,
              name: u.name || u.user_name || u.full_name || 'User',
              role_id: roleId,
              role_name: resolvedRoleName,
              photo: this.getPhotoUrl(u.profile_pic || u.image || u.photo || ''),
              attendance_status: status,
              hasAttended: status === 'present' || status === 'attended' || status === 'online' || u.hasAttended === true || u.is_attended === 1
            });
          }
        });

        this.allUsers = Array.from(unifiedMap.values());
        
        // Sort users alphabetically
        this.allUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.selectedFilter.toLowerCase();
    
    if (term === 'all') {
      this.filteredUsers = [...this.allUsers];
      return;
    }

    this.filteredUsers = this.allUsers.filter(u => {
      if (term === 'unassigned') {
        return !u.site_name || u.site_name === 'General Range' || u.site_name === '';
      } else if (term === 'forest_guard') {
        return (u.role_name || '').toLowerCase().includes('guard') || (u.role_name || '').toLowerCase().includes('manager');
      } else if (term === 'acf') {
        return (u.role_name || '').toLowerCase().includes('acf') || (u.role_name || '').toLowerCase().includes('admin');
      } else if (term === 'ranger') {
        return (u.role_name || '').toLowerCase().includes('ranger') || (u.role_name || '').toLowerCase().includes('officer');
      }
      return true;
    });

    this.cdr.detectChanges();
  }

  openUserDetail(user: any) {
    this.router.navigate(['/home/officer-details', user.id], { state: { officerData: user } });
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

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null') return '';
    if (String(photoPath).startsWith('http')) return photoPath;
    const cleaned = String(photoPath).replace(/^\/+/, '');
    if (!cleaned.includes('/')) return `https://fms.pugarch.in/public/profilepics/${cleaned}`;
    return `https://fms.pugarch.in/public/${cleaned}`;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
