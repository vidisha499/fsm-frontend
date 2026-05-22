import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HierarchyService } from 'src/app/services/hierarchy.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.page.html',
  styleUrls: ['./user-list.page.scss'],
  standalone: false
})
export class UserListPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  category: string = '';
  categoryTitle: string = '';
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  isLoading: boolean = true;
  searchText: string = '';
  myCompanyId: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private dataService: DataService,
    private hierarchyService: HierarchyService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.category = params['category'] || '';
      this.setCategoryTitle();
      this.initData();
    });
  }

  setCategoryTitle() {
    switch (this.category) {
      case 'acf': this.categoryTitle = 'ACF Users'; break;
      case 'ranger': this.categoryTitle = 'Ranger Users'; break;
      case 'forest_guard': this.categoryTitle = 'Forest Guard Users'; break;
      case 'unassigned': this.categoryTitle = 'Unassigned Users'; break;
      default: this.categoryTitle = 'Users';
    }
  }

  initData() {
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    const companyIdStr = this.myCompanyId.toString();

    /*
    // --- COMMENTED OUT LEGACY APIS AS REQUESTED BY USER'S SIR ---
    if (this.category === 'acf') {
      this.dataService.getAdminList(companyIdStr).pipe(
        catchError(() => of([]))
      ).subscribe({
        next: (res: any) => {
          const users = Array.isArray(res) ? res : (res.data || []);
          this.allUsers = users.map((u: any) => {
            const id = String(u.id || u.user_id || u.staff_id || u.ranger_id || '');
            const status = (u.attendance_status || u.status || '').toLowerCase();
            const roleId = u.role_id || u.role || (u.role ? u.role.id : '2'); // Default to Admin/ACF role
            let rName = u.role_name || this.getRoleName(roleId);
            if (!rName || rName === 'Staff') {
              rName = 'Admin'; // Ensure role name matches the ACF category filter
            }
            return {
              ...u,
              id: id,
              name: u.name || u.user_name || u.full_name || 'Admin User',
              role_id: roleId,
              role_name: rName,
              photo: this.getPhotoUrl(u.profile_pic || u.image || u.photo || ''),
              attendance_status: status,
              hasAttended: status === 'present' || status === 'attended' || status === 'online' || u.hasAttended === true || u.is_attended === 1
            };
          });

          this.applyCategoryFilter();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // For other categories, load via unified forkJoin
      forkJoin({
        allUsersGeneric: this.dataService.getUsersByCompany(companyIdStr).pipe(catchError(() => of([]))),
        allUsersProduction: this.dataService.getRangersByCompany(companyIdStr).pipe(catchError(() => of([]))),
        allUsersPHP: this.dataService.getAssignableUsers({ company_id: companyIdStr }).pipe(catchError(() => of([]))),
        allUsersNode: this.hierarchyService.getRangers(this.myCompanyId).pipe(catchError(() => of([]))),
        v2Subordinates: this.dataService.listV2Subordinates().pipe(catchError(() => of([])))
      }).subscribe({
        next: (res: any) => {
          const getArr = (obj: any) => {
            if (Array.isArray(obj)) return obj;
            if (!obj) return [];
            const list = obj.data || obj.users || obj.rangers || obj.staff || obj.subordinates || obj.result || obj.guards || obj.supervisor;
            return Array.isArray(list) ? list : [];
          };

          const generic = getArr(res.allUsersGeneric);
          const production = getArr(res.allUsersProduction);
          const php = getArr(res.allUsersPHP);
          const node = getArr(res.allUsersNode);
          const v2Sub = getArr(res.v2Subordinates);

          // Unified list with de-duplication by ID
          const unifiedMap = new Map();
          const allSources = [...production, ...node, ...generic, ...v2Sub, ...php];

          allSources.forEach((u: any) => {
            const id = String(u.id || u.user_id || u.staff_id || u.ranger_id || u.guard_id || '');
            if (id && !unifiedMap.has(id)) {
              const status = (u.attendance_status || u.status || '').toLowerCase();
              const roleId = u.role_id || u.role || (u.role ? u.role.id : '');
              const resolvedRoleName = u.role_name || this.getRoleName(roleId);
              
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
          
          this.applyCategoryFilter();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
    */

    // --- INTEGRATING BEST NEW V2 USER LIST API: listV2Users ---
    this.dataService.listV2Users().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (res: any) => {
        const getArr = (obj: any) => {
          if (Array.isArray(obj)) return obj;
          if (!obj) return [];
          const list = obj.data || obj.users || obj.rangers || obj.staff || obj.subordinates || obj.result || obj.guards || obj.supervisor;
          return Array.isArray(list) ? list : [];
        };

        const users = getArr(res);

        this.allUsers = users.map((u: any) => {
          const id = String(u.id || u.user_id || u.staff_id || u.ranger_id || '');
          const status = (u.attendance_status || u.status || '').toLowerCase();
          const roleId = u.role_id || u.role || (u.role ? u.role.id : '');
          const resolvedRoleName = u.role_name || this.getRoleName(roleId);
          
          return {
            ...u,
            id: id,
            name: u.name || u.user_name || u.full_name || 'User',
            role_id: roleId,
            role_name: resolvedRoleName,
            photo: this.getPhotoUrl(u.profile_pic || u.image || u.photo || ''),
            attendance_status: status,
            hasAttended: status === 'present' || status === 'attended' || status === 'online' || u.hasAttended === true || u.is_attended === 1
          };
        });

        this.applyCategoryFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyCategoryFilter() {
    const term = this.category.toLowerCase();
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

    // Sub-search
    if (this.searchText) {
      const s = this.searchText.toLowerCase();
      this.filteredUsers = this.filteredUsers.filter(u => 
        (u.name || '').toLowerCase().includes(s) || 
        (u.phone || '').toLowerCase().includes(s)
      );
    }
  }

  onSearch() {
    this.applyCategoryFilter();
  }

  openUserDetail(user: any) {
    this.router.navigate(['/home/officer-details', user.id], { state: { officerData: user } });
  }

  goBack() {
    this.navCtrl.back();
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

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
    this.cdr.detectChanges();
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}
