


import { Component, OnInit,OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet'; // Import Leaflet

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.page.html',
  styleUrls: ['./incident-detail.page.scss'],
  standalone: false
})
// export class IncidentDetailPage implements OnInit,OnDestroy {

export class IncidentDetailPage implements OnInit, OnDestroy {
  incident: any;
  map: any; // Add map variable
  currentRanger: string = 'Ranger';
  isSubmitting: boolean = false;
  selectedZoomImage: string | null = null;
  private apiUrl: string = `${environment.apiUrl}/incidents`;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController,
    public toastCtrl: ToastController,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnDestroy() {
  if (this.map) {
    this.map.remove();
  }
}

  ngOnInit() {
    // Try DataService first for speed
    this.incident = this.dataService.getSelectedIncident();

    const id = this.route.snapshot.paramMap.get('id');
    if (!this.incident && id) {
      this.fetchIncidentFromBackend(id);
    }

    const storedName = localStorage.getItem('ranger_username');
    if (storedName) {
      this.currentRanger = storedName;
    }
  }
 

  ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fetchIncidentFromBackend(id);
    }
  }

  // fetchIncidentFromBackend(id: string) {
  //   this.http.get(`${this.apiUrl}/${id}`).subscribe({
  //     next: (data: any) => {
  //       let parsedPhotos = [];
  //       if (data.photos) {
  //         try {
  //           parsedPhotos = Array.isArray(data.photos) ? data.photos : JSON.parse(data.photos);
  //         } catch (e) {
  //           parsedPhotos = [];
  //         }
  //       }

  //       this.incident = {
  //         ...data,
  //         criteria: data.incidentCriteria,
  //         priority: data.responsePriority,
  //         latitude: data.latitude,   // Add this
  // longitude: data.longitude,
  //         observation: data.fieldObservation,
  //         cause: data.rootCause,
  //         photos: parsedPhotos.length > 0 ? parsedPhotos : (data.photo ? [data.photo] : []),
  //         photo: data.photo || parsedPhotos[0],
          
  //       };
  //       setTimeout(() => { this.initDetailMap(); }, 500);
  //     },
  //     error: async (err) => {
  //       const msg = await this.translate.get('INCIDENT.SYNC_ERROR').toPromise();
  //       this.presentToast(msg, 'danger');
  //     }
  //   });
  // }

fetchIncidentFromBackend(id: string) {
  this.http.get(`${this.apiUrl}/${id}`).subscribe({
    next: (data: any) => {
      console.log('Backend Se Raw Data Aaya:', data); // Debugging ke liye

      let rawPhotos = [];
      if (data.photos) {
        try {
          // Check: Agar string hai toh parse karo, agar pehle se array hai toh direct use karo
          rawPhotos = typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos;
        } catch (e) {
          console.error('JSON Parse Error:', e);
          rawPhotos = [];
        }
      }

      // --- CRITICAL FIX: Base64 Formatting ---
      const formatImage = (img: string) => {
        if (!img) return null;
        // Agar pehle se prefix hai toh wahi rehne do, nahi toh add karo
        return img.startsWith('data:image') ? img : `data:image/jpeg;base64,${img}`;
      };

      const formattedPhotos = Array.isArray(rawPhotos) 
        ? rawPhotos.map(p => formatImage(p)).filter(p => p !== null)
        : [];

      this.incident = {
        ...data,
        criteria: data.incidentCriteria,
        priority: data.responsePriority,
        latitude: data.latitude,
        longitude: data.longitude,
        observation: data.fieldObservation,
        cause: data.rootCause,
        // Yahan photos aur main photo dono ko format kar diya
        photos: formattedPhotos,
        photo: formattedPhotos[0] || formatImage(data.photo)
      };

      console.log('Incident Data Processed:', this.incident);
      setTimeout(() => { this.initDetailMap(); }, 500);
    },
    error: async (err) => {
      console.error('Fetch Error:', err);
      const msg = await this.translate.get('INCIDENT.SYNC_ERROR').toPromise();
      this.presentToast(msg, 'danger');
    }
  });
}

initDetailMap() {
  if (!this.incident?.latitude || !this.incident?.longitude) return;

  if (this.map) { this.map.remove(); }

  const lat = parseFloat(this.incident.latitude);
  const lng = parseFloat(this.incident.longitude)

  this.map = L.map('detailMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([this.incident.latitude, this.incident.longitude], 15);

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(this.map);

  L.marker([this.incident.latitude, this.incident.longitude], {
    icon: L.divIcon({
      className: 'incident-pin',
      html: `<div style="font-size: 24px;">📍</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    })
  }).addTo(this.map);
}

  // Translation Helper for DB Values
getTranslationKey(value: string | undefined | null): string {
  // Check 'value' instead of 'val' to fix the "Cannot find name" error
  if (!value) { 
    return 'UNKNOWN'; 
  }
  
  // Safe conversion to string to handle 'null' or 'undefined' types
  return value.toString().trim().toUpperCase().replace(/\s+/g, '_');
}

  async markAsResolved() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    setTimeout(async () => {
      this.isSubmitting = false;
      const msg = await this.translate.get('INCIDENT.SUCCESS_RESOLVED').toPromise();
      this.presentToast(msg, 'success');
      this.navCtrl.back();
    }, 2000);
  }

  openZoom(photo: string) { this.selectedZoomImage = photo; }
  closeZoom() { this.selectedZoomImage = null; }
  goBack() { this.navCtrl.navigateRoot('/home/incidents'); }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2000, color, position: 'bottom'
    });
    toast.present();
  }

  formatDetailDate(dateString: string) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  // 1. Manual IST Offset Correction (5.5 hours minus)
  // Taaki Feb 24 (UTC) wapas Feb 23 (Local) ban jaye
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const localDate = new Date(date.getTime() - IST_OFFSET);

  // 2. Exact same format manual build karein: "February 23, 2026 • 9:12 PM"
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const month = monthNames[localDate.getMonth()];
  const day = localDate.getDate();
  const year = localDate.getFullYear();
  
  let hours = localDate.getHours();
  const minutes = localDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'

  // Exact wahi format jo aapko chahiye tha
  return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
}
}