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
  public users: any[] = [];
  public statusFilter: string = 'pending';
  public scopeFilter: string = 'my'; // 'my' or 'team'
  public priorityFilter: string = 'all'; // 'all', 'urgent', 'priority', 'normal'
  public isLoading: boolean = false;
  public isModalOpen: boolean = false;
  public currentUserId: any;

  // New Task Form
  public newTask = {
    title: '',
    description: '',
    deadline: '',
    priority: 'normal',
    assigned_to: ''
  };

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    const rawData = localStorage.getItem('user_data');
    if (rawData) {
      const userData = JSON.parse(rawData);
      this.currentUserId = userData.id || userData.user_id;
    }
    this.loadUsers();
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

  async loadUsers() {
    const companyId = localStorage.getItem('company_id') || '';
    this.dataService.getAssignableUsers({ company_id: companyId }).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.users = res.data;
        } else if (Array.isArray(res)) {
          this.users = res;
        }
      }
    });
  }

  get filteredTasks() {
    let filtered = this.tasks;

    // 1. Status Filter
    if (this.statusFilter === 'pending') {
      filtered = filtered.filter(t => t.status !== 'completed' && t.status !== 'resolved' && t.status !== 'Completed');
    } else {
      filtered = filtered.filter(t => t.status === 'completed' || t.status === 'resolved' || t.status === 'Completed');
    }

    // 2. Scope Filter (My Tasks vs Team Tasks)
    if (this.scopeFilter === 'my') {
      filtered = filtered.filter(t => String(t.assigned_to) === String(this.currentUserId) || String(t.user_id) === String(this.currentUserId));
    }

    // 3. Priority Filter
    if (this.priorityFilter !== 'all') {
      filtered = filtered.filter(t => (t.priority || '').toLowerCase() === this.priorityFilter.toLowerCase());
    }

    return filtered;
  }

  setScope(scope: string) {
    this.scopeFilter = scope;
  }

  setPriority(priority: string) {
    this.priorityFilter = priority;
  }

  openAddTask() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // Swipe Logic
  public swipeWidth: number = 0;
  public isSwiped: boolean = false;
  private startX: number = 0;
  private maxSwipe: number = 260; // Approximate width of track minus handle

  onTouchStart(ev: any) {
    this.startX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  }

  onTouchMove(ev: any) {
    const currentX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    let delta = currentX - this.startX;
    if (delta < 0) delta = 0;
    if (delta > this.maxSwipe) delta = this.maxSwipe;
    this.swipeWidth = delta;
  }

  onTouchEnd() {
    if (this.swipeWidth >= this.maxSwipe - 20) {
      this.swipeWidth = this.maxSwipe;
      this.isSwiped = true;
      this.submitTask();
    } else {
      this.swipeWidth = 0;
      this.isSwiped = false;
    }
  }

  async submitTask() {
    // Logic to submit task via dataService
    const loading = await this.loadingCtrl.create({ message: 'Creating task...' });
    await loading.present();

    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '';

    const payload = {
      api_token: apiToken,
      company_id: companyId,
      ...this.newTask
    };

    this.dataService.storeForestTask(payload).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.isModalOpen = false;
        this.swipeWidth = 0; // Reset swipe
        this.isSwiped = false;
        this.loadTasks();
        const toast = await this.toastCtrl.create({
          message: 'Task created successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        this.swipeWidth = 0;
        this.isSwiped = false;
        const toast = await this.toastCtrl.create({
          message: 'Error creating task',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
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
