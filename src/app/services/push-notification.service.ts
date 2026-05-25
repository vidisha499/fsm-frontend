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
  ) { }

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
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
            console.log('PushNotificationService: Notification tapped:', action);
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
}
