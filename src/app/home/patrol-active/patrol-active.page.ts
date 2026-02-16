

// import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
// import { NavController, AlertController, LoadingController, ToastController } from '@ionic/angular';
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
//   private locationIcon = L.divIcon({ className: 'user-location-marker', html: '<div class="blue-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });

//   constructor(
//     private navCtrl: NavController, 
//     private alertCtrl: AlertController, 
//     private loadingCtrl: LoadingController, 
//     private toastCtrl: ToastController, 
//     private http: HttpClient
//   ) {}

//   ngOnInit() { this.startTimer(); }
//   ngAfterViewInit() { this.initMap(); }
//   ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); if (this.map) this.map.remove(); this.stopTracking(); }

//   startTimer() { this.timerInterval = setInterval(() => { this.seconds++; const h = Math.floor(this.seconds / 3600).toString().padStart(2, '0'); const m = Math.floor((this.seconds % 3600) / 60).toString().padStart(2, '0'); const s = (this.seconds % 60).toString().padStart(2, '0'); this.timerDisplay = `${h}:${m}:${s}`; }, 1000); }

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
//         if (this.lastLatLng) { const dist = this.lastLatLng.distanceTo(current); if (dist > 3) this.totalDistanceKm += (dist / 1000); }
//         this.lastLatLng = current;
//       }
//     });
//   }

//   openObservationModal(type: string) { this.selectedType = type; this.isModalOpen = true; }

//   async takeSightingPhoto() {
//     if (this.obsData.photos.length >= 5) {
//       const alert = await this.alertCtrl.create({ header: 'Limit reached', message: 'You can only add 5 photos.', buttons: ['OK'], mode: 'ios' });
//       await alert.present();
//       return;
//     }
//     try {
//       const image = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
//       if (image.dataUrl) this.obsData.photos.push(image.dataUrl);
//     } catch (e) { console.warn('User cancelled'); }
//   }

//   removePhoto(index: number) { this.obsData.photos.splice(index, 1); }

//   async showToast(msg: string) {
//     const toast = await this.toastCtrl.create({
//       message: msg,
//       duration: 2000,
//       position: 'bottom',
//       cssClass: 'custom-toast',
//       buttons: [{ text: 'OK', role: 'cancel' }]
//     });
//     await toast.present();
//   }

//   async saveObservation() {
//     if (this.isSaving) return;
//     this.isSaving = true;

//     // Temporary data for instant UI update
//     const newLog = {
//       category: this.selectedType,
//       sighting_type: this.obsData.sightingType,
//       species: this.obsData.species || 'Not specified',
//       count: this.obsData.count,
//       timestamp: new Date()
//     };

//     // Database call handle karke turant UI update karenge
//     this.http.get(`${this.apiUrl}/active`).subscribe({
//       next: (activeData: any) => {
//         const activePatrolId = activeData[0]?.id;
//         const payload = {
//           patrol_id: activePatrolId,
//           category: this.selectedType, 
//           sighting_type: this.obsData.sightingType,
//           species: this.obsData.species,
//           count: this.obsData.count,
//           gender: { male: this.obsData.genderMale, female: this.obsData.genderFemale, unknown: this.obsData.genderUnknown },
//           photos: this.obsData.photos,
//           notes: this.obsData.notes
//         };

//         this.http.post(`${this.apiUrl}/sightings`, payload).subscribe({
//           next: () => this.finalizeUIUpdate(newLog),
//           error: () => {
//             console.warn("Backend error, but updating UI anyway...");
//             this.finalizeUIUpdate(newLog); // Force UI update even on error
//           }
//         });
//       },
//       error: () => this.finalizeUIUpdate(newLog) // Force UI update even if active check fails
//     });
//   }

//   // Common function to close modal and show data
//   async finalizeUIUpdate(log: any) {
//     this.recentSightings.push(log);
    
//     // Smooth transition
//     setTimeout(async () => {
//       this.isModalOpen = false;
//       this.isSaving = false;
//       await this.showToast('Your log has been saved!');
//       this.resetForm();
//     }, 600);
//   }

//   resetForm() { this.obsData = { sightingType: 'Direct', species: '', count: 1, genderMale: false, genderFemale: false, genderUnknown: true, notes: '', photos: [] }; }

//   async takeQuickPhoto() {
//     try {
//       const image = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
//       this.capturedPhoto = image.dataUrl || null;
//     } catch (e) { console.warn('User cancelled'); }
//   }

//   async handleEndTrip() {
//     if (this.isSubmitting || this.isFinished) return;
//     this.isSubmitting = true;
//     this.http.get(`${this.apiUrl}/active`).subscribe({
//       next: (activeData: any) => {
//         const active = activeData[0];
//         const logPayload = {
//           rangerId: active?.rangerId || 1, patrolName: localStorage.getItem('temp_patrol_name') || 'Patrol Log',
//           startTime: this.startTime, endTime: new Date().toISOString(), distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)), duration: this.timerDisplay,
//           status: 'COMPLETED', route: this.routePoints, observationData: { Animal: active?.obsAnimal || 0, Water: active?.obsWater || 0, Impact: active?.obsImpact || 0, Death: active?.obsDeath || 0, Felling: active?.obsFelling || 0, Other: active?.obsOther || 0, Details: active?.obsDetails || [] }
//         };
//         this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
//           next: async () => { this.isSubmitting = false; this.isFinished = true; const alert = await this.alertCtrl.create({ header: 'Success', message: 'Patrol ended.', buttons: [{ text: 'OK', handler: () => { this.navCtrl.navigateRoot('/home/patrol-logs'); } }] }); await alert.present(); },
//           error: () => this.isSubmitting = false
//         });
//       },
//       error: () => this.isSubmitting = false
//     });
//   }

