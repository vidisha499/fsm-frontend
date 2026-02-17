


import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  public isSubmitting = false;
  public mapLoading = true; // Added for loading state
  private detailMap: any;

  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { }
  
  ionViewWillEnter() { 
    this.loadPatrolLogs(); 
    this.isSubmitting = false; 
  }

  async loadPatrolLogs() {
    const loader = await this.loadingCtrl.create({ message: 'Loading logs...', mode: 'ios' });
    await loader.present();
    this.http.get(`${this.apiUrl}/logs`).subscribe({
      next: (data: any) => { 
        this.patrolLogs = data; 
        loader.dismiss(); 
      },
      error: () => { 
        loader.dismiss(); 
        this.presentToast('Failed to load logs', 'danger'); 
      }
    });
  }

  viewDetails(log: any) {
    this.selectedPatrol = log;
    this.isDetailModalOpen = true;
    this.mapLoading = true; // Show "being loaded" message
    this.cdr.detectChanges();
  }

  onDetailModalPresent() {
    setTimeout(() => {
      this.initDetailMap();
    }, 800); 
  }

  initDetailMap() {
    const mapElement = document.getElementById('detailMap');
    if (!mapElement) return;

    if (this.detailMap) { 
      this.detailMap.remove(); 
      this.detailMap = null;
    }

    // Default center if no route exists
    let center: L.LatLngExpression = [0, 0];
    let coords: L.LatLngExpression[] = [];

    if (this.selectedPatrol?.route && this.selectedPatrol.route.length > 0) {
      coords = this.selectedPatrol.route.map((p: any) => [p.lat, p.lng]);
      center = coords[0];
    }

    this.detailMap = L.map(mapElement, { 
      zoomControl: false,
      attributionControl: false
    }).setView(center, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.detailMap);

    // DRAW POLYLINE OR MARKER
    if (coords.length > 1) {
      const polyline = L.polyline(coords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.detailMap);
      this.detailMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    } else if (coords.length === 1) {
      L.marker(coords[0]).addTo(this.detailMap);
    }

    this.mapLoading = false; // Hide loader text
    
    setTimeout(() => { 
      this.detailMap.invalidateSize(); 
      this.cdr.detectChanges();
    }, 200);
  }

  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: 'Are you sure?',
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
        this.presentToast('Log deleted', 'success');
      }
    });
  }

  setOpen(isOpen: boolean) { 
    this.isModalOpen = isOpen; 
    if (!isOpen) this.isSubmitting = false;
  }

 async savePatrol() {
  if (!this.selectedMethod || !this.selectedType) {
    this.presentToast('Please select Method and Type', 'warning');
    return;
  }

  this.isSubmitting = true; 
  const name = `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`;
  localStorage.setItem('temp_patrol_name', name);

  // --- YE WALA HISSA ADD KIYA HAI DATABASE ENTRY KE LIYE ---
  const loader = await this.loadingCtrl.create({ message: 'Starting Patrol Session...', mode: 'ios' });
  await loader.present();

  const rangerId = 1; // Aapka default ranger ID
  
  // Backend ko batana ki trip shuru ho gayi hai
  this.http.post(`${this.apiUrl}/active`, { rangerId: rangerId }).subscribe({
    next: (res: any) => {
      loader.dismiss();
      console.log("Patrol Session Created ID:", res.id);
      
      // Session ID ko storage mein save karein backup ke liye
      localStorage.setItem('active_patrol_id', res.id.toString());
      
      this.isModalOpen = false;
      this.navCtrl.navigateForward('/home/patrol-active');
    },
    error: (err) => {
      loader.dismiss();
      this.isSubmitting = false;
      console.error("Failed to start patrol in DB:", err);
      this.presentToast('Database Error: Trip could not start', 'danger');
    }
  });
}

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
    await toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }
}