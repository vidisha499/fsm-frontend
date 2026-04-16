import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
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

  constructor(
    private labelService: LabelService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController
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
}
