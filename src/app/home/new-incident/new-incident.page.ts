import { HttpClient } from '@angular/common/http'; 
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActionSheetController, NavController, ToastController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-new-incident',
  templateUrl: './new-incident.page.html',
  styleUrls: ['./new-incident.page.scss'],
  standalone: false
})
export class NewIncidentPage implements OnInit {
  isSubmitting: boolean = false;
  public capturedPhotos: string[] = []; 
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0;
  
  public incidentData = {
    priority: 'High Priority',
    criteria: 'Fire Warning',
    cause: 'Short Circuit',
    observation: ''
  };

  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/incidents';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit() { }

  goBack() { this.navCtrl.back(); }

  async takePhoto() {
    if (this.capturedPhotos.length >= 5) {
      const msg = await this.translate.get('REPORT.MAX_PHOTO_MSG').toPromise();
      this.presentToast(msg, 'warning');
      return;
    }

    const headerTxt = await this.translate.get('REPORT.ATTACH_HEADER').toPromise();
    const camTxt = await this.translate.get('REPORT.TAKE_PICTURE').toPromise();
    const galleryTxt = await this.translate.get('REPORT.FROM_PHOTOS').toPromise();
    const cancelTxt = await this.translate.get('REPORT.CANCEL').toPromise();

    const actionSheet = await this.actionSheetCtrl.create({
      header: `${headerTxt} (${this.capturedPhotos.length}/5)`,
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: camTxt, icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: galleryTxt, icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: cancelTxt, icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 50,
        resultType: CameraResultType.Base64,
        source: source
      });
      if (image && image.base64String) {
        this.capturedPhotos.push(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (e) { console.log('Cancelled'); }
  }

  removePhoto(index: number) { this.capturedPhotos.splice(index, 1); }

  async submitReport() {
    if (this.isSubmitting) return;

    if (!this.capturedPhotos.length) {
      const msg = await this.translate.get('REPORT.PHOTO_REQ_MSG').toPromise();
      this.presentToast(msg, 'warning');
      this.resetSlider();
      return; 
    }

    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) {
      this.presentToast('Session expired.', 'danger');
      this.resetSlider();
      return;
    }

    this.isSubmitting = true;
    this.textOpacity = 0;
    
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 64;
    this.currentTranslateX = this.maxSlide;
    this.cdr.detectChanges();

    const payload = {
      rangerId: +rangerId,
      photos: this.capturedPhotos, 
      responsePriority: this.incidentData.priority,
      incidentCriteria: this.incidentData.criteria,
      rootCause: this.incidentData.cause,
      fieldObservation: this.incidentData.observation
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: async () => {
        const successMsg = await this.translate.get('REPORT.SUCCESS_MSG').toPromise();
        this.presentToast(successMsg, 'success');
        setTimeout(() => {
          this.isSubmitting = false;
          this.navCtrl.back();
        }, 1500);
      },
      error: async () => {
        this.isSubmitting = false;
        this.resetSlider();
        const errMsg = await this.translate.get('REPORT.ERROR_MSG').toPromise();
        this.presentToast(errMsg, 'danger');
      }
    });
  }

  private resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  adjustHeight(event: any) {
    const textArea = event.target;
    textArea.style.height = 'auto'; 
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 3000, color, position: 'bottom', mode: 'ios'
    });
    toast.present();
  }

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 64;
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    let moveX = event.touches[0].clientX - this.startX;
    if (moveX < 0) moveX = 0;
    if (moveX > this.maxSlide) moveX = this.maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / this.maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting || !this.capturedPhotos.length) return;
    if (this.currentTranslateX >= this.maxSlide * 0.85) {
      this.submitReport();
    } else {
      this.resetSlider();
    }
  }
}