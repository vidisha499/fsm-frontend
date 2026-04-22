import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';

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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private dataService: DataService,
    private photoViewer: PhotoViewerService
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
      this.sighting = this.processObservationPhoto(fullData);
      // Parse report_data in case it's still a string
      let rd = fullData.report_data || {};
      if (typeof rd === 'string') {
        try { rd = JSON.parse(rd); } catch(e) { rd = {}; }
      }
      this.processReportData(rd);
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
        this.sighting = this.processObservationPhoto(report);
        // Parse report_data if it's a string
        let rd = report.report_data || {};
        if (typeof rd === 'string') {
          try { rd = JSON.parse(rd); } catch(e) { rd = {}; }
        }
        this.processReportData(rd);
        this.isLoading = false;
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

    // Convert object to array for easier *ngFor rendering
    Object.keys(data).forEach(key => {
      let value = data[key];
      
      // Skip empty or purely technical fields if any
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object') return; // Skip complex objects if any
      
      // Skip photo keys so they don't render as text URLs
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'photo' || lowerKey === 'photos' || lowerKey.includes('photo')) return;

      // Formatting keys for better display (e.g., "area_burnt" -> "Area Burnt")
      const formattedLabel = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      this.reportDataFields.push({
        label: formattedLabel,
        value: value
      });
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

  openZoom(imgUrl: string) {
    if (!imgUrl) return;
    this.photoViewer.open(imgUrl);
  }
}