import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-sightings-details',
  templateUrl: './sightings-details.page.html',
  styleUrls: ['./sightings-details.page.scss'],
  standalone: false
})
export class SightingsDetailsPage implements OnInit {
  sighting: any = null;
  reportDataFields: { label: string, value: any }[] = [];
  isLoading = false;
  cachedState: any = null;
  map!: L.Map;
<<<<<<< Updated upstream
  userRangeDisplay = '—';
  userBeatDisplay = '—';
=======
>>>>>>> Stashed changes

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private dataService: DataService,
    private photoViewer: PhotoViewerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initData();
  }

  ionViewWillEnter() {
    // Only re-init if sightings data is missing
    if (!this.sighting && !this.isLoading) {
      this.initData();
    }
  }

  private async initData() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state;
    
    // Cache state for re-use on ionViewWillEnter
    if (state && state['data']) {
      this.cachedState = state;
    }

    const effectiveState = this.cachedState;

    // 1. Use state data directly — it's already pre-parsed and complete
    if (effectiveState && effectiveState['data']) {
      const fullData = effectiveState['data'];
<<<<<<< Updated upstream
      this.sighting = this.prepareSighting(fullData);
=======
      this.sighting = this.processObservationPhoto(fullData);
>>>>>>> Stashed changes
      this.resolveReporterDetails();
      // Parse report_data in case it's still a string
      let rd = fullData.report_data || {};
      if (typeof rd === 'string') {
        try { rd = JSON.parse(rd); } catch(e) { rd = {}; }
      }
      this.processReportData(rd);
      setTimeout(() => this.initMap(), 500);
      return; // We have everything we need — no API call required
    }

    // 2. Fallback: Get ID from URL and fetch from API
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && !idParam.startsWith('temp-')) {
      await this.fetchFullReport(parseInt(idParam));
    } else if (!this.sighting) {
      console.warn('No sighting data found, redirecting...');
      this.goBack();
    }
  }

  private async fetchFullReport(id: number) {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Fetching full details...',
      spinner: 'crescent'
    });
    await loader.present();

    this.dataService.getForestEventById(id).subscribe({
      next: (res: any) => {
        loader.dismiss();
        // Handle both direct response and wrapped { data: {...} } response
        const report = res?.data || res;
        if (!report) {
          console.warn('Report not found for ID:', id);
          this.isLoading = false;
          this.showToast("Report details not found.");
          this.goBack();
          return;
        }
<<<<<<< Updated upstream
        this.sighting = this.prepareSighting(report);
=======
        this.sighting = this.processObservationPhoto(report);
>>>>>>> Stashed changes
        this.resolveReporterDetails();
        // Parse report_data if it's a string
        let rd = report.report_data || {};
        if (typeof rd === 'string') {
          try { rd = JSON.parse(rd); } catch(e) { rd = {}; }
        }
        this.processReportData(rd);
        this.isLoading = false;
        setTimeout(() => this.initMap(), 500);
      },
      error: (err: any) => {
        console.error('Error fetching report details:', err);
        this.isLoading = false;
        loader.dismiss();
        this.showToast("Failed to load report. Please check connection.");
      }
    });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }

  private processReportData(data: any) {
    this.reportDataFields = [];
    if (!data) return;

    const skipInAttributes = new Set([
      'beat', 'beat_name', 'range', 'range_name', 'assigned beat',
      'staff_name', 'site', 'site_name', 'site id', 'entity_id', 'entity id'
    ]);

    Object.keys(data).forEach(key => {
      let value = data[key];
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object') return;

      const lowerKey = key.toLowerCase();
      if (lowerKey === 'photo' || lowerKey === 'photos' || lowerKey.includes('photo')) return;

      const formattedLabel = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      if (skipInAttributes.has(lowerKey) || skipInAttributes.has(formattedLabel.toLowerCase())) return;

      if (!this.reportDataFields.find(f => f.label.toLowerCase() === formattedLabel.toLowerCase())) {
        this.reportDataFields.push({ label: formattedLabel, value });
      }
    });
  }

  private processObservationPhoto(obs: any) {
    let photosList: string[] = [];
    
    if (Array.isArray(obs.photos)) {
      photosList = [...obs.photos];
    }
    
    if (obs.photo) {
      if (typeof obs.photo === 'string') {
        let cleaned = obs.photo.trim();
        if (cleaned.startsWith('"[') && cleaned.endsWith(']"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1).replace(/\\"/g, '"');
        }
        
        if (cleaned.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
               parsed.forEach((p: any) => {
                  if (p && p.photo) photosList.push(p.photo);
                  else if (p && p.url) photosList.push(p.url);
                  else if (p && p.path) photosList.push(p.path);
                  else if (typeof p === 'string') photosList.push(p);
               });
            }
          } catch(e) {
            let stripped = cleaned.replace(/^\["?|"?]$/g, '');
            if (stripped.startsWith('data:') || stripped.startsWith('http')) {
               photosList.push(stripped);
            } else {
               photosList.push(obs.photo);
            }
          }
        } else {
          photosList.push(cleaned);
        }
      } else if (Array.isArray(obs.photo)) {
        obs.photo.forEach((p: any) => {
            if (p && p.photo) photosList.push(p.photo);
            else if (typeof p === 'string') photosList.push(p);
        });
      }
    }
    
    let validPhotos = photosList.filter(p => typeof p === 'string' && p.length > 5 && !p.startsWith('['));
    validPhotos = validPhotos.map(url => {
        // Fix for absolute URLs that are missing '/public/' which causes 404
        if (typeof url === 'string' && url.includes('fms.pugarch.in/profilepics/')) {
            url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/');
        }
        
        if (!url.startsWith('http') && !url.startsWith('data:')) {
            return `https://fms.pugarch.in/public/profilepics/forest_reports/${url}`;
        }
        return url;
    });
    
    // REMOVE DUPLICATES
    obs.photos = [...new Set(validPhotos)];
    obs.photo = null; 
    return obs;
  }

  getIcon(category: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('felling')) return 'fa-tree';
    if (cat.includes('poaching')) return 'fa-skull-crossbones';
    if (cat.includes('encroachment')) return 'fa-user-slash';
    if (cat.includes('mining')) return 'fa-mountain';
    if (cat.includes('storage')) return 'fa-warehouse';
    if (cat.includes('transport')) return 'fa-truck';
    if (cat.includes('animal sighting')) return 'fa-paw';
    if (cat.includes('water')) return 'fa-droplet';
    if (cat.includes('fire')) return 'fa-fire';
    if (cat.includes('compensation')) return 'fa-hand-holding-dollar';
    if (cat.includes('forestry')) return 'fa-users';
    return 'fa-circle-plus';
  }

  getIconColor(category: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('felling')) return 'felling';
    if (cat.includes('poaching')) return 'poaching';
    if (cat.includes('encroachment')) return 'encroachment';
    if (cat.includes('mining')) return 'mining';
    if (cat.includes('storage')) return 'storage';
    if (cat.includes('transport')) return 'transport';
    if (cat.includes('animal sighting')) return 'animal';
    if (cat.includes('water')) return 'water';
    if (cat.includes('fire')) return 'fire';
    if (cat.includes('compensation')) return 'compensation';
    if (cat.includes('forestry')) return 'forestry';
    return 'other';
  }

  getDisplayTitle(): string {
    if (!this.sighting) return 'Detail';
    const type = this.sighting.report_type || this.sighting.category || 'Report';
    return type.replace(/_/g, ' ')
               .split(' ')
               .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
  }

  goBack() {
    this.navCtrl.back();
  }

  initMap() {
    const mapElement = document.getElementById('sightingMap');
    if (!mapElement || !this.sighting) return;

    const lat = Number(this.sighting.latitude || this.sighting.lat || 0);
    const lng = Number(this.sighting.longitude || this.sighting.lng || 0);

    if (lat === 0 && lng === 0) return;

    if (this.map) {
      try { this.map.remove(); } catch(e) {}
    }

    this.map = L.map('sightingMap', {
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    }).addTo(this.map);

    this.map.setView([lat, lng], 15);

    const markerIcon = L.divIcon({
      className: 'custom-details-marker',
      html: `<div style="background-color: #ef4444; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
              <i class="fas fa-map-marker-alt"></i>
            </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    L.marker([lat, lng], { icon: markerIcon }).addTo(this.map);
  }

  openZoom(imgUrl: string) {
    if (!imgUrl) return;
    this.photoViewer.open(imgUrl);
  }

<<<<<<< Updated upstream
  async downloadImage(imageUrl: string) {
    if (!imageUrl) return;
    await this.photoViewer.download(imageUrl);
  }

  private prepareSighting(report: any) {
    const s = this.processObservationPhoto({ ...report });
    this.userRangeDisplay =
      s.range_name || s.range || s.division_name || '—';
    this.userBeatDisplay =
      s.beat_name || s.beat || s.site_name || '—';
    return s;
  }

  private applyRangeBeatFromResolution(info: {
    range: string;
    beat: string;
    isDynamic: boolean;
  }) {
    const reportRange = String(
      this.sighting.range_name || this.sighting.range || ''
    ).trim();
    const reportBeat = String(
      this.sighting.beat_name || this.sighting.beat || this.sighting.site_name || ''
    ).trim();
    const assignRange = String(info.range || '').trim();
    const assignBeat = String(info.beat || '').trim();

    if (info.isDynamic) {
      this.userRangeDisplay = assignRange || 'Not assigned';
      this.userBeatDisplay = assignBeat || 'Not assigned';
    } else {
      this.userRangeDisplay = assignRange || reportRange || '—';
      this.userBeatDisplay = assignBeat || reportBeat || '—';
    }
    this.cdr.detectChanges();
  }

  private resolveReporterDetails() {
    if (!this.sighting) return;

    const uId =
      this.sighting.applicant_id ||
      this.sighting.staff_id ||
      this.sighting.ranger_id ||
      this.sighting.guard_id ||
      this.sighting.user_id ||
      this.sighting.created_by;
    const cId = this.sighting.company_id || localStorage.getItem('company_id') || '0';

    if (!uId) return;

    this.dataService.resolveUserDisplayInfo(uId, cId).subscribe({
      next: (info) => {
        if (info.reporterName) this.sighting.userName = info.reporterName;
        this.applyRangeBeatFromResolution(info);
      }
    });

    this.dataService.getUserDetails(uId, cId).subscribe({
      next: (userRes: any) => {
        const u = userRes?.data || userRes;
        if (!u) return;
        if (!this.sighting.userName) {
          this.sighting.userName =
            u.name || u.full_name || u.user_name || u.ranger_name || this.sighting.userName;
        }
        this.sighting.userId = u.user_id || u.id || u.staff_id || this.sighting.userId;

        let roleName = u.designation || u.role_name || u.roleName;
        if (!roleName) {
          const rid = String(u.role_id || u.roleId || '');
          if (rid === '1') roleName = 'Super Admin';
          else if (rid === '2') roleName = 'Forester';
          else if (rid === '3') roleName = 'Forest Guard';
          else if (rid === '7') roleName = 'Range Officer';
          else roleName = 'Forest Staff';
        }
        this.sighting.designation = roleName;

        const rawPic = u.profile_pic || u.photo || u.profilePic;
        if (rawPic && typeof rawPic === 'string' && rawPic.trim().length > 2) {
          const cleaned = rawPic.trim();
          this.sighting.profile_pic =
            cleaned.startsWith('http') || cleaned.startsWith('data:')
              ? cleaned
              : `https://fms.pugarch.in/public/profilepics/${cleaned}`;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error resolving reporter profile:', err)
    });
=======
  private resolveReporterDetails() {
    if (!this.sighting) return;

    const uId = this.sighting.created_by || this.sighting.user_id || this.sighting.ranger_id || this.sighting.reporter_id || this.sighting.staff_id;
    const cId = this.sighting.company_id || localStorage.getItem('company_id') || '0';

    if (uId) {
      this.dataService.getUserDetails(uId, cId).subscribe({
        next: (userRes: any) => {
          const u = userRes?.data || userRes;
          if (u) {
            // Resolve Name
            this.sighting.userName = u.name || u.full_name || u.user_name || u.ranger_name || u.reporter_name || this.sighting.userName;
            
            // Resolve Staff ID / User ID
            this.sighting.userId = u.user_id || u.id || u.staff_id || this.sighting.userId;

            // Resolve Designation (if Role ID is 2, it's Forester; if 3, Forest Guard; etc.)
            let roleName = u.designation || u.role_name || u.roleName;
            if (!roleName) {
              const rid = String(u.role_id || u.roleId || '');
              if (rid === '1') roleName = 'Super Admin';
              else if (rid === '2') roleName = 'Forester';
              else if (rid === '3') roleName = 'Forest Guard';
              else if (rid === '7') roleName = 'Range Officer';
              else roleName = 'Forest Staff';
            }
            this.sighting.designation = roleName;

            // Resolve Profile Pic URL
            const rawPic = u.profile_pic || u.photo || u.profilePic;
            if (rawPic && typeof rawPic === 'string' && rawPic.trim().length > 2) {
              const cleaned = rawPic.trim();
              if (cleaned.startsWith('http') || cleaned.startsWith('data:')) {
                this.sighting.profile_pic = cleaned;
              } else {
                this.sighting.profile_pic = `https://fms.pugarch.in/public/profilepics/${cleaned}`;
              }
            }
            
            this.cdr.detectChanges();
          }
        },
        error: (err) => console.error("Error resolving reporter details:", err)
      });
    }
>>>>>>> Stashed changes
  }
}