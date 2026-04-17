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
    this.loadSubmittedReports();
  }

  loadDrafts() {
    this.draftReports = this.dataService.getForestEventDrafts().reverse();
    this.isLoading = false;
  }

  loadSubmittedReports() {
    const rangerId = this.dataService.getRangerId();
    if (!rangerId) return;

    // We can use getIncidentsByRanger or getForestReports
    // For consistency with EventsFields, lets fetch recent forest reports
    this.dataService.getForestReports({ user_id: rangerId }).subscribe({
      next: (res: any) => {
        this.submittedReports = res?.data || res || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch reports', err);
        this.isLoading = false;
      }
    });
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
