import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-admin-patrol-logs',
  templateUrl: './admin-patrol-logs.page.html',
  styleUrls: ['./admin-patrol-logs.page.scss'],
  standalone: false
})
export class AdminPatrolLogsPage implements OnInit {
  patrolLogs: any[] = [];
  isLoading: boolean = false;
  isFilterModalOpen: boolean = false;
  filterFrom: string = '';
  filterTo: string = '';
  maxDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.refreshData();
  }

  async refreshData() {
    this.isLoading = true;
    this.loadPatrolLogs(this.filterFrom, this.filterTo);
  }

  loadPatrolLogs(from?: string, to?: string) {
    const rawData = localStorage.getItem('user_data');
    const user = rawData ? JSON.parse(rawData) : null;
    const companyId = user ? Number(user.company_id || user.companyId) : 0;

    if (!companyId) {
      this.isLoading = false;
      return;
    }

    // Use the specific patrol API
    this.dataService.getPatrolsByCompany(companyId, from || this.filterFrom, to || this.filterTo).subscribe({
      next: (res: any) => {
        this.patrolLogs = res?.data || res?.patrols || (Array.isArray(res) ? res : []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch patrol logs', err);
        this.isLoading = false;
      }
    });
  }

  viewDetails(log: any) {
    this.navCtrl.navigateForward(['/home/patrol-details'], {
      state: { data: log }
    });
  }

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

  applyFilter() {
    this.isFilterModalOpen = false;
    this.isLoading = true;
    this.loadPatrolLogs(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    const today = new Date().toISOString().split('T')[0];
    this.filterFrom = today;
    this.filterTo = today;
    this.applyFilter();
  }

  goBack() {
    this.navCtrl.back();
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatStatus(status: string) {
    if (!status) return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
