


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-patrol-logs',
  templateUrl: './patrol-logs.page.html',
  styleUrls: ['./patrol-logs.page.scss'],
  standalone: false
})
export class PatrolLogsPage implements OnInit {
  public patrolLogs: any[] = [];
  public isModalOpen = false;
  public selectedMethod = '';
  public selectedType = '';
  public isDetailModalOpen = false;
  public selectedPatrol: any = null;
  public isSubmitting = false; // Slider animation state
  private detailMap!: L.Map;

  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() { }
  ionViewWillEnter() { 
    this.loadPatrolLogs(); 
    this.isSubmitting = false; 
  }

  async loadPatrolLogs() {
    const loader = await this.loadingCtrl.create({ message: 'Loading...', mode: 'ios' });
    await loader.present();
    this.http.get(`${this.apiUrl}/logs`).subscribe({
      next: (data: any) => { this.patrolLogs = data; loader.dismiss(); },
      error: () => { loader.dismiss(); this.presentToast('Failed to load logs', 'danger'); }
    });
  }

  viewDetails(log: any) {
    this.selectedPatrol = log;
    this.isDetailModalOpen = true;
  }

  onDetailModalPresent() {
    setTimeout(() => {
      this.initDetailMap();
    }, 400); 
  }

  initDetailMap() {
    const coords = this.selectedPatrol?.route || [];
    if (this.detailMap) { this.detailMap.remove(); }

    // Default View agar route nahi hai
    const startPoint: L.LatLngExpression = (coords.length > 0) ? [coords[0].lat, coords[0].lng] : [21.1458, 79.0882];
    
    this.detailMap = L.map('detailMap', { zoomControl: false }).setView(startPoint, 16);
    
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
      maxZoom: 20, 
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
    }).addTo(this.detailMap);

    if (coords.length > 1) {
      // Travelled Route Draw karna
      const path = coords.map((p: any) => [p.lat, p.lng]);
      const polyline = L.polyline(path, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.detailMap);
      
      // Route ke hisaab se map fit karna
      this.detailMap.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      
      // Start aur End points par marker lagana
      L.circleMarker(path[0], { radius: 5, color: 'blue' }).addTo(this.detailMap).bindPopup('Start');
      L.circleMarker(path[path.length - 1], { radius: 5, color: 'red' }).addTo(this.detailMap).bindPopup('End');
    } else if (coords.length === 1) {
      L.marker([coords[0].lat, coords[0].lng]).addTo(this.detailMap);
    }
    
    setTimeout(() => { this.detailMap.invalidateSize(); }, 200);
  }

  // ... Baki methods same rahenge (deleteLog, savePatrol, etc.) ...
  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: 'Remove this record?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', handler: () => { this.processDelete(id); } }
      ]
    });
    await alert.present();
  }

  private async processDelete(id: number) {
    this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
      next: () => {
        this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
        this.presentToast('Deleted', 'success');
      }
    });
  }

  setOpen(isOpen: boolean) { 
    this.isModalOpen = isOpen; 
    if (!isOpen) this.isSubmitting = false;
  }

<<<<<<< Updated upstream
 async savePatrol() {
  if (!this.selectedMethod || !this.selectedType) {
    this.presentToast('Select Method & Type', 'warning');
    return;
=======
  async savePatrol() {
    if (!this.selectedMethod || !this.selectedType) {
      this.presentToast('Select Method & Type', 'warning');
      return;
    }
    this.isSubmitting = true; 
    localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
    setTimeout(() => {
      this.isModalOpen = false;
      this.router.navigate(['/patrol-active']);
    }, 800);
>>>>>>> Stashed changes
  }
  
  this.isSubmitting = true; 
  const name = `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`;
  localStorage.setItem('temp_patrol_name', name);

  setTimeout(() => {
    // Navigating se pehle modal close karein
    this.isModalOpen = false;
    
    // Thoda sa gap taaki modal smoothly band ho jaye navigation se pehle
    setTimeout(() => {
      this.router.navigate(['/patrol-active']);
    }, 100);
  }, 800);
}

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
    await toast.present();
  }
  goBack() { this.navCtrl.navigateRoot('/home'); }
}