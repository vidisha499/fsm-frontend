


// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { IncidentService } from '../../services/incident.service';
// import { NavController, ToastController } from '@ionic/angular';
// import * as L from 'leaflet';

// @Component({
//   selector: 'app-incident-detail-admin',
//   templateUrl: './incident-detail-admin.page.html',
//   styleUrls: ['./incident-detail-admin.page.scss'],
//   standalone: false
// })
// export class IncidentDetailAdminPage implements OnInit, OnDestroy {
//   incident: any;
//   isLoading: boolean = true;
//   map!: L.Map;
//   selectedZoomImage: string | null = null;

//   constructor(
//     private route: ActivatedRoute,
//     private incidentService: IncidentService,
//     private navCtrl: NavController,
//     private toastCtrl: ToastController
//   ) {}

//   ngOnInit() {
//     const id = this.route.snapshot.paramMap.get('id');
//     if (id) {
//       this.loadDetails(+id);
//     }
//   }

//   ngOnDestroy() {
//     if (this.map) { this.map.remove(); }
//   }

//   loadDetails(id: number) {
//     this.isLoading = true;
//     this.incidentService.getOne(id).subscribe({
//       next: (data: any) => { 
//         this.incident = data;
//         this.isLoading = false;
//         setTimeout(() => this.initMap(), 500);
//       },
//       error: (err: any) => {
//         this.isLoading = false;
//         this.presentToast('Error loading record', 'danger');
//       }
//     });
//   }

//   initMap() {
//     if (!this.incident?.latitude) return;
//     this.map = L.map('mapDetail', { zoomControl: false, attributionControl: false })
//       .setView([this.incident.latitude, this.incident.longitude], 15);

//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

//     L.marker([this.incident.latitude, this.incident.longitude]).addTo(this.map);
//   }

//   updateStatus(event: any) {
//     const newStatus = event.detail.value;
//     this.incidentService.updateStatus(this.incident.id, newStatus).subscribe({
//       next: () => {
//         this.incident.status = newStatus;
//         this.presentToast(`Incident marked as ${newStatus}`, 'success');
//       },
//       error: (err: any) => this.presentToast('Failed to update status', 'danger')
//     });
//   }

//   formatImage(photo: any) {
//     if (!photo) return null;
//     return photo.startsWith('data:image') ? photo : `data:image/jpeg;base64,${photo}`;
//   }

//   formatDetailDate(dateString: string) {
//     if (!dateString) return '';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { 
//       month: 'long', day: 'numeric', year: 'numeric' 
//     }) + ' • ' + date.toLocaleTimeString('en-US', { 
//       hour: 'numeric', minute: '2-digit', hour12: true 
//     });
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({
//       message, duration: 2000, color, position: 'bottom'
//     });
//     toast.present();
//   }

//   openZoom(photo: any) { this.selectedZoomImage = photo; }
//   closeZoom() { this.selectedZoomImage = null; }
//   goBack() { this.navCtrl.back(); }
// }

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IncidentService } from '../../services/incident.service';
import { NavController, ToastController } from '@ionic/angular';
import * as L from 'leaflet';

@Component({
  selector: 'app-incident-detail-admin',
  templateUrl: './incident-detail-admin.page.html',
  styleUrls: ['./incident-detail-admin.page.scss'],
  standalone: false
})
export class IncidentDetailAdminPage implements OnInit, OnDestroy {
  incident: any;
  isLoading: boolean = true;
  map!: L.Map;
  selectedZoomImage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private incidentService: IncidentService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetails(+id);
    }
  }

  ngOnDestroy() {
    if (this.map) { this.map.remove(); }
  }

  loadDetails(id: number) {
    this.isLoading = true;
    this.incidentService.getOne(id).subscribe({
      next: (data: any) => { 
        this.incident = data;
        this.isLoading = false;
        setTimeout(() => this.initMap(), 500);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.presentToast('Error loading record', 'danger');
      }
    });
  }

  initMap() {
    if (!this.incident?.latitude) return;
    this.map = L.map('mapDetail', { zoomControl: false, attributionControl: false })
      .setView([this.incident.latitude, this.incident.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    L.marker([this.incident.latitude, this.incident.longitude]).addTo(this.map);
  }

  updateStatus(event: any) {
    const newStatus = event.detail.value;
    this.incidentService.updateStatus(this.incident.id, newStatus).subscribe({
      next: () => {
        this.incident.status = newStatus;
        this.presentToast(`Incident marked as ${newStatus}`, 'success');
      },
      error: (err: any) => this.presentToast('Failed to update status', 'danger')
    });
  }

  formatImage(photo: any) {
    if (!photo) return null;
    return photo.startsWith('data:image') ? photo : `data:image/jpeg;base64,${photo}`;
  }

  formatDetailDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric' 
    }) + ' • ' + date.toLocaleTimeString('en-US', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2000, color, position: 'bottom'
    });
    toast.present();
  }

  openZoom(photo: any) { this.selectedZoomImage = photo; }
  closeZoom() { this.selectedZoomImage = null; }
  goBack() { this.navCtrl.back(); }
}