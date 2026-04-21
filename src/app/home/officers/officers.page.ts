import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

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

    // Reverted to getAssignableUsers as per user request
    this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).subscribe({
      next: (res: any) => {
        const staffList = res.data || res || [];

        // Now fetch today's attendance
        this.dataService.getAttendanceLogsByRanger(this.myCompanyId.toString()).subscribe({
          next: (attRes: any) => {
            const logsArray = attRes.data || attRes.attendance || (Array.isArray(attRes) ? attRes : []);

            // Build set of user IDs who attended today
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
              
              // More comprehensive field check
              const photoRaw = u.profile_pic || u.profile_Pic || u.image || u.photo || u.profile_image || u.avatar || u.user_photo || u.profilePic;
              
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
          }
        });
      },
      error: (err) => {
        console.error('Error loading officers:', err);
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
