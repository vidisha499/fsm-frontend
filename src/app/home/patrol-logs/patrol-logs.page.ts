


// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import * as L from 'leaflet';

// @Component({
//   selector: 'app-patrol-logs',
//   templateUrl: './patrol-logs.page.html',
//   styleUrls: ['./patrol-logs.page.scss'],
//   standalone: false
// })
// export class PatrolLogsPage implements OnInit {
//   public patrolLogs: any[] = [];
//   public isModalOpen = false;
//   public selectedMethod = '';
//   public selectedType = '';
//   public isDetailModalOpen = false;
//   public selectedPatrol: any = null;
//   public isSubmitting = false;
//   private detailMap!: L.Map;

//   private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

//   constructor(
//     private navCtrl: NavController,
//     private router: Router,
//     private http: HttpClient,
//     private toastCtrl: ToastController,
//     private alertCtrl: AlertController,
//     private loadingCtrl: LoadingController
//   ) {}

//   ngOnInit() { }
  
//   ionViewWillEnter() { 
//     this.loadPatrolLogs(); 
//     this.isSubmitting = false; 
//   }

//   async loadPatrolLogs() {
//     const loader = await this.loadingCtrl.create({ message: 'Loading logs...', mode: 'ios' });
//     await loader.present();
//     this.http.get(`${this.apiUrl}/logs`).subscribe({
//       next: (data: any) => { 
//         this.patrolLogs = data; 
//         loader.dismiss(); 
//       },
//       error: () => { 
//         loader.dismiss(); 
//         this.presentToast('Failed to load logs', 'danger'); 
//       }
//     });
//   }

//   viewDetails(log: any) {
//     this.selectedPatrol = log;
//     this.isDetailModalOpen = true;
//   }

//   onDetailModalPresent() {
//     // 500ms delay is necessary to ensure the DOM is ready inside the modal
//     setTimeout(() => {
//       this.initDetailMap();
//     }, 500); 
//   }

//   initDetailMap() {
//     // 1. Sanity Check for route data
//     if (!this.selectedPatrol?.route || this.selectedPatrol.route.length === 0) {
//       console.warn("No route data found for this log.");
//       return;
//     }

//     // 2. Clear existing map instance
//     if (this.detailMap) { 
//       this.detailMap.off();
//       this.detailMap.remove(); 
//     }

//     // 3. Prepare Coordinates
//     const coords = this.selectedPatrol.route.map((p: any) => [p.lat, p.lng]);

//     // 4. Initialize Map
//     this.detailMap = L.map('detailMap', { 
//       zoomControl: false,
//       attributionControl: false 
//     }).setView(coords[0], 16);

//     // 5. Add Tile Layer
//     L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
//       maxZoom: 20, 
//       subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
//     }).addTo(this.detailMap);

//     // 6. Add Marker or Polyline
//     if (coords.length === 1) {
//       L.marker(coords[0]).addTo(this.detailMap);
//     } else {
//       const polyline = L.polyline(coords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.detailMap);
//       this.detailMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
//     }

//     // 7. CRITICAL: Force refresh map size inside the modal container
//     setTimeout(() => { 
//       this.detailMap.invalidateSize(); 
//     }, 200);
//   }

//   async deleteLog(id: number, event: Event) {
//     event.stopPropagation();
//     const alert = await this.alertCtrl.create({
//       header: 'Delete Log',
//       message: 'Are you sure you want to remove this record?',
//       buttons: [
//         { text: 'Cancel', role: 'cancel' },
//         { text: 'Delete', handler: () => { this.processDelete(id); } }
//       ]
//     });
//     await alert.present();
//   }

//   private async processDelete(id: number) {
//     this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
//       next: () => {
//         this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
//         this.presentToast('Log deleted', 'success');
//       }
//     });
//   }

//   setOpen(isOpen: boolean) { 
//     this.isModalOpen = isOpen; 
//     if (!isOpen) this.isSubmitting = false;
//   }

//   async savePatrol() {
//     if (!this.selectedMethod || !this.selectedType) {
//       this.presentToast('Please select Method and Type', 'warning');
//       return;
//     }
    
//     this.isSubmitting = true; 
//     const name = `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`;
//     localStorage.setItem('temp_patrol_name', name);

//     setTimeout(() => {
//       this.isModalOpen = false;
//       this.navCtrl.navigateForward('/patrol-active');
//     }, 800);
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
//     await toast.present();
//   }

//   goBack() { this.navCtrl.navigateRoot('/home'); }
// }


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
  private detailMap: any; // Using any to avoid leaflet typing issues if not strictly configured

  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef // Added for force UI update
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
    // Force Angular to detect that selectedPatrol is now set
    this.cdr.detectChanges();
  }

  onDetailModalPresent() {
    // Increased delay to ensure modal animation is 100% finished
    setTimeout(() => {
      this.initDetailMap();
    }, 800); 
  }

  initDetailMap() {
    // 1. Sanity Check
    if (!this.selectedPatrol?.route || this.selectedPatrol.route.length === 0) {
      console.warn("No route data found.");
      return;
    }

    // 2. Clear existing map instance safely
    if (this.detailMap) { 
      this.detailMap.remove(); 
      this.detailMap = null;
    }

    // 3. Prepare Coordinates
    const coords = this.selectedPatrol.route.map((p: any) => [p.lat, p.lng]);

    // 4. Initialize Map with absolute container reference
    const mapElement = document.getElementById('detailMap');
    if (!mapElement) {
      console.error("Map element not found in DOM");
      return;
    }

    this.detailMap = L.map(mapElement, { 
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true
    }).setView(coords[0], 16);

    // 5. Use OpenStreetMap tiles (standard) to test if Google tiles are blocked
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.detailMap);

    // 6. Add Marker or Polyline
    if (coords.length === 1) {
      L.marker(coords[0]).addTo(this.detailMap);
    } else {
      const polyline = L.polyline(coords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.detailMap);
      this.detailMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }

    // 7. THE FIX: Double call to invalidateSize
    setTimeout(() => { 
      this.detailMap.invalidateSize(); 
      console.log("Map size invalidated");
    }, 100);
    
    // Final check after a second delay
    setTimeout(() => {
        this.detailMap.invalidateSize();
    }, 500);
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
    setTimeout(() => {
      this.isModalOpen = false;
      this.navCtrl.navigateForward('/patrol-active');
    }, 800);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
    await toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }
}