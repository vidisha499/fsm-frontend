import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoadingController, ToastController } from '@ionic/angular';
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
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

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
          this.presentToast('Image saved to Gallery / Documents', 'success');
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
          this.presentToast('Image downloaded successfully', 'success');
        } catch (e) {
          console.warn('Direct fetch failed, trying proxy...', e);
          try {
            // Attempt 2: Use corsproxy.io to force download in browser
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(imageUrl);
            const proxyResponse = await fetch(proxyUrl);
            if (!proxyResponse.ok) throw new Error('Proxy failed');
            const proxyBlob = await proxyResponse.blob();
            this.triggerBrowserDownload(proxyBlob, imageUrl);
            await loading.dismiss();
            this.presentToast('Image downloaded successfully', 'success');
          } catch (proxyError) {
            console.error('All proxies failed', proxyError);
            
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
            this.presentToast('Please save image from the opened tab (Server blocked auto-download)', 'warning');
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
