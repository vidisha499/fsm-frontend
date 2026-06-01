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
  public isDetailsModalOpen: boolean = false;
  public selectedTask: any = null;
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

  // Robust assignee resolution
  getTaskAssignees(task: any): string {
    if (!task) return '';
    
    // 1. If there's an array of users
    const userList = task.users || task.task_users || task.assigned_users;
    if (Array.isArray(userList) && userList.length > 0) {
      const names = userList.map((u: any) => {
        if (typeof u === 'object') {
          return u.name || u.username || u.first_name || this.getUserName(u.id || u.user_id);
        }
        return this.getUserName(u);
      }).filter(Boolean);
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    // 2. Direct name properties
    if (task.assigned_to_name) return task.assigned_to_name;
    if (task.assigned_user?.name) return task.assigned_user.name;

    // 3. IDs lookup
    const directId = task.assigned_to || task.assigned_user_id || task.user_id;
    if (directId) {
      return this.getUserName(directId);
    }

    return '';
  }

  viewTaskDetails(task: any) {
    this.selectedTask = task;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedTask = null;
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
        console.log('Tasks API Response:', res);
        if (res && res.data) {
          this.tasks = res.data;
        } else if (Array.isArray(res)) {
          this.tasks = res;
        }
      },
      error: async (err) => {
        this.isLoading = false;
        console.error('Load Tasks Error:', err);
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
      filtered = filtered.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s !== 'completed' && s !== 'resolved' && s !== 'done';
      });
    } else {
      filtered = filtered.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s === 'completed' || s === 'resolved' || s === 'done';
      });
    }

    // 2. Scope Filter (My Tasks vs Team Tasks)
    if (this.scopeFilter === 'my') {
      filtered = filtered.filter(t => 
        String(t.assigned_to) === String(this.currentUserId) || 
        String(t.user_id) === String(this.currentUserId) ||
        String(t.assigned_user_id) === String(this.currentUserId) ||
        String(t.created_by) === String(this.currentUserId)
      );
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
    const loading = await this.loadingCtrl.create({ message: 'Creating task...' });
    await loading.present();

    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '';

    // Match backend expected field names: 'subject' and 'users'
    const payload = {
      api_token: apiToken,
      company_id: companyId,
      subject: this.newTask.title,
      description: this.newTask.description,
      deadline: this.newTask.deadline,
      priority: this.newTask.priority,
      users: [this.newTask.assigned_to] // Sending as an array since the field name is 'users'
    };

    console.log('Submitting task payload:', payload);
    this.dataService.storeForestTask(payload).subscribe({
      next: async (res) => {
        console.log('Task store response:', res);
        await loading.dismiss();
        this.isModalOpen = false;
        this.swipeWidth = 0;
        this.isSwiped = false;
        this.loadTasks();

        // Reset form
        this.newTask = { title: '', description: '', deadline: '', priority: 'normal', assigned_to: '' };

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
        console.error('Task store error:', err);
        const errorMsg = err.error?.message || 'Error creating task';
        const toast = await this.toastCtrl.create({
          message: errorMsg,
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  async deleteTask(id: any) {
    const loading = await this.loadingCtrl.create({ message: 'Deleting task...' });
    await loading.present();

    const apiToken = localStorage.getItem('api_token') || '';
    this.dataService.deleteForestTask(id, { api_token: apiToken }).subscribe({
      next: async () => {
        await loading.dismiss();
        this.loadTasks();
        const toast = await this.toastCtrl.create({ message: 'Task deleted', duration: 2000, color: 'success' });
        toast.present();
      },
      error: async () => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({ message: 'Delete failed', duration: 2000, color: 'danger' });
        toast.present();
      }
    });
  }

  async updateTaskStatus(task: any, status: string) {
    const loading = await this.loadingCtrl.create({ message: 'Updating status...' });
    await loading.present();

    const apiToken = localStorage.getItem('api_token') || '';
    const payload = { api_token: apiToken, status: status };

    this.dataService.updateForestTaskStatus(task.id, payload).subscribe({
      next: async () => {
        await loading.dismiss();
        this.loadTasks();
      },
      error: async () => {
        await loading.dismiss();
      }
    });
  }

  async updateUserStatus(task: any, status: string) {
    const apiToken = localStorage.getItem('api_token') || '';
    this.dataService.updateTaskUserStatus(task.id, { api_token: apiToken, status: status }).subscribe({
      next: () => this.loadTasks()
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

  // Problem 1 Fix: assigned user ka naam users array se dhundho
  getUserName(userId: any): string {
    if (!userId) return '';
    const user = this.users.find(u => String(u.id || u.user_id) === String(userId));
    return user ? user.name : String(userId);
  }
}
