import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-patrol-active',
  templateUrl: './patrol-active.page.html',
  styleUrls: ['./patrol-active.page.scss'],
  standalone: false
})
export class PatrolActivePage implements OnInit, OnDestroy, AfterViewInit {
  map!: L.Map;
  marker!: L.Marker;
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any; 
  patrolStartTime: string = '';
  activePatrolId: number | null = null;

  // 1. Updated Vercel URL
  // private vercelUrl: string = 'https://fsm-backend-ica4fcwv2-vidishas-projects-1763fd56.vercel.app/api/patrols';
  private vercelUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';
  private apiUrl: string = '';

  isModalOpen = false;
  currentType: string = ''; 
  
  sightingData = {
    type: 'Direct',
    species: '',
    count: 1,
    male: false,
    female: false,
    unknown: true,
    notes: ''
  };

  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  observationCounts: any = { Animal: 0, Water: 0, Impact: 0, Death: 0, Felling: 0, Other: 0 };

  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  constructor(
    private navCtrl: NavController, 
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private http: HttpClient,
    private translate: TranslateService,
    private platform: Platform
  ) { 
    // 2. Set API URL to Vercel for all platforms
    this.apiUrl = this.vercelUrl;
  }

  ngOnInit() {
    this.patrolStartTime = new Date().toISOString();
    this.startTimer();
    this.initializeActiveSession();
  }

  ngAfterViewInit() { this.initMap(); }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.map) this.map.remove();
    this.stopTracking(); 
  }

  async initializeActiveSession() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    // Connect to Vercel to start an active session
    this.http.post(`${this.apiUrl}/active`, { rangerId: Number(rangerId) })
      .subscribe({
        next: (res: any) => { this.activePatrolId = res.id; },
        error: (err) => console.error('Failed to initialize Vercel session', err)
      });
  }

  openObservation(type: string) {
    this.currentType = type;
    this.isModalOpen = true;
    this.sightingData = { type: 'Direct', species: '', count: 1, male: false, female: false, unknown: true, notes: '' };
  }

  async saveObservation() {
    if (!this.activePatrolId) return;

    const loader = await this.loadingCtrl.create({
      message: 'Saving observation to Vercel...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loader.present();

    const payload = { 
      type: this.currentType, 
      details: {
        sightingType: this.sightingData.type,
        species: this.sightingData.species,
        count: this.sightingData.count,
        gender: {
            male: this.sightingData.male,
            female: this.sightingData.female,
            unknown: this.sightingData.unknown
        },
        notes: this.sightingData.notes,
        timestamp: new Date().toISOString()
      }
    };

    this.http.patch(`${this.apiUrl}/active/${this.activePatrolId}`, payload).subscribe({
      next: async () => {
        loader.dismiss();
        this.observationCounts[this.currentType]++;
        this.isModalOpen = false;
        this.presentToast(`${this.currentType} log saved`, 'success');
      },
      error: (err) => {
        loader.dismiss();
        console.error("Error saving log to Vercel", err);
        this.presentToast('Sync failed. Please check internet.', 'danger');
      }
    });
  }

  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({ 
        quality: 40, // Keeping size small for Vercel
        resultType: CameraResultType.Base64, 
        source: CameraSource.Camera 
      });

      if (image.base64String && this.activePatrolId) {
        const loader = await this.loadingCtrl.create({ 
          message: 'Uploading to Vercel...', 
          mode: 'ios' 
        });
        await loader.present();

        this.http.patch(`${this.apiUrl}/active/${this.activePatrolId}`, { photo: image.base64String }).subscribe({
          next: () => loader.dismiss(),
          error: (err) => {
            loader.dismiss();
            console.error("Photo upload failed", err);
          }
        });
      }
    } catch (e) { console.error("Camera failed", e); }
  }

  async initMap() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;

      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
        maxZoom: 20, 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
      }).addTo(this.map);

      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      this.startTracking();
    } catch (e) { console.error("Map failed", e); }
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: true,
      timeout: 5000 
    }, (position) => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        if (this.lastLatLng) { 
          this.totalDistanceKm += (this.lastLatLng.distanceTo(current) / 1000); 
        }
        this.lastLatLng = current;
        this.marker.setLatLng(current);
        this.map.panTo(current);

        // Periodic Live Sync to Vercel (every 60s)
        if (this.seconds % 60 === 0 && this.activePatrolId) {
          this.http.patch(`${this.apiUrl}/active/${this.activePatrolId}`, { 
            liveLatitude: current.lat, 
            liveLongitude: current.lng, 
            currentTimer: this.timerDisplay 
          }).subscribe();
        }
      }
    });
  }

  stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
  
  recenterMap() { 
    Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then((pos) => {
      const currentLoc = L.latLng(pos.coords.latitude, pos.coords.longitude);
      this.map.setView(currentLoc, 17);
      this.marker.setLatLng(currentLoc);
    }); 
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

  async endPatrol() {
    const alert = await this.alertCtrl.create({
      header: 'End Trip',
      message: `Distance: ${this.totalDistanceKm.toFixed(2)} KM`,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Yes, End', handler: () => this.processEndPatrol() }]
    });
    await alert.present();
  }

  private async processEndPatrol() {
    const loader = await this.loadingCtrl.create({
      message: 'Finalizing Vercel logs...',
      spinner: 'dots',
      mode: 'ios'
    });
    await loader.present();

    const rangerId = localStorage.getItem('ranger_id');
    const savedPatrolName = localStorage.getItem('temp_patrol_name') || "SITE OPERATION";

    const patrolData = {
      rangerId: Number(rangerId),
      patrolName: savedPatrolName,
      startTime: this.patrolStartTime,
      endTime: new Date().toISOString(),
      distanceKm: Number(this.totalDistanceKm.toFixed(2)),
      duration: this.timerDisplay,
      observationData: this.observationCounts,
      status: 'COMPLETED',
      siteLocation: 'PANNA SITE'
    };

    // Post final log to Vercel
    this.http.post(`${this.apiUrl}/logs`, patrolData).subscribe({
      next: () => { 
        loader.dismiss();
        localStorage.removeItem('temp_patrol_name');
        this.navCtrl.navigateRoot('/home/patrol-logs'); 
      },
      error: (err) => { 
        loader.dismiss();
        console.error("End Patrol Error:", err); 
        this.presentToast('Failed to save final log to Vercel.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration: 2500, 
      color, 
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }
}