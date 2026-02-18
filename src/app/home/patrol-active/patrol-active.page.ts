


// import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
// import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
// import { Geolocation } from '@capacitor/geolocation';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// import { HttpClient } from '@angular/common/http';
// import * as L from 'leaflet';

// @Component({
//   selector: 'app-patrol-active',
//   templateUrl: './patrol-active.page.html',
//   styleUrls: ['./patrol-active.page.scss'],
//   standalone: false
// })
// export class PatrolActivePage implements OnInit, OnDestroy, AfterViewInit {
//   @ViewChild('endTripKnob', { read: ElementRef }) endTripKnob!: ElementRef;
//   @ViewChild('endTripTrack', { read: ElementRef }) endTripTrack!: ElementRef;

//   // Map and UI State
//   map!: L.Map;
//   marker!: L.Marker;
//   timerDisplay: string = '00:00:00';
//   seconds = 0;
//   timerInterval: any;
//   gpsWatchId: any; 
//   isSubmitting: boolean = false;
//   isSaving: boolean = false; 
//   isFinished: boolean = false; 
//   capturedPhoto: string | null = null;
//   totalDistanceKm: number = 0;
//   lastLatLng: L.LatLng | null = null;
//   routePoints: { lat: number; lng: number }[] = [];
//   startTime: string = new Date().toISOString();
  
  
//   // Observation Modal Data
//   isModalOpen = false;
//   selectedType = '';
//   recentSightings: any[] = []; 
//   obsData = {
//     sightingType: 'Direct',
//     species: '',
//     count: 1,
//     genderMale: false,
//     genderFemale: false,
//     genderUnknown: true,
//     notes: '',
//     photos: [] as string[]
//   };

//   private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';
  
//   private locationIcon = L.divIcon({ 
//     className: 'user-location-marker', 
//     html: '<div class="blue-dot"></div>', 
//     iconSize: [20, 20], 
//     iconAnchor: [10, 10] 
//   });

//   constructor(
//     private navCtrl: NavController, 
//     private alertCtrl: AlertController, 
//     private loadingCtrl: LoadingController, 
//     private toastCtrl: ToastController, 
//     private http: HttpClient,
//     private gestureCtrl: GestureController,
//     private domCtrl: DomController
//   ) {}

//   ngOnInit() { 
//     this.startTimer(); 
//   }

//   ngAfterViewInit() { 
//     this.initMap();
//     this.setupEndTripGesture();
//   }

//   async ionViewDidEnter() {
//     this.refreshRecentSightings();
//   }

//   ngOnDestroy() { 
//     if (this.timerInterval) clearInterval(this.timerInterval); 
//     if (this.map) this.map.remove(); 
//     this.stopTracking(); 
//   }

//   // --- SWIPE GESTURE LOGIC ---
//   setupEndTripGesture() {
//     if (!this.endTripKnob || !this.endTripTrack) return;

//     const knob = this.endTripKnob.nativeElement;
//     const track = this.endTripTrack.nativeElement;

//     const gesture = this.gestureCtrl.create({
//       el: knob,
//       threshold: 0,
//       gestureName: 'swipe-to-end',
//       onMove: ev => {
//         if (this.isSubmitting || this.isFinished) return;
        
//         // Calculate max travel distance (track width minus knob and padding)
//         const maxDelta = track.clientWidth - knob.clientWidth - 12; 
//         let deltaX = ev.deltaX;

//         if (deltaX < 0) deltaX = 0;
//         if (deltaX > maxDelta) deltaX = maxDelta;

//         this.domCtrl.write(() => {
//           knob.style.transform = `translateX(${deltaX}px)`;
//         });
//       },
//       onEnd: ev => {
//         if (this.isSubmitting || this.isFinished) return;

//         const maxDelta = track.clientWidth - knob.clientWidth - 12;

//         // If swiped more than 80% of the way, trigger end trip
//         if (ev.deltaX > maxDelta * 0.8) {
//           this.domCtrl.write(() => {
//             knob.style.transition = '0.3s ease-out';
//             knob.style.transform = `translateX(${maxDelta}px)`;
//             this.handleEndTrip();
//           });
//         } else {
//           // Snap back to start
//           this.domCtrl.write(() => {
//             knob.style.transition = '0.3s ease-out';
//             knob.style.transform = `translateX(0px)`;
//           });
//         }
//         setTimeout(() => { knob.style.transition = 'none'; }, 300);
//       }
//     });

//     gesture.enable(true);
//   }

//   // --- DATA SYNC METHODS ---
//   refreshRecentSightings() {
//     this.http.get(`${this.apiUrl}/active`).subscribe({
//       next: (data: any) => {
//         const activePatrol = Array.isArray(data) ? data[0] : data;
//         if (activePatrol && activePatrol.obsDetails) {
//           this.recentSightings = activePatrol.obsDetails;
//         }
//       },
//       error: (err) => console.error("Refresh error:", err)
//     });
//   }

