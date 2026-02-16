


import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController } from '@ionic/angular';
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
  map!: L.Map;
  marker!: L.Marker;
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any; 
  isSubmitting: boolean = false;
  isFinished: boolean = false; 
  capturedPhoto: string | null = null;
  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  
  // Track details for DB
  routePoints: { lat: number; lng: number }[] = [];
  startTime: string = new Date().toISOString();
  
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
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.startTimer();
  }

  ngAfterViewInit() { this.initMap(); }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.map) this.map.remove();
    this.stopTracking(); 
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

  async initMap() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      this.lastLatLng = L.latLng(lat, lng);
      this.routePoints.push({ lat, lng });
      
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
      }).addTo(this.map);
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      this.startTracking();
    } catch (e) { console.error("Map failed", e); }
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        this.marker.setLatLng(current);
        
        this.routePoints.push({ lat: current.lat, lng: current.lng });

        if (this.lastLatLng) {
          const dist = this.lastLatLng.distanceTo(current);
          if (dist > 3) this.totalDistanceKm += (dist / 1000);
        }
        this.lastLatLng = current;
      }
    });
  }

  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      this.capturedPhoto = image.dataUrl || null;
    } catch (e) { console.warn('User cancelled'); }
  }

  async handleEndTrip() {
    if (this.isSubmitting || this.isFinished) return;
    this.isSubmitting = true;

    // Fetch observations from current active patrol before closing
    this.http.get(`${this.apiUrl}/active`).subscribe({
      next: (activeData: any) => {
        const active = activeData[0]; // Assuming one active patrol
        
        const logPayload = {
          rangerId: active?.rangerId || 1,
          patrolName: localStorage.getItem('temp_patrol_name') || 'Patrol Log',
          startTime: this.startTime,
          endTime: new Date().toISOString(),
          distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
          duration: this.timerDisplay,
          status: 'COMPLETED',
          route: this.routePoints,
          observationData: {
            Animal: active?.obsAnimal || 0,
            Water: active?.obsWater || 0,
            Impact: active?.obsImpact || 0,
            Death: active?.obsDeath || 0,
            Felling: active?.obsFelling || 0,
            Other: active?.obsOther || 0
          }
        };

        this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
          next: async () => {
            this.isSubmitting = false;
            this.isFinished = true;
            const alert = await this.alertCtrl.create({
              header: 'Success',
              message: 'Patrol ended and saved to logs.',
              buttons: [{ text: 'OK', handler: () => { this.navCtrl.navigateRoot('/home/patrol-logs'); } }]
            });
            await alert.present();
          },
          error: (err) => {
            console.error("Failed to save log", err);
            this.isSubmitting = false;
          }
        });
      },
      error: (err) => {
        console.error("Failed to fetch active stats", err);
        this.isSubmitting = false;
      }
    });
  }

  recenterMap() { if(this.lastLatLng) this.map.panTo(this.lastLatLng); }
  
  openObservation(type: string) { 
    // This calls your existing patch endpoint to update live counts
    this.http.get(`${this.apiUrl}/active`).subscribe((data: any) => {
      if(data[0]) {
        this.http.patch(`${this.apiUrl}/active/${data[0].id}`, { type }).subscribe();
      }
    });
  }
  
  stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
}