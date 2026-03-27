import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-patrol-active',
  templateUrl: './patrol-active.page.html',
  styleUrls: ['./patrol-active.page.scss'],
  standalone: false
})
export class PatrolActivePage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('endTripKnob', { read: ElementRef }) endTripKnob!: ElementRef;
  @ViewChild('endTripTrack', { read: ElementRef }) endTripTrack!: ElementRef;

  // Session State
  activePatrolId: string | null = null;
  patrolName: string = 'Active Patrol';
  recentSightings: any[] = [];
  selectedZoomImage: string | null = null;

  // Map and Tracking
  map!: L.Map;
  marker!: L.Marker;
  private sightingMarkersLayer = L.layerGroup();
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any;
  isSubmitting: boolean = false;
  isFinished: boolean = false;
  capturedPhotos: string[] = [];
  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  routePoints: { lat: number; lng: number }[] = [];
  startTime: string = new Date().toISOString();

  private apiUrl: string = `${environment.apiUrl}/patrols`;

  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private gestureCtrl: GestureController,
    private domCtrl: DomController,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
  // 1. Pehle Check karein ki kya URL mein koi ID aayi hai (Resume Case)
  this.route.queryParams.subscribe(params => {
    const resumeId = params['id'];
    const isResuming = params['isResuming'];

    if (resumeId) {
      // Agar Logs page se click karke aaye hain
      this.activePatrolId = resumeId;
      localStorage.setItem('active_patrol_id', resumeId); // Sync storage
      console.log("Resuming Patrol ID:", this.activePatrolId);
    } else {
      // 2. Agar normal start karke aaye hain
      this.activePatrolId = localStorage.getItem('active_patrol_id');
    }

    this.patrolName = localStorage.getItem('temp_patrol_name') || 'Active Patrol';

    // 3. Protection: Agar dono jagah se ID nahi mili toh hi wapas bhejein
    if (!this.activePatrolId) {
      console.warn("No Active Patrol ID found, redirecting...");
      this.navCtrl.navigateRoot('/patrol-logs'); 
      return;
    }

    // 4. Timer start karein
    this.startTimer();
    
    // 5. (Optional) Agar Resume ho raha hai toh purana data fetch karein
    if (isResuming) {
      // Yahan aap ek function call kar sakte hain purani route fetch karne ke liye
      // this.loadExistingPatrolData(this.activePatrolId);
    }
  });
}

ionViewWillLeave() {
  // Jab user page chhod raha ho, toh agar koi loading overlay khula hai toh use band kar dein
  this.loadingCtrl.dismiss().catch(() => {});
}
  goBack() {
  // Simple navigation wapas logs page par
  this.navCtrl.navigateBack('/patrol-logs');
}

  ngAfterViewInit() {
    this.initMap();
    this.setupEndTripGesture();
  }

  async ionViewDidEnter() {
    this.refreshRecentSightings();
  }

  // --- Sightings & Navigation ---
  goToSightings(type: string) {
    if (this.activePatrolId) {
      this.navCtrl.navigateForward(['/home/sightings'], {
        queryParams: { patrolId: this.activePatrolId, type: type }
      });
    }
  }
// Is function ko replace karein
viewDetails(log: any) {
  if (log.status === 'PENDING') {
    // Agar status PENDING hai (Active Patrol table se aaya hai)
    this.navCtrl.navigateForward(['/home/patrol-active'], { // <--- Path check kar lein (/home/ ya direct)
      queryParams: { 
        id: log.id,
        isResuming: true 
      }
    });
  } else {
    // Agar COMPLETED hai (Logs table se aaya hai)
    this.navCtrl.navigateForward(['/patrol-details', log.id]);
  }
}


refreshRecentSightings() {
  if (!this.activePatrolId) return;
  this.http.get(`${this.apiUrl}/active`).subscribe({
    next: (data: any) => {
      const active = Array.isArray(data)
        ? data.find((p: any) => p.id.toString() === this.activePatrolId)
        : data;
      
      if (active) {
        this.recentSightings = active.obs_details || active.obsDetails || [];
        
        // --- ADD THIS LOG ---
        console.log('All sightings from server:', this.recentSightings);
        // Look at the console: Does the "Death" entry have lat and lng values?
        
        this.updateSightingMarkers();
        this.cdr.detectChanges();
      }
    }
  });
}

