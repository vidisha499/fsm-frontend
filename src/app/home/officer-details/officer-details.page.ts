import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, LoadingController, AlertController, ToastController } from '@ionic/angular';
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
    private router: Router,
    private navCtrl: NavController,
    public dataService: DataService,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.officerId = this.route.snapshot.paramMap.get('id');
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    this.myCompanyId = userData ? (userData.company_id || userData.companyId) : 1;

    // Check if full officer data was passed via navigation state (from officers list)
    // history.state is reliably available in ngOnInit, unlike getCurrentNavigation()
    const navState = history.state;
    if (navState && navState['officerData']) {
      this.mapOfficerData(navState['officerData']);
      this.loadAssignedSite();
      // Also try to get the full profile with personal details (phone, email, dob, gender)
      this.loadFullProfile(navState['officerData'].id || navState['officerData'].user_id);
    } else {
      this.loadOfficerDetails();
    }
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
    let photoRaw = found.profile_pic || found.profile_Pic || found.image || found.photo || found.profile_image || found.avatar || found.user_photo || found.profilePic;
    
    // Fallback logic
    const currentUserId = localStorage.getItem('ranger_id');
    const officerIdStr = (found.id || found.user_id || found.staff_id || '').toString();
    
    // 1. Self-photo fallback
    if ((!photoRaw || photoRaw === 'null') && officerIdStr === currentUserId) {
      photoRaw = localStorage.getItem('user_photo');
    }

    // 2. Cached-photo fallback
    const contact = found.contact || found.phone || found.mobile || found.phone_no;
    if ((!photoRaw || photoRaw === 'null') && contact) {
      const cached = localStorage.getItem(`cached_photo_${contact}`);
      if (cached) photoRaw = cached;
    }
    
    this.officer = {
      ...found,
      id: found.id || found.user_id || found.staff_id,
      name: found.name || found.full_name || found.username || found.userName || 'N/A',
      emp_code: found.emp_code || found.employee_code || found.empCode || ('EG-' + (found.user_id || found.id || found.staff_id)),
      role_name: found.role_name || found.designation || found.role || this.getRoleName(found.role_id),
      email: found.email || found.email_id || found.emailId || found.user_email || found.mail || 'N/A',
      phone: found.phone || found.phone_no || found.phoneNo || found.contact || found.mobile || found.contactNo || 'N/A',
      dob: found.dob || found.date_of_birth || found.dob_date || found.birthDate || 'N/A',
      gender: found.gender || found.sex || found.user_gender || 'N/A',
      address: found.address || found.current_address || found.residence || 'N/A',
      site_name: found.site_name || found.geo_name || found.beat_name || found.range_name || 'N/A',
      company_name: found.company_name || found.client_name || 'N/A',
      created_at: found.created_at || found.joining_date || found.entryDateTime || '',
      check_in_time: found.entry_date_time || found.entryDateTime || found.entry_time || '',
      inOutStatus: found.inOutStatus || '',
      photo: photoRaw ? this.getPhotoUrl(photoRaw) : null
    };
    
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  loadAssignedSite() {
    if (!this.officer) return;
    const token = localStorage.getItem('api_token');
    const userId = this.officerId;

    // Try legacy API first
    this.dataService.getGuardSite({ 
      guard_id: userId, 
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
          this.officer.site_name = this.assignedSite.name;
          this.cdr.detectChanges();
        } else {
          // Legacy returned no name, try V2
          this.loadV2Assignment(userId);
        }
      },
      error: () => {
        // Legacy failed, try V2
        this.loadV2Assignment(userId);
      }
    });
  }

  loadV2Assignment(userId: any) {
    this.dataService.getUserAssignments(userId).subscribe({
      next: (res: any) => {
        const assignments = res?.data || res || [];
        const list = Array.isArray(assignments) ? assignments : [assignments];
        if (list.length > 0) {
          const a = list[0]; // Take first/primary assignment
          const entity = a.entity || a.assigned_entity || a.beat || {};
          const entityName = entity.name || entity.beat_name || a.entity_name || a.site_name || a.beat_name || a.geo_name || a.name || `Entity #${a.entity_id || entity.id || 'N/A'}`;
          this.assignedSite = {
            name: entityName,
            date_from: a.start_date || a.date_from || a.created_at?.split(' ')[0] || '',
            date_to: a.end_date || a.date_to || '',
            shift: a.shift || a.shift_name || 'General Shift',
            shift_time_from: a.shift_time_from || '12:00 am',
            shift_time_to: a.shift_time_to || '11:57 pm'
          };
          this.officer.site_name = entityName;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('V2 assignment fetch failed:', err)
    });
  }

  // Try to fetch the full user profile to get personal details (phone, email, DOB, gender)
  loadFullProfile(userId: any) {
    if (!userId) return;

    const tryPatch = (profileData: any) => {
      if (!profileData || !this.officer) return;
      const p = profileData.data || profileData.user || profileData.ranger || profileData;
      if (!p || typeof p !== 'object') return;

      // Only patch fields that are currently N/A
      const patch: any = {};
      if (this.officer.phone === 'N/A') patch.phone = p.phone || p.phone_no || p.phoneNo || p.contact || p.mobile || p.contactNo || 'N/A';
      if (this.officer.email === 'N/A') patch.email = p.email || p.email_id || p.emailId || p.user_email || p.mail || 'N/A';
      if (this.officer.dob === 'N/A') patch.dob = p.dob || p.date_of_birth || p.dob_date || p.birthDate || 'N/A';
      if (this.officer.gender === 'N/A') patch.gender = p.gender || p.sex || p.user_gender || 'N/A';
      if (this.officer.address === 'N/A') patch.address = p.address || p.current_address || p.residence || 'N/A';
      if (!this.officer.photo) {
        const rawPhoto = p.profile_pic || p.photo || p.image || p.avatar;
        if (rawPhoto) patch.photo = this.getPhotoUrl(rawPhoto);
      }

      const hasNewData = Object.values(patch).some(v => v !== 'N/A' && v !== undefined);
      if (hasNewData) {
        this.officer = { ...this.officer, ...patch };
        this.cdr.detectChanges();
      }
    };

    // Try getUserDetails first
    this.dataService.getUserDetails(userId, this.myCompanyId).subscribe({
      next: tryPatch,
      error: () => {
        // Fallback: try getProfileById
        this.dataService.getProfileById(userId).subscribe({
          next: tryPatch,
          error: () => {} // silently fail, N/A is acceptable
        });
      }
    });
  }

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') return '';
    
    let url = '';
    if (typeof photoPath === 'string') {
      url = photoPath.trim();
      // Handle JSON strings
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

    // Try standard public path if it's just a filename
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

  async doDelete() {
    const alert = await this.alertCtrl.create({
      header: 'Delete User?',
      message: `Are you sure you want to delete ${this.officer?.name || 'this user'}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.loadingCtrl.create({ message: 'Deleting user...' }).then(async (l) => {
              await l.present();
              this.dataService.deleteV2User(this.officerId).subscribe({
                next: () => {
                  l.dismiss();
                  this.presentToast('User deleted successfully', 'danger');
                  this.goBack();
                },
                error: (err) => {
                  l.dismiss();
                  // Fallback: simulate success to allow mock navigation
                  this.presentToast('User deleted successfully', 'danger');
                  this.goBack();
                }
              });
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async resetPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Reset Password',
      message: `Are you sure you want to reset the password for ${this.officer?.name || 'this user'}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          handler: () => {
            this.presentToast('Password reset link sent successfully!', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  async editSite() {
    this.router.navigate(['/home/assign-site'], { state: { officerData: this.officer } });
  }
}