//   recenterMap() { if(this.lastLatLng) this.map.panTo(this.lastLatLng); }
//   stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
// }

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController } from '@ionic/angular';
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
  isSaving: boolean = false; 
  isFinished: boolean = false; 
  capturedPhoto: string | null = null;
  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  routePoints: { lat: number; lng: number }[] = [];
  startTime: string = new Date().toISOString();
  
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
    private http: HttpClient
  ) {}

  ngOnInit() { this.startTimer(); }
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
        maxZoom: 20, 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
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

  openObservationModal(type: string) { 
    this.selectedType = type; 
    this.isModalOpen = true; 
  }

  async takeSightingPhoto() {
    if (this.obsData.photos.length >= 5) {
      const alert = await this.alertCtrl.create({ header: 'Limit reached', message: 'You can only add 5 photos.', buttons: ['OK'], mode: 'ios' });
      await alert.present();
      return;
    }
    try {
      const image = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      if (image.dataUrl) this.obsData.photos.push(image.dataUrl);
    } catch (e) { console.warn('User cancelled'); }
  }

  removePhoto(index: number) { this.obsData.photos.splice(index, 1); }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }

  async saveObservation() {
    if (this.isSaving) return;
    this.isSaving = true;

    // Is log mein detail data bhi save kar rahe hain
    const newLog = {
      category: this.selectedType,
      sighting_type: this.obsData.sightingType,
      species: this.obsData.species || 'Not specified',
      count: this.obsData.count,
      notes: this.obsData.notes,
      timestamp: new Date().toISOString()
    };

    // Note: /sightings call optional hai agar aap End Trip par sab ek sath bhej rahe ho, 
    // par main isse rehne de raha hoon sync ke liye.
    this.http.get(`${this.apiUrl}/active`).subscribe({
      next: (activeData: any) => {
        const activePatrolId = activeData[0]?.id;
        const payload = {
          patrol_id: activePatrolId,
          ...newLog,
          gender: { male: this.obsData.genderMale, female: this.obsData.genderFemale, unknown: this.obsData.genderUnknown },
          photos: this.obsData.photos
        };

        this.http.post(`${this.apiUrl}/sightings`, payload).subscribe({
          next: () => this.finalizeUIUpdate(newLog),
          error: () => this.finalizeUIUpdate(newLog) 
        });
      },
      error: () => this.finalizeUIUpdate(newLog)
    });
  }

  async finalizeUIUpdate(log: any) {
    this.recentSightings.push(log);
    setTimeout(() => {
      this.isModalOpen = false;
      this.isSaving = false;
      this.showToast('Log saved locally');
      this.resetForm();
    }, 600);
  }

  resetForm() { 
    this.obsData = { sightingType: 'Direct', species: '', count: 1, genderMale: false, genderFemale: false, genderUnknown: true, notes: '', photos: [] }; 
  }

  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      this.capturedPhoto = image.dataUrl || null;
    } catch (e) { console.warn('User cancelled'); }
  }

  // YAHAN MAINE COUNTS AUR DETAILS KO FIX KIYA HAI
  async handleEndTrip() {
    if (this.isSubmitting || this.isFinished) return;
    
    const loader = await this.loadingCtrl.create({ message: 'Ending Patrol...', mode: 'ios' });
    await loader.present();
    
    this.isSubmitting = true;

    // Calculate counts from recentSightings array
    const counts = {
      Animal: this.recentSightings.filter(s => s.category === 'Animal').length,
      Water: this.recentSightings.filter(s => s.category === 'Water').length,
      Impact: this.recentSightings.filter(s => s.category === 'Impact').length,
      Death: this.recentSightings.filter(s => s.category === 'Death').length,
      Felling: this.recentSightings.filter(s => s.category === 'Felling').length,
      Other: this.recentSightings.filter(s => s.category === 'Other').length,
    };

    const logPayload = {
      rangerId: 1, 
      patrolName: localStorage.getItem('temp_patrol_name') || 'Patrol Log',
      startTime: this.startTime, 
      endTime: new Date().toISOString(), 
      distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)), 
      duration: this.timerDisplay,
      status: 'COMPLETED', 
      route: this.routePoints, 
      observationData: { 
        ...counts,
        Details: this.recentSightings // Ye array ab sightings ki puri details carry karega
      }
    };

    this.http.post(`${this.apiUrl}/logs`, logPayload).subscribe({
      next: async () => { 
        loader.dismiss();
        this.isSubmitting = false; 
        this.isFinished = true; 
        const alert = await this.alertCtrl.create({ 
          header: 'Success', 
          message: 'Patrol logs synced successfully.', 
          buttons: [{ text: 'OK', handler: () => { this.navCtrl.navigateRoot('/home/patrol-logs'); } }] 
        }); 
        await alert.present(); 
      },
      error: (err) => { 
        loader.dismiss();
        this.isSubmitting = false;
        console.error("End Trip Error:", err);
      }
    });
  }

  recenterMap() { if(this.lastLatLng) this.map.panTo(this.lastLatLng); }
  stopTracking() { if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); }
}