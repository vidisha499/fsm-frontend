import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../../data.service';

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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private dataService: DataService
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
    
    // 1. Try to get data from State (fastest)
    if (state && state['data']) {
      const basicData = state['data'];
      const source = state['source'] || 'report';
      const id = state['id'];

      if (source === 'report' && id) {
        await this.fetchFullReport(id);
      } else {
        this.sighting = basicData;
        this.processReportData(this.sighting.report_data);
      }
      return;
    }

    // 2. Fallback: Get ID from URL and fetch
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && !idParam.startsWith('temp-')) {
      await this.fetchFullReport(parseInt(idParam));
    } else if (!this.sighting) {
      // 3. Last resort: if no data and no ID to fetch, go back
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
        if (!res) {
          console.warn('Report not found for ID:', id);
          this.isLoading = false;
          this.showToast("Report details not found.");
          this.goBack();
          return;
        }
        this.sighting = res;
        this.processReportData(res.report_data);
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
}