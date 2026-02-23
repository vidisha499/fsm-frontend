import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
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
  selectedZoomImage: string | null = null;

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
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.activePatrolId = localStorage.getItem('active_patrol_id');
    this.patrolName = localStorage.getItem('temp_patrol_name') || 'Active Patrol';

    if (!this.activePatrolId) {
      this.navCtrl.navigateRoot('/patrol-logs'); 
      return;
    }
    this.startTimer();
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

  refreshRecentSightings() {
    if (!this.activePatrolId) return;
    this.http.get(`${this.apiUrl}/active`).subscribe({
      next: (data: any) => {
        const active = Array.isArray(data)
          ? data.find((p: any) => p.id.toString() === this.activePatrolId)
          : data;
        
        if (active) {
          this.recentSightings = active.obs_details || active.obsDetails || [];
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Refresh failed", err)
    });
  }

  // --- Map & GPS Logic ---
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
      
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      this.startTracking();
    } catch (e) { 
      console.error("GPS init failed", e); 
    }
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: true,
      maximumAge: 3000 
    }, (position) => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        this.marker.setLatLng(current);
        
        if (this.lastLatLng) {
          const dist = this.lastLatLng.distanceTo(current);
          if (dist > 10) { // Sync only if moved 10+ meters
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
  async handleEndTrip() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const loaderMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_FINAL'));
    const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
    await loader.present();

    const rId = localStorage.getItem('ranger_id') || '1';
    const logPayload = {
      rangerId: parseInt(rId),
      patrolName: this.patrolName,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
      duration: this.timerDisplay,
      status: 'COMPLETED',
      photos: this.capturedPhotos, 
      observationData: { Details: this.recentSightings }
    };

    this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
      next: async () => {
        await loader.dismiss();
        localStorage.removeItem('active_patrol_id');
        localStorage.removeItem('temp_patrol_name');
        
        const successMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_SUCCESS'));
        this.showToast(successMsg);
        this.navCtrl.navigateRoot('/patrol-logs');
      },
      error: async (err) => {
        await loader.dismiss();
        this.isSubmitting = false;
        const errorMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
        this.showToast(errorMsg);
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

  async showToast(m: string) { 
    const t = await this.toastCtrl.create({ message: m, duration: 2000, mode: 'ios' }); 
    await t.present(); 
  }

  openZoom(imgUrl: string) { this.selectedZoomImage = imgUrl; }
  closeZoom() { this.selectedZoomImage = null; }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    if (this.map) this.map.remove();
  }
}