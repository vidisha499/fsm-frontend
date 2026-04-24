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

    // getGuardsOnSite returns ONLY officers who have marked attendance today,
    // and already includes the 'photo' field — so we use it as the primary source.
    this.dataService.getGuardsOnSite().pipe(catchError(() => of([]))).subscribe({
      next: (res: any) => {
        const guardsList: any[] = res.data || res.guards || res || [];

        // Map each on-site guard to the officer display model
        this.allOfficers = guardsList.map((g: any) => {
          const photoRaw = g.photo || g.profile_pic || g.profile_Pic || g.image || g.avatar || g.profile_image;
          return {
            ...g,
            id: g.user_id || g.id,
            name: g.name || g.full_name || 'Officer',
            role: this.getRoleName(g.role_id),
            site_name: g.site_name || g.geo_name || g.beat_name || '',
            photo: this.getPhotoUrl(photoRaw),
            dutyStatus: 'On Duty',
            hasAttended: true
          };
        });

        // Sort alphabetically by name
        this.allOfficers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        this.filteredOfficers = [...this.allOfficers];
        this.totalCount = this.allOfficers.length;
        this.isLoading = false;
        this.cdr.detectChanges();
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
