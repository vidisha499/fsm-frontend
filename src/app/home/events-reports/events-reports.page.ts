import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-events-reports',
  templateUrl: './events-reports.page.html',
  styleUrls: ['./events-reports.page.scss'],
  standalone: false
})
export class EventsReportsPage implements OnInit {
  activeSegment: string = 'submitted';
  submittedReports: any[] = [];
  draftReports: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];


  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    public translate: TranslateService
  ) {}

  ngOnInit() {
    this.refreshData();
  }

  async refreshData() {
    this.isLoading = true;
    this.loadDrafts();
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }


  loadDrafts() {
    this.draftReports = this.dataService.getForestEventDrafts().reverse();
    this.isLoading = false;
  }

  loadSubmittedReports(from?: string, to?: string) {
    const rangerId = this.dataService.getRangerId();
    if (!rangerId) return;

    let params: any = { user_id: rangerId };
    if (from) params.date_from = from;
    if (to) params.date_to = to;

    this.dataService.getForestReports(params).subscribe({
      next: (res: any) => {
        const rawData = res?.data || res || [];
        this.submittedReports = rawData.map((r: any) => this.processPhotos(r));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch reports', err);
        this.isLoading = false;
      }
    });
  }

  processPhotos(report: any) {
    let thumb = null;
    let photosList: string[] = [];
    
    // Check 'photos' array
    if (Array.isArray(report.photos)) {
      photosList = [...report.photos];
    }
    
    // Check 'photo' field (could be JSON string or single URL)
    if (report.photo) {
      if (typeof report.photo === 'string') {
        let cleaned = report.photo.trim();
        // Handle double-escaped JSON strings from PHP/MySQL
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
             // Fallback for malformed JSON
             let stripped = cleaned.replace(/^\["?|"?]$/g, '');
             if (stripped.length > 5) photosList.push(stripped);
          }
        } else {
          photosList.push(cleaned);
        }
      } else if (Array.isArray(report.photo)) {
        report.photo.forEach((p: any) => {
          if (p && p.photo) photosList.push(p.photo);
          else if (typeof p === 'string') photosList.push(p);
        });
      }
    }

    // Filter valid URLs
    let validPhotos = photosList.filter(p => typeof p === 'string' && p.length > 5 && !p.startsWith('['));
    
    // Format relative paths and fix broken absolute paths
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

    if (validPhotos.length > 0) {
      thumb = validPhotos[0];
    }

    return { 
      ...report, 
      displayPhoto: thumb,
      allPhotos: validPhotos 
    };
  }

  viewDetails(report: any) {
    // We pass the processed data to the details page
    this.navCtrl.navigateForward(['/home/sightings-details'], {
      state: { data: report }
    });
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.isLoading = true;
    this.loadSubmittedReports(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilter();
  }


  async syncDraft(draft: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Syncing report...',
      spinner: 'circles'
    });
    await loading.present();

    // Prepare payload (removing draft artifacts)
    const { draftId, isDraft, ...payload } = draft;

    this.dataService.submitForestEvent(payload).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.dataService.deleteForestEventDraft(draftId);
        this.loadDrafts();
        this.loadSubmittedReports();
        
        const toast = await this.toastCtrl.create({
          message: 'Draft synced successfully! ✅',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Sync failed: ' + (err.error?.message || 'Server unreachable'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async syncAllDrafts() {
    if (this.draftReports.length === 0) return;

    const loading = await this.loadingCtrl.create({
      message: `Syncing ${this.draftReports.length} reports...`,
      spinner: 'bubbles'
    });
    await loading.present();

    let successCount = 0;
    for (const draft of this.draftReports) {
      const { draftId, isDraft, ...payload } = draft;
      try {
        await this.dataService.submitForestEvent(payload).toPromise();
        this.dataService.deleteForestEventDraft(draftId);
        successCount++;
      } catch (err) {
        console.warn(`Failed to sync draft ${draftId}`, err);
      }
    }

    await loading.dismiss();
    this.refreshData();

    const toast = await this.toastCtrl.create({
      message: `${successCount} reports synced. ${this.draftReports.length - successCount} failed.`,
      duration: 3000,
      color: successCount > 0 ? 'success' : 'warning'
    });
    await toast.present();
  }

  async deleteDraft(draftId: string) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Draft',
      message: 'Are you sure you want to permanently delete this draft?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.dataService.deleteForestEventDraft(draftId);
            this.loadDrafts();
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatTitle(str: string) {
    if (!str) return '';
    return str.replace(/_/g, ' ').toUpperCase();
  }

  replace(str: string, target: string, replacement: string) {
    if (!str) return '';
    return str.split(target).join(replacement);
  }
}
