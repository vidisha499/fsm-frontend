import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController, GestureController } from '@ionic/angular';
import { LabelService } from 'src/app/services/label.service';

@Component({
  selector: 'app-dynamic-labels',
  templateUrl: './dynamic-labels.page.html',
  styleUrls: ['./dynamic-labels.page.scss'],
  standalone: false
})
export class DynamicLabelsPage implements OnInit {

  masterKeys: string[] = [];
  selectedMasterKey: string = '';
  
  // List of overrides currently being edited
  activeOverrides: { key: string, defaultValue: string, customValue: string }[] = [];

  // --- SWIPE GESTURE STATE ---
  swipeCompleted: boolean = false;
  swipeThreshold: number = 0.8;

  constructor(
    private labelService: LabelService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private gestureCtrl: GestureController
  ) { }

  ngOnInit() {
    this.masterKeys = this.labelService.getMasterKeys();
    this.loadCurrentOverrides();
  }

  loadCurrentOverrides() {
    const current = this.labelService.getOverrides();
    this.activeOverrides = Object.keys(current).map(key => ({
      key: key,
      defaultValue: this.labelService.getDefaultValue(key),
      customValue: current[key]
    }));
  }

  addOverride() {
    if (!this.selectedMasterKey) {
      this.showToast('Please select a Master Key first!', 'warning');
      return;
    }

    // Check if already in active list
    const exists = this.activeOverrides.find(o => o.key === this.selectedMasterKey);
    if (exists) {
      this.showToast('This label is already being customized.', 'info');
      return;
    }

    this.activeOverrides.push({
      key: this.selectedMasterKey,
      defaultValue: this.labelService.getDefaultValue(this.selectedMasterKey),
      customValue: this.labelService.getDefaultValue(this.selectedMasterKey)
    });

    this.selectedMasterKey = '';
  }

  removeOverride(index: number) {
    this.activeOverrides.splice(index, 1);
  }

  resetToDefault(index: number) {
    const item = this.activeOverrides[index];
    item.customValue = item.defaultValue;
    this.showToast(`Reset to default: ${item.defaultValue}`, 'info');
  }

  async saveAndSync() {
    const loading = await this.loadingCtrl.create({
      message: 'Syncing Labels...',
      spinner: 'crescent'
    });
    await loading.present();

    const newOverrides: { [key: string]: string } = {};
    this.activeOverrides.forEach(o => {
      // Only save as override if it IS different from default
      if (o.customValue && o.customValue.trim() !== o.defaultValue.trim()) {
        newOverrides[o.key] = o.customValue;
      }
    });

    // Save to local storage via service
    this.labelService.saveOverrides(newOverrides);
    
    // Refresh the list to remove newly "reset" cards automatically
    this.loadCurrentOverrides();

    setTimeout(() => {
      loading.dismiss();
      this.showToast('Labels Synced Successfully! ✅', 'success');
      setTimeout(() => this.resetSwipe(), 1500);
    }, 1000);
  }

  private async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  // --- GESTURE LOGIC ---

  ionViewDidEnter() {
    this.initSwipeGesture();
  }

  initSwipeGesture() {
    const track = document.querySelector('.swipe-track') as HTMLElement;
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (!track || !thumb) return;

    const trackWidth = track.clientWidth - thumb.clientWidth - 12;

    const gesture = this.gestureCtrl.create({
      el: thumb,
      threshold: 0,
      gestureName: 'swipe-to-save',
      onMove: ev => {
        if (this.swipeCompleted) return;
        let x = ev.deltaX;
        if (x < 0) x = 0;
        if (x > trackWidth) x = trackWidth;
        thumb.style.transform = `translateX(${x}px)`;
        const progress = x / trackWidth;
        track.style.setProperty('--progress', `${progress}`);
      },
      onEnd: ev => {
        if (this.swipeCompleted) return;
        const x = ev.deltaX;
        if (x >= trackWidth * this.swipeThreshold) {
          this.swipeCompleted = true;
          thumb.style.transform = `translateX(${trackWidth}px)`;
          this.saveAndSync();
        } else {
          this.resetSwipe();
        }
      }
    });

    gesture.enable(true);
  }

  resetSwipe() {
    const thumb = document.querySelector('.swipe-handle') as HTMLElement;
    if (thumb) {
      thumb.style.transition = 'transform 0.3s ease-out';
      thumb.style.transform = 'translateX(0px)';
    }
    const track = document.querySelector('.swipe-track') as HTMLElement;
    if (track) track.style.setProperty('--progress', '0');
    this.swipeCompleted = false;
  }
}
