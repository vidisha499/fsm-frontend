import { Injectable } from '@angular/core';
import { Platform, ToastController, AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private isInitialized = false;

  constructor(
    private platform: Platform,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.initListeners();
  }

  async initListeners() {
    await this.platform.ready();
    
    if (!this.platform.is('capacitor')) {
      console.log('PushNotificationService: Not on Capacitor, skipping listener initialization.');
      return;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      if (!this.isInitialized) {
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('PushNotificationService: Notification received in foreground:', notification);
          this.showForegroundNotification(notification);
          this.saveNotificationLocally(notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
          console.log('PushNotificationService: Notification tapped:', action);
          if (action.notification) {
            this.saveNotificationLocally(action.notification);
          }
        });
        this.isInitialized = true;
        console.log('PushNotificationService: Early push listeners set up.');
      }
      
      // Check delivered notifications in background tray immediately on startup
      await this.checkDeliveredNotifications();
    } catch (err) {
      console.error('PushNotificationService: Error in early listener init:', err);
    }
  }

  async getFcmToken(): Promise<string> {
    await this.platform.ready();
    
    if (!this.platform.is('capacitor')) {
      console.log('PushNotificationService: Not on Capacitor, using mock token.');
      return 'web_or_mock_token';
    }

    return new Promise(async (resolve) => {
        let isResolved = false;
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Listener for success
        PushNotifications.addListener('registration', (token: any) => {
          console.log('PushNotificationService: FCM Token received:', token.value);
          localStorage.setItem('fcm_token_dev', token.value);
          this.showDebugToast('FCM Token Generated successfully!');
          if (!isResolved) {
            isResolved = true;
            resolve(token.value);
          }
        });

        // Listener for error
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('PushNotificationService: Registration error:', JSON.stringify(error));
          if (!isResolved) {
            isResolved = true;
            resolve('');
          }
        });

        // Listeners for foreground/background taps (only add once)
        if (!this.isInitialized) {
          PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('PushNotificationService: Notification received in foreground:', notification);
            this.showForegroundNotification(notification);
            this.saveNotificationLocally(notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
            console.log('PushNotificationService: Notification tapped:', action);
            if (action.notification) {
              this.saveNotificationLocally(action.notification);
            }
          });
          this.isInitialized = true;
        }

        // Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
          // Trigger registration
          await PushNotifications.register();
          
          // Timeout fallback in case 'registration' event is never fired
          setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              console.warn('PushNotificationService: Token generation timed out');
              resolve('');
            }
          }, 8000);
        } else {
          console.warn('PushNotificationService: Permission not granted');
          if (!isResolved) {
            isResolved = true;
            resolve('');
          }
        }
      } catch (err) {
        console.error('PushNotificationService: Init error', err);
        if (!isResolved) {
          isResolved = true;
          resolve('');
        }
      }
    });
  }

  /**
   * ✅ FIX: Check all notifications currently sitting in the system tray.
   * Call this on app init and on app resume so background-delivered
   * notifications are captured even when the user never tapped them.
   */
  async checkDeliveredNotifications() {
    try {
      if (!this.platform.is('capacitor')) return;
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.getDeliveredNotifications();
      const delivered = result?.notifications || [];
      if (delivered.length > 0) {
        console.log(`📬 [PushService] Found ${delivered.length} delivered (tray) notification(s). Saving...`);
        delivered.forEach((n: any) => this.saveNotificationLocally(n));
      }
    } catch (e) {
      console.warn('PushNotificationService: getDeliveredNotifications failed', e);
    }
  }

  private async showForegroundNotification(notification: any) {
    const toast = await this.toastCtrl.create({
      header: notification.title || 'New Notification',
      message: notification.body || '',
      duration: 6000,
      color: 'success',
      position: 'top',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  private async showDebugToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: `[FCM Debug] ${message}`,
      duration: 2000,
      position: 'bottom',
      color: 'dark',
      mode: 'ios'
    });
    await toast.present();
  }

  public saveNotificationLocally(notification: any) {
    try {
      const data = notification.data || {};
      const title = notification.title || notification.header || data.title || data.header || 'New Notification';
      const body = notification.body || notification.message || data.body || data.message || '';
      
      if (!title && !body) return;

      const stored = localStorage.getItem('local_notifications');
      const list = stored ? JSON.parse(stored) : [];
      
      const newNotif = {
        id: notification.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title,
        message: body,
        created_at: new Date().toISOString(),
        is_read: false,
        type: 'alert'
      };
      
      // Avoid duplicate checks
      const exists = list.some((item: any) => 
        (item.title === newNotif.title && item.message === newNotif.message)
      );
      
      if (!exists) {
        list.unshift(newNotif);
        localStorage.setItem('local_notifications', JSON.stringify(list));
        console.log('PushNotificationService: Saved notification locally:', newNotif);
      }
    } catch (e) {
      console.error('PushNotificationService: Error saving notification:', e);
    }
  }

  public triggerSelfNotification(title: string, body: string, type: 'alert' | 'success' | 'info' = 'success') {
    // 1. Save locally to show in Alerts screen list
    this.saveNotificationLocally({
      title: title,
      body: body,
      id: `local_self_${Date.now()}`
    });

    // 2. Show native-looking banner toast at the top
    this.toastCtrl.create({
      header: title,
      message: body,
      duration: 5000,
      color: type === 'success' ? 'success' : type === 'alert' ? 'danger' : 'primary',
      position: 'top',
      buttons: [{ text: 'OK', role: 'cancel' }]
    }).then(toast => toast.present());
  }
}
