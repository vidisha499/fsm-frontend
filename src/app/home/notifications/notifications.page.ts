import { Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {
  notifications: any[] = [];
  isLoading = true;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading = true;
    this.dataService.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications = res.data || res.notifications || (Array.isArray(res) ? res : []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching notifications:', err);
        this.isLoading = false;
        this.notifications = [
          {
            id: 1,
            title: 'Welcome to FMS',
            message: 'Your patrolling shift starts in 10 minutes.',
            created_at: new Date().toISOString(),
            is_read: false,
            type: 'alert'
          },
          {
            id: 2,
            title: 'Attendance Approved',
            message: 'Your onsite attendance for Beat 4.2 has been approved.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_read: true,
            type: 'success'
          }
        ];
      }
    });
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.is_read).length;
  }

  markAsRead(notification: any) {
    if (notification.is_read) return;

    this.dataService.markNotificationRead(notification.id).subscribe({
      next: () => {
        notification.is_read = true;
      },
      error: (err) => console.error('Error marking read:', err)
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  doRefresh(event: any) {
    this.dataService.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications = res.data || res.notifications || (Array.isArray(res) ? res : []);
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }
}
