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

    // Load locally saved notifications
    let localList: any[] = [];
    try {
      const stored = localStorage.getItem('local_notifications');
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing local notifications:', e);
    }

    this.dataService.getNotifications().subscribe({
      next: (res: any) => {
        const serverList = res.data || res.notifications || (Array.isArray(res) ? res : []);
        this.notifications = this.mergeAndSortNotifications(serverList, localList);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching notifications:', err);
        this.isLoading = false;
        
        // Fallback to local + mock fallbacks
        const mockList = [
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
        this.notifications = this.mergeAndSortNotifications(mockList, localList);
      }
    });
  }

  mergeAndSortNotifications(serverList: any[], localList: any[]): any[] {
    const merged = [...localList];
    serverList.forEach(s => {
      const exists = merged.some(l => 
        String(l.id) === String(s.id) || 
        (l.title === s.title && l.message === (s.message || s.body))
      );
      if (!exists) {
        merged.push({
          id: s.id,
          title: s.title || 'Notification',
          message: s.message || s.body || '',
          created_at: s.created_at || s.createdAt || new Date().toISOString(),
          is_read: s.is_read || s.isRead || false,
          type: s.type || 'alert'
        });
      }
    });
    
    // Sort by created_at descending
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.is_read).length;
  }

  markAsRead(notification: any) {
    if (notification.is_read) return;

    notification.is_read = true;

    if (String(notification.id).startsWith('local_')) {
      try {
        const stored = localStorage.getItem('local_notifications');
        if (stored) {
          const list = JSON.parse(stored);
          const item = list.find((n: any) => String(n.id) === String(notification.id));
          if (item) {
            item.is_read = true;
            localStorage.setItem('local_notifications', JSON.stringify(list));
          }
        }
      } catch (e) {
        console.error('Error updating local read status:', e);
      }
    } else {
      this.dataService.markNotificationRead(notification.id).subscribe({
        error: (err) => console.error('Error marking read:', err)
      });
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  doRefresh(event: any) {
    let localList: any[] = [];
    try {
      const stored = localStorage.getItem('local_notifications');
      if (stored) localList = JSON.parse(stored);
    } catch (e) {}

    this.dataService.getNotifications().subscribe({
      next: (res: any) => {
        const serverList = res.data || res.notifications || (Array.isArray(res) ? res : []);
        this.notifications = this.mergeAndSortNotifications(serverList, localList);
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }
}