//   // --- MODAL & FORM METHODS ---
//   openObservationModal(type: string) {
//     this.selectedType = type;
//     this.http.get(`${this.apiUrl}/active`).subscribe({
//       next: (data: any) => {
//         const activePatrol = Array.isArray(data) ? data[0] : data;
//         if (activePatrol && activePatrol.id) {
//           this.navCtrl.navigateForward(['/home/sightings'], {
//             queryParams: { patrolId: activePatrol.id, type: type }
//           });
//         } else {
//           this.showToast('No active patrol found.');
//         }
//       }
//     });
//   }

//   async saveObservation() {
//     if (this.isSaving) return;
//     this.isSaving = true;

//     this.http.get(`${this.apiUrl}/active`).subscribe({
//       next: (activeData: any) => {
//         const activePatrol = Array.isArray(activeData) ? activeData[0] : activeData;
//         const payload = {
//           patrol_id: activePatrol.id,
//           category: this.selectedType,
//           sighting_type: this.obsData.sightingType,
//           species: this.obsData.species || this.selectedType,
//           count: this.obsData.count,
//           gender: { male: this.obsData.genderMale, female: this.obsData.genderFemale, unknown: this.obsData.genderUnknown },
//           photos: this.obsData.photos,
//           notes: this.obsData.notes,
//           timestamp: new Date().toISOString()
//         };

//         this.http.post(`${this.apiUrl}/sightings`, payload).subscribe({
//           next: () => {
//             this.isSaving = false;
//             this.isModalOpen = false;
//             this.refreshRecentSightings();
//             this.showToast('Log Saved Successfully');
//             this.resetForm();
//           },
//           error: () => { this.isSaving = false; this.showToast('Failed to save log'); }
//         });
//       }
//     });
//   }

//   // --- PHOTO & MAP LOGIC ---
//   async initMap() {
//     try {
//       const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
//       const lat = coordinates.coords.latitude;
//       const lng = coordinates.coords.longitude;
//       this.lastLatLng = L.latLng(lat, lng);
//       this.routePoints.push({ lat, lng });
//       this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
//       L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(this.map);
//       this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
//       this.startTracking();
//     } catch (e) { console.error("Map failed", e); }
//   }

//   async startTracking() {
//     this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
//       if (position && this.map) {
//         const current = L.latLng(position.coords.latitude, position.coords.longitude);
//         this.marker.setLatLng(current);
//         this.routePoints.push({ lat: current.lat, lng: current.lng });
//         if (this.lastLatLng) { 
//           const dist = this.lastLatLng.distanceTo(current); 
//           if (dist > 3) this.totalDistanceKm += (dist / 1000); 
//         }
//         this.lastLatLng = current;
//       }
//     });
//   }

//   async takeQuickPhoto() {
//     try {
//       const image = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
//       this.capturedPhoto = image.dataUrl || null;
//     } catch (e) { console.warn('Quick photo cancelled'); }
//   }

//   // --- SESSION CONTROL ---
//   startTimer() { 
//     this.timerInterval = setInterval(() => { 
//       this.seconds++; 
//       const h = Math.floor(this.seconds / 3600).toString().padStart(2, '0'); 
//       const m = Math.floor((this.seconds % 3600) / 60).toString().padStart(2, '0'); 
//       const s = (this.seconds % 60).toString().padStart(2, '0'); 
//       this.timerDisplay = `${h}:${m}:${s}`; 
//     }, 1000); 
//   }

//   async handleEndTrip() {
//     if (this.isSubmitting || this.isFinished) return;
//     this.isSubmitting = true;

//     const loader = await this.loadingCtrl.create({ message: 'Syncing Final Logs...', mode: 'ios' });
//     await loader.present();

//     const logPayload = {
//       rangerId: 1, 
//       patrolName: localStorage.getItem('temp_patrol_name') || 'Active Patrol',
//       startTime: this.startTime, 
//       endTime: new Date().toISOString(), 
//       distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)), 
//       duration: this.timerDisplay,
//       status: 'COMPLETED', 
//       route: this.routePoints, 
//       observationData: { Details: this.recentSightings }
//     };

//     this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
//       next: async () => { 
//         loader.dismiss();
//         this.isFinished = true; 
//         const alert = await this.alertCtrl.create({ 
//           header: 'Patrol Completed', 
//           message: 'Data synchronized successfully.', 
//           buttons: [{ text: 'VIEW LOGS', handler: () => { this.navCtrl.navigateRoot('/home/patrol-logs'); } }] 
//         }); 
//         await alert.present(); 
//       },
//       error: () => { loader.dismiss(); this.isSubmitting = false; this.showToast('Sync failed'); }
//     });
//   }

