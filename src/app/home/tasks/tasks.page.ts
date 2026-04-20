import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false
})
export class TasksPage implements OnInit {
  public tasks: any[] = [];
  public statusFilter: string = 'pending';
  public isLoading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadTasks();
  }

  async loadTasks() {
    this.isLoading = true;
    const companyId = localStorage.getItem('company_id') || '';
    const apiToken = localStorage.getItem('api_token') || '';

    this.dataService.getForestTasks({ api_token: apiToken, company_id: companyId }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          this.tasks = res.data;
        } else if (Array.isArray(res)) {
          this.tasks = res;
        }
      },
      error: async (err) => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Failed to load tasks',
          duration: 2500,
          color: 'danger',
          position: 'bottom'
        });
        toast.present();
      }
    });
  }

  get filteredTasks() {
    if (this.statusFilter === 'pending') {
      return this.tasks.filter(t => t.status !== 'completed' && t.status !== 'resolved' && t.status !== 'Completed');
    }
    return this.tasks.filter(t => t.status === 'completed' || t.status === 'resolved' || t.status === 'Completed');
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  }
}
