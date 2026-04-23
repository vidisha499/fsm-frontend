import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-officer-details',
  templateUrl: './officer-details.page.html',
  styleUrls: ['./officer-details.page.scss'],
  standalone: false
})
export class OfficerDetailsPage implements OnInit {
  officerId: any;
  officer: any = null;
  isLoading: boolean = true;
  myCompanyId: any;
  assignedSite: any = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.officerId = this.route.snapshot.paramMap.get('id');
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;

    this.loadOfficerDetails();
  }

  async loadOfficerDetails() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // --- FETCH DATA FROM MULTIPLE SOURCES FOR FULL COVERAGE ---
    this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).subscribe({
      next: (res: any) => {
        const staffList = res.data || res.users || res || [];
        let found = staffList.find((u: any) => (u.id || u.user_id || u.staff_id).toString() === this.officerId.toString());

        if (found) {
          this.mapOfficerData(found);
          this.loadAssignedSite();
        } else {
          // Try chat users if not found in assignable
          this.dataService.getChatUsers().subscribe((chatRes: any) => {
            const chatList = chatRes.data || chatRes.users || chatRes || [];
            const chatFound = chatList.find((u: any) => (u.id || u.user_id || u.staff_id).toString() === this.officerId.toString());
            if (chatFound) {
              this.mapOfficerData(chatFound);
              this.loadAssignedSite();
            } else {
              // Final fallback: try direct ranger profile if others fail to find the user
              this.dataService.getRangerProfile(this.officerId).subscribe({
                next: (profileRes: any) => {
                  const profile = profileRes.data || profileRes;
                  if (profile) this.mapOfficerData(profile);
                  else { this.isLoading = false; this.cdr.detectChanges(); }
                },
                error: () => {
                  this.isLoading = false;
                  this.cdr.detectChanges();
                }
              });
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading officer details:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  mapOfficerData(found: any) {
    const photoRaw = found.profile_pic || found.profile_Pic || found.image || found.photo || found.profile_image || found.avatar || found.user_photo || found.profilePic;
    
    this.officer = {
      ...found,
      id: found.id || found.user_id || found.staff_id,
      name: found.name || found.full_name || found.username || found.userName || 'N/A',
      emp_code: found.emp_code || found.employee_code || found.empCode || ('EG-' + (found.id || found.user_id || found.staff_id)),
      role_name: found.role_name || found.designation || found.role || this.getRoleName(found.role_id),
      email: found.email || found.email_id || found.emailId || found.user_email || found.mail || 'N/A',
      phone: found.phone || found.phone_no || found.phoneNo || found.contact || found.mobile || 'N/A',
      dob: found.dob || found.date_of_birth || found.dob_date || found.birthDate || 'N/A',
      gender: found.gender || found.sex || found.user_gender || 'N/A',
      address: found.address || found.current_address || found.location || found.residence || 'N/A',
      site_name: found.site_name || found.beat_name || found.range_name || 'N/A',
      company_name: found.company_name || 'N/A',
      created_at: found.created_at || found.joining_date || '',
      photo: photoRaw ? this.getPhotoUrl(photoRaw) : null
    };
    
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  loadAssignedSite() {
    if (!this.officer) return;
    // Try to get guard site info
    const token = localStorage.getItem('api_token');
    this.dataService.getGuardSite({ 
      guard_id: this.officerId, 
      api_token: token 
    }).subscribe({
      next: (res: any) => {
        const site = res.data || res;
        if (site && (site.site_name || site.name)) {
          this.assignedSite = {
            name: site.site_name || site.name || 'N/A',
            date_from: site.date_from || site.start_date || '',
            date_to: site.date_to || site.end_date || '',
            shift: site.shift_name || site.shift || 'General Shift',
            shift_time_from: site.shift_time_from || site.start_time || '12:00 am',
            shift_time_to: site.shift_time_to || site.end_time || '11:57 pm'
          };
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Site info not available, that's OK
      }
    });
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
    if (!name || name === 'N/A') return 'OFF';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].substring(0, 2).toUpperCase();
  }

  getRoleName(roleId: any): string {
    if (!roleId) return 'Staff';
    const id = Number(roleId);
    switch (id) {
      case 1: return 'Super Admin';
      case 2: return 'Admin';
      case 3: return 'Manager';
      case 4: return 'Forest Guard';
      case 5: return 'Forester';
      case 6: return 'Range Officer';
      default: return 'Staff Member';
    }
  }

  doRefresh() {
    this.loadOfficerDetails();
  }

  doDelete() {
    console.log('Delete officer requested for ID:', this.officerId);
    // Logic for delete can be added here
  }

  goBack() {
    this.navCtrl.back();
  }
}