//   recenterMap() { if(this.lastLatLng) this.map.panTo(this.lastLatLng); }
//   stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
//   async takeSightingPhoto() { /* implementation same as your existing sightings page */ }
//   removePhoto(index: number) { this.obsData.photos.splice(index, 1); }
//   resetForm() { this.obsData = { sightingType: 'Direct', species: '', count: 1, genderMale: false, genderFemale: false, genderUnknown: true, notes: '', photos: [] }; }
//   async showToast(msg: string) { const t = await this.toastCtrl.create({ message: msg, duration: 2500, mode: 'ios' }); await t.present(); }
// }


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

  // Session Identifiers
  activePatrolId: string | null = null;
  patrolName: string = 'Active Patrol';

  // Map and UI State
  map!: L.Map;
  marker!: L.Marker;
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any; 
  isSubmitting: boolean = false;
  isSaving: boolean = false; 
  isFinished: boolean = false; 
  
  // FIX: These properties must exist for the HTML template
  capturedPhoto: string | null = null; 
  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  routePoints: { lat: number; lng: number }[] = [];
  startTime: string = new Date().toISOString();
  
  // Sighting Modal State
  isModalOpen = false;
  selectedType = '';
  recentSightings: any[] = []; 
  obsData = {
    sightingType: 'Direct',
    species: '',
    count: 1,
    genderMale: false,
    genderFemale: false,
    genderUnknown: true,
    notes: '',
    photos: [] as string[]
  };

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
  ) {}

  ngOnInit() { 
    this.activePatrolId = localStorage.getItem('active_patrol_id');
    this.patrolName = localStorage.getItem('temp_patrol_name') || 'Active Patrol';

    if (!this.activePatrolId) {
      this.showToast('No active session found.');
      this.navCtrl.navigateRoot('/home/patrol-logs');
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

  ngOnDestroy() { 
    if (this.timerInterval) clearInterval(this.timerInterval); 
    if (this.map) this.map.remove(); 
    this.stopTracking(); 
  }

  // --- FIX: RESTORED CAMERA METHODS FOR HTML ---
  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      this.capturedPhoto = image.dataUrl || null;
    } catch (e) {
      console.warn('Quick photo cancelled');
    }
  }

  async takeSightingPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        this.obsData.photos.push(image.dataUrl);
      }
    } catch (e) {
      console.warn('Sighting photo cancelled');
    }
  }

  removePhoto(index: number) {
    this.obsData.photos.splice(index, 1);
  }

  // --- SIGHTING LOGIC ---
  async saveObservation() {
    if (this.isSaving || !this.activePatrolId) return;
    this.isSaving = true;

    const payload = {
      patrol_id: parseInt(this.activePatrolId),
      category: this.selectedType,
      sighting_type: this.obsData.sightingType,
      species: this.obsData.species || this.selectedType,
      count: this.obsData.count,
      gender: { 
        male: this.obsData.genderMale, 
        female: this.obsData.genderFemale, 
        unknown: this.obsData.genderUnknown 
      },
      photos: this.obsData.photos,
      notes: this.obsData.notes,
      timestamp: new Date().toISOString()
    };

    this.http.post(`${this.apiUrl}/sightings`, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.refreshRecentSightings();
        this.showToast('Sighting saved to database');
        this.resetForm();
      },
      error: () => {
        this.isSaving = false;
        this.showToast('Failed to sync sighting');
      }
    });
  }

  refreshRecentSightings() {
    if (!this.activePatrolId) return;
    this.http.get(`${this.apiUrl}/active`).subscribe({
      next: (data: any) => {
        const active = Array.isArray(data) 
          ? data.find((p: any) => p.id.toString() === this.activePatrolId) 
          : data;
        if (active && active.obs_details) {
          this.recentSightings = active.obs_details;
        }
      }
    });
  }

  // --- GPS & MAP ---
  async initMap() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.lastLatLng = L.latLng(lat, lng);
      this.routePoints.push({ lat, lng });
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }).addTo(this.map);
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

  // --- UI & SESSION ---
  openObservationModal(type: string) {
    this.selectedType = type;
    this.isModalOpen = true;
  }

  async handleEndTrip() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    const loader = await this.loadingCtrl.create({ message: 'Syncing Final Logs...', mode: 'ios' });
    await loader.present();

    const logPayload = {
      rangerId: 1,
      patrolName: this.patrolName,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
      duration: this.timerDisplay,
      status: 'COMPLETED',
      route: this.routePoints,
      observationData: { Details: this.recentSightings }
    };

    this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
      next: async () => {
        loader.dismiss();
        localStorage.removeItem('active_patrol_id');
        this.navCtrl.navigateRoot('/home/patrol-logs');
      },
      error: () => { loader.dismiss(); this.isSubmitting = false; this.showToast('Final sync failed'); }
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

  resetForm() { this.obsData = { sightingType: 'Direct', species: '', count: 1, genderMale: false, genderFemale: false, genderUnknown: true, notes: '', photos: [] }; }
  async showToast(m: string) { const t = await this.toastCtrl.create({ message: m, duration: 2000 }); await t.present(); }
  stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
  recenterMap() { if (this.lastLatLng) this.map.panTo(this.lastLatLng); }
  setOpen(o: boolean) { this.isModalOpen = o; }
}