ngOnDestroy() {
  // Clear the timer so it doesn't run in the background
  if (this.timerInterval) clearInterval(this.timerInterval);

  // Stop watching the GPS to save battery
  if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });

  // NEW: Remove all the sighting dots from memory
  if (this.sightingMarkersLayer) {
    this.sightingMarkersLayer.clearLayers();
  }

  // Destroy the map instance
  if (this.map) {
    this.map.remove();
  }
}

private updateSightingMarkers() {
  if (!this.map) return;
  
  // 1. Clear existing sighting markers
  this.sightingMarkersLayer.clearLayers();

  // 2. Loop through sightings and add markers if they have coordinates
  this.recentSightings.forEach(s => {
    if (s.lat && s.lng) {
      const icon = this.createSightingIcon(s.category);
      const marker = L.marker([s.lat, s.lng], { icon: icon });
      
      // Optional: Add a popup
      marker.bindPopup(`<b>${s.category}</b><br>${s.species || ''}`);
      
      this.sightingMarkersLayer.addLayer(marker);
    }
  });
}



  async initMap() {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    this.lastLatLng = L.latLng(lat, lng);
    
    this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
    }).addTo(this.map);
    
    // Add the sightings layer to the map here
    this.sightingMarkersLayer.addTo(this.map);
    
    this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
    this.startTracking();
  } catch (e) { 
    console.error("GPS init failed", e); 
  }

}




