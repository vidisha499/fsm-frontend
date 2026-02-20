import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

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

  // Map and Tracking
  map!: L.Map;
  marker!: L.Marker;
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

  // URL set to Localhost as per our recent fix
  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

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
    private domCtrl: DomController
  ) { }

  ngOnInit() {
  this.activePatrolId = localStorage.getItem('active_patrol_id');
  this.patrolName = localStorage.getItem('temp_patrol_name') || 'Active Patrol';

  if (!this.activePatrolId) {
    this.showToast('No active session found.');
    // Change this from /home/patrol-logs to /patrol-logs
    this.navCtrl.navigateRoot('/patrol-logs'); 
    return;
  }
  this.startTimer();
}

  ngAfterViewInit() {
    this.initMap();
    this.setupEndTripGesture();
  }

  // Back aane par data refresh karne ke liye
  async ionViewDidEnter() {
    this.refreshRecentSightings();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.map) this.map.remove();
    this.stopTracking();
  }

  // Navigation to Sightings Page
  goToSightings(type: string) {
    if (this.activePatrolId) {
      this.navCtrl.navigateForward(['/home/sightings'], {
        queryParams: { patrolId: this.activePatrolId, type: type }
      });
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
        // Check both camelCase and snake_case
        this.recentSightings = active.obs_details || active.obsDetails || [];
        console.log("Updated Sightings List:", this.recentSightings);
      }
    },
    error: (err) => console.error("Refresh failed", err)
  });
}

  async initMap() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.lastLatLng = L.latLng(lat, lng);
      this.routePoints.push({ lat, lng });
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(this.map);
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      this.startTracking();
    } catch (e) { console.error("GPS init failed", e); }
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        this.marker.setLatLng(current);
        this.routePoints.push({ lat: current.lat, lng: current.lng });
        if (this.lastLatLng) {
          const dist = this.lastLatLng.distanceTo(current);
          if (dist > 5) {
            this.totalDistanceKm += (dist / 1000);
            this.syncLocation(current.lat, current.lng);
          }
        }
        this.lastLatLng = current;
      }
    });
  }

  syncLocation(lat: number, lng: number) {
    if (this.activePatrolId) {
      this.http.patch(`${this.apiUrl}/active/${this.activePatrolId}/route`, { lat, lng }).subscribe();
    }
  }

  // async takeQuickPhoto() {
  //   try {
  //     const image = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
  //     this.capturedPhoto = image.dataUrl || null;
  //   } catch (e) { console.warn('Photo cancelled'); }
  // }


  async takeQuickPhoto() {
  try {
    const image = await Camera.getPhoto({ 
      quality: 90, 
      resultType: CameraResultType.DataUrl, 
      source: CameraSource.Camera 
    });
    if (image.dataUrl) {
      this.capturedPhotos.push(image.dataUrl); // Add to array instead of replacing
      this.showToast('Photo captured!');
    }
  } catch (e) { console.warn('Photo cancelled'); }
}

  
  async handleEndTrip() {
  if (this.isSubmitting) return;
  this.isSubmitting = true;

  const loader = await this.loadingCtrl.create({ 
    message: 'Syncing Final Logs...', 
    mode: 'ios' 
  });
  await loader.present();

  // Get the actual ranger ID from storage
  const rId = localStorage.getItem('ranger_id') || '1';

const logPayload = {
   rangerId: parseInt(rId),
   patrolName: this.patrolName,
   startTime: this.startTime,
   endTime: new Date().toISOString(),
   distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
   duration: this.timerDisplay,
   status: 'COMPLETED',
  observationData: { 
    Details: this.recentSightings // These are your Animal/Water sightings
  },
  patrolPhotos: this.capturedPhotos // These are ONLY the photos clicked in the main camera-frame
};

  // Ensure apiUrl doesn't have double 'api' or 'patrols'
  this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
    next: async () => {
      await loader.dismiss();
      
      // Cleanup session
      localStorage.removeItem('active_patrol_id');
      localStorage.removeItem('temp_patrol_name');
      
      this.showToast('Patrol ended and synced successfully');

      // Fixed: Path matches AppRoutingModule root path
      this.navCtrl.navigateRoot('/patrol-logs');
    },
    error: (err) => {
      loader.dismiss();
      this.isSubmitting = false;
      console.error('Final Sync Error:', err);
      this.showToast('Final sync failed. Please check connection.');
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
      onEnd: ev => {
        const max = track.clientWidth - knob.clientWidth - 12;
        if (ev.deltaX > max * 0.8) {
          this.handleEndTrip();
        } else {
          this.domCtrl.write(() => knob.style.transform = `translateX(0px)`);
        }
      }
    });
    gesture.enable(true);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
      const h = Math.floor(this.seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((this.seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (this.seconds % 60).toString().padStart(2, '0');
      this.timerDisplay = `${h}:${m}:${s}`;
    }, 1000);
  }

  async showToast(m: string) { const t = await this.toastCtrl.create({ message: m, duration: 2000 }); await t.present(); }
  stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
  recenterMap() { if (this.lastLatLng) this.map.panTo(this.lastLatLng); }
}