import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
@Injectable({
  providedIn: 'root'
})
export class PhotoViewerService {
  private showViewerSubject = new BehaviorSubject<boolean>(false);
  private currentImageSubject = new BehaviorSubject<string | null>(null);

  showViewer$ = this.showViewerSubject.asObservable();
  currentImage$ = this.currentImageSubject.asObservable();

  constructor(
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async presentSuccessPopup() {
    const alert = await this.alertCtrl.create({
      header: 'Success',
      message: 'Image is downloaded',
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

  open(imageUrl: string) {
    if (!imageUrl) return;
    this.currentImageSubject.next(imageUrl);
    this.showViewerSubject.next(true);
  }

  close() {
    this.showViewerSubject.next(false);
    // Delay clearing image slightly for smoother transition if needed
    setTimeout(() => this.currentImageSubject.next(null), 300);
  }

  async download(imageUrl: string) {
    if (!imageUrl) return;
    
    try {
      if (Capacitor.isNativePlatform()) {
        const loading = await this.loadingCtrl.create({
          message: 'Downloading...',
          duration: 3000,
          mode: 'ios'
        });
        await loading.present();

        try {
          if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            await Filesystem.writeFile({
              path: `fms_photo_${Date.now()}.jpg`,
              data: base64Data,
              directory: Directory.Documents
            });
          } else {
            await Filesystem.downloadFile({
              url: imageUrl,
              path: `fms_photo_${Date.now()}.jpg`,
              directory: Directory.Documents
            });
          }
          await loading.dismiss();
          await this.presentSuccessPopup();
        } catch (e) {
          await loading.dismiss();
          throw e;
        }
      } else {
        const loading = await this.loadingCtrl.create({
          message: 'Downloading...',
          duration: 3000
        });
        await loading.present();

        try {
          // Attempt 1: Direct fetch (might fail due to CORS)
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error('Network response was not ok');
          const blob = await response.blob();
          this.triggerBrowserDownload(blob, imageUrl);
          await loading.dismiss();
          await this.presentSuccessPopup();
        } catch (e) {
          console.warn('Direct fetch failed, trying Weserv Image CDN Proxy...', e);
          try {
            // Attempt 2: Use images.weserv.nl (Global high-speed open-CORS image proxy)
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`;
            const proxyResponse = await fetch(proxyUrl);
            if (!proxyResponse.ok) throw new Error('Weserv CDN Proxy failed');
            const proxyBlob = await proxyResponse.blob();
            this.triggerBrowserDownload(proxyBlob, imageUrl);
            await loading.dismiss();
            await this.presentSuccessPopup();
          } catch (weservError) {
            console.warn('Weserv Proxy failed, trying AllOrigins backup proxy...', weservError);
            try {
              // Attempt 3: Use api.allorigins.win backup proxy
              const backupProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
              const backupResponse = await fetch(backupProxyUrl);
              if (!backupResponse.ok) throw new Error('Backup proxy failed');
              const backupBlob = await backupResponse.blob();
              this.triggerBrowserDownload(backupBlob, imageUrl);
              await loading.dismiss();
              await this.presentSuccessPopup();
            } catch (backupError) {
              console.error('All proxies failed', backupError);
              
              // Ultimate Web Fallback: Open in new tab so user isn't stuck
              const link = document.createElement('a');
              link.href = imageUrl;
              link.target = '_blank';
              const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
              link.download = `forest_photo_${Date.now()}.${extension}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              await loading.dismiss();
              await this.presentSuccessPopup();
            }
          }
        }
      }
    } catch (error) {
      console.error('Download process failed', error);
      this.presentToast('An error occurred during download', 'danger');
    }
  }

  private triggerBrowserDownload(blob: Blob, imageUrl: string) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    link.download = `forest_photo_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