private createSightingIcon(category: string) {
  const cat = category?.toLowerCase().trim() || 'other';
  const colors: any = {
    animal: '#ca8a04',
    water: '#0284c7',
    impact: '#ea580c',
    death: '#dc2626',
    dead: '#dc2626', // Add fallback
    felling: '#16a34a',
    other: '#64748b'
  };

  const color = colors[cat] || colors['other'];

  return L.divIcon({
    className: 'custom-sighting-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 12px;
        height: 12px;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}
  


async startTracking() {
  this.gpsWatchId = await Geolocation.watchPosition({ 
    enableHighAccuracy: true,
    maximumAge: 3000 
  }, (position) => {
    if (position && this.map) {
      const current = L.latLng(position.coords.latitude, position.coords.longitude);
      this.marker.setLatLng(current);
      
      // ADD THIS LINE: Push the new point to your local array
      this.routePoints.push({ lat: current.lat, lng: current.lng });

      if (this.lastLatLng) {
        const dist = this.lastLatLng.distanceTo(current);
        if (dist > 10) { 
          this.totalDistanceKm += (dist / 1000);
          this.syncLocation(current.lat, current.lng);
        }
      }
      this.lastLatLng = current;
      this.cdr.detectChanges();
    }
  });
}

  syncLocation(lat: number, lng: number) {
    if (this.activePatrolId) {
      this.http.patch(`${this.apiUrl}/active/${this.activePatrolId}/route`, { lat, lng }).subscribe();
    }
  }

  recenterMap() { 
    if (this.lastLatLng && this.map) this.map.panTo(this.lastLatLng); 
  }

  // --- Media Logic ---
  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({ 
        quality: 40, 
        resultType: CameraResultType.DataUrl, 
        source: CameraSource.Prompt
      });

      if (image?.dataUrl) {
        this.capturedPhotos = [...this.capturedPhotos, image.dataUrl];
        this.showToast('Photo added');
      }
    } catch (e) { console.warn('Cancelled'); }
  }

  // --- Trip End Logic ---
  // async handleEndTrip(isManual: boolean = false) {
  //   if (!isManual || this.isSubmitting) return;

  // this.isSubmitting = true;
    
  //   const loaderMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_FINAL'));
  //   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
  //   await loader.present();

  //   const rId = localStorage.getItem('ranger_id') || '1';
  //   const logPayload = {
  //     rangerId: parseInt(rId),
  //     patrolName: this.patrolName,
  //     startTime: this.startTime,
  //     endTime: new Date().toISOString(),
  //     distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
  //     duration: this.timerDisplay,
  //     status: 'COMPLETED',
      
  //     photos: this.capturedPhotos, 
  //     route: this.routePoints,
  //     observationData: { Details: this.recentSightings }
  //   };

  //   this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
  //     next: async () => {
  //       await loader.dismiss();
  //       localStorage.removeItem('active_patrol_id');
  //       localStorage.removeItem('temp_patrol_name');
        
  //       const successMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_SUCCESS'));
  //       this.showToast(successMsg);
  //       this.navCtrl.navigateRoot('/patrol-logs');
  //     },
  //     error: async (err) => {
  //       await loader.dismiss();
  //       this.isSubmitting = false;
  //       const errorMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
  //       this.showToast(errorMsg);
  //     }
  //   });
  // }

  async handleEndTrip(isManual: boolean = false) {
  if (!isManual || this.isSubmitting) return;

  this.isSubmitting = true;
  
  const loaderMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_FINAL'));
  const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
  await loader.present();

  // Retrieve session data
  const rId = localStorage.getItem('ranger_id');
  const cId = localStorage.getItem('company_id');
  // const rName = localStorage.getItem('ranger_name') || 'Ranger';
  const rName = localStorage.getItem('ranger_username') || 
                localStorage.getItem('ranger_name') || 
                'Ranger';

  const logPayload = {
    rangerId: rId ? parseInt(rId) : null,
    companyId: cId ? parseInt(cId) : null, // Added to ensure Admin visibility
    // ranger_name: rName,    
    ranger_name: rName,                // Crucial for the Backend Alert trigger
    patrolName: this.patrolName,
    startTime: this.startTime,
    endTime: new Date().toISOString(),
    distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
    duration: this.timerDisplay,
    status: 'COMPLETED',
    photos: this.capturedPhotos, 
    route: this.routePoints,
    observationData: { Details: this.recentSightings }
  };

  this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
    next: async () => {
      await loader.dismiss();
      // Clean up session
      localStorage.removeItem('active_patrol_id');
      localStorage.removeItem('temp_patrol_name');
      
      const successMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_SUCCESS'));
      this.showToast(successMsg, 'success');
      this.navCtrl.navigateRoot('/home/patrol-logs');
    },
    error: async (err) => {
      await loader.dismiss();
      this.isSubmitting = false;
      // Reset the slider knob so user can try again
      this.domCtrl.write(() => {
        if (this.endTripKnob) this.endTripKnob.nativeElement.style.transform = `translateX(0px)`;
      });
      const errorMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
      this.showToast(errorMsg, 'danger');
    }
  });
}

  
  

  setupEndTripGesture() {
    if (!this.endTripKnob) return;
    const knob = this.endTripKnob.nativeElement;
    const track = this.endTripTrack.nativeElement;
    
    const gesture = this.gestureCtrl.create({
      el: knob,
      gestureName: 'end-trip',
      onMove: ev => {
        const max = track.clientWidth - knob.clientWidth - 12;
        let x = Math.max(0, Math.min(ev.deltaX, max));
        this.domCtrl.write(() => knob.style.transform = `translateX(${x}px)`);
      },
      // onEnd: ev => {
      //   const max = track.clientWidth - knob.clientWidth - 12;
      //   if (ev.deltaX > max * 0.8) {
      //     this.handleEndTrip();
      //   } else {
      //     this.domCtrl.write(() => knob.style.transform = `translateX(0px)`);
      //   }
      // }
      // setupEndTripGesture function ke andar
onEnd: ev => {
    const max = track.clientWidth - knob.clientWidth - 12;
    if (ev.deltaX > max * 0.8) {
        // Yahan 'true' pass karein taaki function ko pata chale slide hua hai
        this.handleEndTrip(true); 
    } else {
        this.domCtrl.write(() => knob.style.transform = `translateX(0px)`);
    }
}
    });
    gesture.enable(true);
  }

  // --- Helper Functions ---
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
      const h = Math.floor(this.seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((this.seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (this.seconds % 60).toString().padStart(2, '0');
      this.timerDisplay = `${h}:${m}:${s}`;
      this.cdr.detectChanges();
    }, 1000);
  }

  

  async showToast(message: string, color: string = 'dark') {
  const toast = await this.toastCtrl.create({
    message: message,
    duration: 2000,
    position: 'bottom',
    color: color // This allows you to pass 'danger' for errors or 'success' for deletions
  });
  await toast.present();
}


  openZoom(imgUrl: string) { this.selectedZoomImage = imgUrl; }
  closeZoom() { this.selectedZoomImage = null; }


viewSightingDetails(sighting: any, index: number) {
  // Ensure the 'sighting' object being passed is the specific one from the loop
  const tempId = sighting.id || `temp-${index}`;
  
  this.navCtrl.navigateForward(['/sightings-details', tempId], {
    state: { data: sighting }
  });
}

async confirmDeleteLog(index: number, event: Event) {
  event.stopPropagation(); // Prevents opening the details page

  const alert = await this.alertCtrl.create({
    header: 'Remove Sighting?',
    message: 'Are you sure you want to delete this log from your current session?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => {
          this.recentSightings.splice(index, 1);
          this.showToast('Log removed successfully');
        }
      }
    ]
  });

  await alert.present();
}


}