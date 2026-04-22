import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PhotoViewerService {
  private showViewerSubject = new BehaviorSubject<boolean>(false);
  private currentImageSubject = new BehaviorSubject<string | null>(null);

  showViewer$ = this.showViewerSubject.asObservable();
  currentImage$ = this.currentImageSubject.asObservable();

  constructor(private loadingCtrl: LoadingController) {}

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
    
    const loading = await this.loadingCtrl.create({
      message: 'Downloading...',
      duration: 1000,
      mode: 'ios'
    });
    await loading.present();
    
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `fms_photo_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
    }
  }
}
