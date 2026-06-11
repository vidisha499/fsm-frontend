import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, LoadingController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { TranslateService } from '@ngx-translate/core'; 
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';
import { PushNotificationService } from '../../services/push-notification.service';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit, OnDestroy {
  
  // Leaflet variables
  map!: L.Map;
  marker!: L.Marker;
  private geofencePolygon: L.Polygon | null = null;
  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0;
  
  public isSubmitting: boolean = false;
  public isEntry: boolean = true;
  public attendance: any = null;
  public currentTime: Date = new Date(); 
  public selectedZoomImage: string | null = null;
  public currentZoom: number = 1; // 🔍 Zoom level state
  public capturedPhoto: string = ''; 
  public currentAddress: string = ''; 
  public rangerName: string = '';
  public siteName: string = '';
  public beats: any[] = [];
  public selectedBeat: any = null;
  public remark: string = '';
  public isAlreadyMarked: boolean = false;
  public statusChecked: boolean = false;

  public currentLat: number = 20.1013; 
  public currentLng: number = 77.1337;
  private gpsWatchId: any = null;

  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';

  constructor(
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private platform: Platform,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService, // 👈 Inject TranslateService
    private dataService: DataService,
    private photoViewer: PhotoViewerService,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    
    // Fetch Assigned Beat or Site name
    let site = localStorage.getItem('assigned_beat_name');
    if (!site) {
      try {
        const u = JSON.parse(localStorage.getItem('user_data') || '{}');
        site = u.site_name || u.beat_name || u.geo_name;
      } catch (e) {}
    }
    this.siteName = site || 'Forest Area';
    
    this.attendance = { created_at: new Date() };

    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    this.fetchBeats();
    this.checkTodayStatus();
  }

  async checkTodayStatus() {
    const companyId = this.dataService.getUserCompanyId();
    const rangerId = this.dataService.getRangerId();
    if (!companyId || !rangerId) {
      this.statusChecked = true;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    this.dataService.checkTodayAttendanceStatus().subscribe({
      next: ({ hasBeat, hasOnsite }) => {
        if (hasOnsite) {
          this.isAlreadyMarked = true;
        } else if (hasBeat) {
          const beatDrafts = this.dataService.getAttendanceDrafts('beat');
          const todayDraftExit = beatDrafts.some(
            d => d.createdAt?.split('T')[0] === todayStr && d.isEntry === false
          );
          this.dataService.getAttendanceLogsByRanger(companyId).subscribe({
            next: (res: any) => {
              const logs = res.attendance || res.data || res || [];
              const hasTodayExit = Array.isArray(logs) && logs.some((l: any) => {
                const dateVal = l.created_at || l.createdAt || l.timestamp;
                if (!dateVal) return false;
                const logDate = String(dateVal).split(' ')[0].split('T')[0];
                if (logDate !== todayStr) return false;
                return (l.type || l.attendance_type)?.toUpperCase() === 'EXIT';
              });
              this.isAlreadyMarked = hasTodayExit || todayDraftExit;
              if (!this.isAlreadyMarked) this.isEntry = false;
              this.finishStatusCheck();
            },
            error: () => {
              this.isAlreadyMarked = todayDraftExit;
              if (!this.isAlreadyMarked) this.isEntry = false;
              this.finishStatusCheck();
            }
          });
          return;
        } else {
          this.isEntry = true;
        }
        this.finishStatusCheck();
      },
      error: () => this.finishStatusCheck()
    });
  }

  private finishStatusCheck() {
    this.statusChecked = true;
    this.cdr.detectChanges();
  }

  async fetchBeats() {
    const companyId = this.dataService.getUserCompanyId();
    const token = localStorage.getItem('api_token');
    
    // 1. Load from cache first for offline support
    const cached = localStorage.getItem('cached_beats');
    if (cached) {
      try {
        this.beats = JSON.parse(cached);
        if (this.beats.length > 0 && !this.selectedBeat) {
          this.selectedBeat = this.beats[0];
          setTimeout(() => this.drawSelectedGeofence(), 500);
        }
      } catch (e) { console.error("Cache parse error", e); }
    }

    // 2. Fetch fresh data from API
    const payload = {
      api_token: token,
      company_id: companyId
    };

    this.dataService.getGeofences(payload).subscribe({
      next: (res: any) => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          // Filter to only show Beats/Geos (excluding Ranges/Divisions)
          this.beats = res.data.filter((beat: any) => {
            const layer = Number(beat.layer_id || beat.layerId || 0);
            if (layer > 0 && layer <= 3) {
              return false;
            }
            const nameLower = String(beat.name || beat.beat_name || '').toLowerCase();
            if ((nameLower.includes('range') || nameLower.includes('division')) && !nameLower.includes('beat') && !nameLower.includes('geo')) {
              return false;
            }
            return true;
          });
          
          localStorage.setItem('cached_beats', JSON.stringify(this.beats));
          if (this.beats.length > 0 && !this.selectedBeat) {
            this.selectedBeat = this.beats[0];
          }
          this.drawSelectedGeofence();
        } else {
          // Fallback to hierarchy-entities API if getGeofences is empty
          this.fetchBeatsFromHierarchy();
        }
      },
      error: (err) => {
        console.error("Error fetching fresh geofences, trying hierarchy fallback:", err);
        this.fetchBeatsFromHierarchy();
      }
    });
  }

  fetchBeatsFromHierarchy() {
    this.dataService.getBeatBoundaries().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        if (Array.isArray(data) && data.length > 0) {
          // Filter to only show Beats and Geos (excluding Ranges and Divisions)
          const filteredData = data.filter((beat: any) => {
            const layer = Number(beat.layer_id || beat.layerId || 0);
            if (layer > 0 && layer <= 3) {
              return false; // Skip Division/Range layers
            }
            const nameLower = String(beat.name || beat.beat_name || '').toLowerCase();
            // Filter out items that contain "range" or "division" in their name (unless it contains beat or geo)
            if ((nameLower.includes('range') || nameLower.includes('division')) && !nameLower.includes('beat') && !nameLower.includes('geo')) {
              return false;
            }
            return true;
          });

          this.beats = filteredData.map((beat: any) => ({
            ...beat,
            id: beat.id || beat.beat_id,
            name: beat.name || beat.beat_name
          }));
          
          localStorage.setItem('cached_beats', JSON.stringify(this.beats));
          if (this.beats.length > 0 && !this.selectedBeat) {
            this.selectedBeat = this.beats[0];
          } else if (this.beats.length === 0) {
            this.selectedBeat = null;
          }
          this.drawSelectedGeofence();
        }
      },
      error: (err) => {
        console.error("Error fetching beat boundaries for attendance:", err);
      }
    });
  }

  onBeatChange(event: any) {
    const selectedId = event.detail.value;
    this.selectedBeat = this.beats.find(b => b.id == selectedId);
    this.drawSelectedGeofence();
  }

  // Helper to parse beat boundary coordinates
  parseBeatCoordinates(boundaryCoordinates: any): [number, number][] {
    if (!boundaryCoordinates) return [];
    try {
      let coords = boundaryCoordinates;
      if (typeof coords === 'string') {
        coords = JSON.parse(coords);
      }
      if (!Array.isArray(coords)) return [];

      let latlngs: [number, number][] = [];
      if (coords.length > 0 && Array.isArray(coords[0])) {
        latlngs = coords.map(c => {
          if (Number(c[0]) > 60) {
            return [Number(c[1]), Number(c[0])]; // Convert [lng, lat] to [lat, lng]
          }
          return [Number(c[0]), Number(c[1])]; // Already [lat, lng]
        });
      } else if (coords.length > 0 && typeof coords[0] === 'object') {
        latlngs = coords.map(c => [
          Number(c.lat || c.latitude || 0),
          Number(c.lng || c.longitude || 0)
        ]);
      }
      return latlngs.filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]) && (pt[0] !== 0 || pt[1] !== 0));
    } catch (e) {
      console.error("Error parsing boundary coordinates:", e);
      return [];
    }
  }

  // Ray-Casting (Jordan Curve) Algorithm
  isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const x = point[0]; // Latitude
    const y = point[1]; // Longitude
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Visual helper to draw selected geofence boundary on the map
  drawSelectedGeofence() {
    if (!this.map || !this.selectedBeat) return;
    
    if (this.geofencePolygon) {
      this.map.removeLayer(this.geofencePolygon);
      this.geofencePolygon = null;
    }
    
    const boundaryPoints = this.parseBeatCoordinates(this.selectedBeat.boundary_coordinates);
    if (boundaryPoints.length > 0) {
      try {
        const leafletLatLngs = boundaryPoints.map(pt => L.latLng(pt[0], pt[1]));
        this.geofencePolygon = L.polygon(leafletLatLngs, {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(this.map);
        
        // Adjust map bounds to show both the user's location and the geofence
        const bounds = L.latLngBounds([
          L.latLng(this.currentLat, this.currentLng),
          ...leafletLatLngs
        ]);
        this.map.fitBounds(bounds.pad(0.15));
      } catch (e) {
        console.error("Error drawing geofence on map:", e);
      }
    }
  }

  hasOffline(): boolean {
    return this.dataService.getAttendanceDrafts('beat').length > 0;
  }

  async syncNow() {
    const loader = await this.loadingCtrl.create({ message: 'Syncing...', mode: 'ios' });
    await loader.present();
    const res = await this.dataService.syncAllDrafts();
    await loader.dismiss();
    if (res.success && res.count && res.count > 0) {
      this.presentToast(`Synced ${res.count} items!`, 'success');
    } else {
      this.presentToast('No data to sync or still offline.', 'warning');
    }
  }

  async ionViewDidEnter() {
    await this.initLeafletMap();
  }



async initLeafletMap() {
  try {
    if (this.map) { 
      this.map.remove(); 
    }

    // 1. Pehle purana default icon handler delete karein
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    // 2. Ab CDN se icons set karein (Isse 404 hamesha ke liye band ho jayega)
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // 3. Map initialize karein
    this.map = L.map('attendanceMap', { 
      center: [this.currentLat, this.currentLng], 
      zoom: 16, 
      zoomControl: false 
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    // 4. Marker create karein (Custom blue dot icon ke saath)
    this.marker = L.marker([this.currentLat, this.currentLng], { 
      icon: this.locationIcon 
    }).addTo(this.map);

    // 5. GPS Location update karein
    const pos = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: false, 
      timeout: 15000, 
      maximumAge: 60000 
    });
    
    this.currentLat = pos.coords.latitude;
    this.currentLng = pos.coords.longitude;

    const newPoint = L.latLng(this.currentLat, this.currentLng);
    this.marker.setLatLng(newPoint);
    this.map.setView(newPoint, 18);
    
    this.updateAddress(this.currentLat, this.currentLng);
    this.drawSelectedGeofence();
    this.startLiveTracking();

  } catch (e) {
    console.error("GPS Timeout", e);
    const msg = await this.translate.get('ATTENDANCE.GPS_SEARCH').toPromise();
    this.presentToast(msg, 'warning');
    this.startLiveTracking(); 
  }
}

  async startLiveTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: true, 
      maximumAge: 0 
    }, (position) => {
      if (position && this.map) {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        
        if (position.coords.accuracy < 50) { 
          const newPoint = L.latLng(newLat, newLng);
          this.marker.setLatLng(newPoint);
          this.map.panTo(newPoint);
          
          if (L.latLng(this.currentLat, this.currentLng).distanceTo(newPoint) > 5) {
            this.currentLat = newLat;
            this.currentLng = newLng;
            this.updateAddress(newLat, newLng);
          }
        }
      }
    });
  }

  recenterMap() {
    if (this.map) {
      this.map.setView([this.currentLat, this.currentLng], 16);
    }
  }

  async updateAddress(lat: number, lng: number) {
    // Backend API getGuardGeofence throws 500 error, so we display the assigned geofence name.
    if (this.siteName && this.siteName !== 'Forest Area') {
      this.currentAddress = this.siteName;
    } else {
      // Fallback to Google Maps only if siteName is missing
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
      try {
        const data: any = await firstValueFrom(this.http.get(url));
        if (data.status === 'OK' && data.results.length > 0) {
          this.currentAddress = data.results[0].formatted_address;
        } else {
          this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch (err) {
        this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    this.cdr.detectChanges();
  }

// async submitAttendance() {
//   if (this.isSubmitting) return; 

//   // 1. Photo validation
//   if (!this.capturedPhoto) {
//     const msg = await this.translate.get('ATTENDANCE.PHOTO_REQUIRED').toPromise();
//     this.presentToast(msg, 'warning');
//     this.resetSlider();
//     return;
//   }

//   this.isSubmitting = true;
//   this.cdr.detectChanges(); 

//   // 2. LocalStorage se IDs nikaalna (Sahi tarika)
//   const companyId = localStorage.getItem('company_id'); // Make sure ye login ke waqt set ho raha hai
//   const rangerId = localStorage.getItem('ranger_id');

//   // 3. Payload taiyar karna
//   // const payload = {
//   //   ranger_id: rangerId ? Number(rangerId) : 0,
//   //   company_id: companyId ? Number(companyId) : null, // 👈 Admin filtering ke liye ye sabse zaroori hai
//   //   type: this.isEntry ? 'ENTRY' : 'EXIT',
//   //   photo: this.capturedPhoto,
//   //   latitude: this.currentLat,
//   //   longitude: this.currentLng,
//   //   geofence: this.currentAddress,
//   //   rangerName: this.rangerName, 
//   //   region: this.rangerRegion,  // This is already there
//   // location_name: this.currentAddress,
//   // };

//   const payload = {
//   ranger_id: Number(rangerId),
//   company_id: Number(companyId),
//   type: this.isEntry ? 'ENTRY' : 'EXIT',
//   photo: this.capturedPhoto,
//   latitude: Number(this.currentLat),  // 👈 Explicitly convert to Number
//   longitude: Number(this.currentLng), // 👈 Explicitly convert to Number
//   geofence: this.currentAddress,      // 👈 This fills 'location_name' in your Service
//   rangerName: this.rangerName,        // 👈 Use camelCase to match DTO
//   region: this.rangerRegion
// };

//   // 4. Log check karne ke liye (Sahi variable use kiya hai ab)
//   console.log('Submitting Onsite Attendance for Company:', payload.company_id);
//   this.logger.debug(`Submitting Payload: Lat ${payload.latitude}, Lng ${payload.longitude}`); 
// // Note: If you don't have a logger in frontend, use console.log:
// console.log('Final Payload before API call:', payload);

//   // 5. API Call
//   this.http.post(this.apiUrl, payload).subscribe({
//     next: async () => {
//       const msg = await this.translate.get('ATTENDANCE.SUCCESS').toPromise();
//       this.presentToast(msg, 'success');
//       setTimeout(() => {
//         this.isSubmitting = false;
//         this.goBack();
//       }, 1500);
//     },
//     error: async (err) => {
//       console.error("Submission Error:", err);
//       this.isSubmitting = false;
//       this.resetSlider();
//       const msg = await this.translate.get('ATTENDANCE.SYNC_ERROR').toPromise();
//       this.presentToast(msg, 'danger');
//     }
//   });
// }

async submitAttendance() {
  if (this.isSubmitting) return; 

  // 1. Photo validation
  if (!this.capturedPhoto) {
    const msg = await this.translate.get('ATTENDANCE.PHOTO_REQUIRED').toPromise();
    this.presentToast(msg, 'warning');
    this.resetSlider();
    return;
  }

  // 2. Beat selection validation
  if (!this.selectedBeat) {
    this.presentToast("Please select a Beat/Geofence first.", "warning");
    this.resetSlider();
    return;
  }

  // 3. Geofence Boundary validation
  const boundaryPoints = this.parseBeatCoordinates(this.selectedBeat.boundary_coordinates);
  if (boundaryPoints.length > 0) {
    const isInside = this.isPointInPolygon([this.currentLat, this.currentLng], boundaryPoints);
    if (!isInside) {
      this.presentToast("Aap select kiye gaye Geofence/Beat boundary ke bahar hain!", "danger");
      this.resetSlider();
      this.isSubmitting = false;
      return;
    }
  }

  // 2. Fetch IDs from LocalStorage (Using both direct keys and user_data object for safety)
  const rawUserData = localStorage.getItem('user_data');
  const userData = rawUserData ? JSON.parse(rawUserData) : null;

  // Prioritize direct keys, then fallback to user_data object
  const rangerId = localStorage.getItem('ranger_id') || (userData ? userData.id : null);
  const companyId = localStorage.getItem('company_id') || (userData ? userData.company_id : null);

  // 3. Session Validation
  if (!rangerId || !companyId || companyId === '0') {
    console.error("CRITICAL ERROR: Missing session IDs!", { rangerId, companyId });
    const msg = "Session expired. Please re-login.";
    this.presentToast(msg, 'danger');
    this.isSubmitting = false;
    this.resetSlider();
    return;
  }

  this.isSubmitting = true;
  this.cdr.detectChanges(); 

  // 4. Payload Preparation matching Postman mapping
  const token = localStorage.getItem('api_token');
  const headers = { 'Bypass-Token': 'true' };

  // V2 API requires the dynamic_assignment entity_id, NOT the old geo_id
  // Static users should send entity_id as null, and geo_id as the selected beat ID
  const isDynamicUser = !!(userData?.dynamic_assignment?.entity_id || userData?.is_dynamic || String(userData?.user_type || '').toLowerCase() === 'dynamic');
  const dynamicEntityId = userData?.dynamic_assignment?.entity_id || userData?.entity_id;
  const selectedBeatId = this.selectedBeat?.id;

  let resolvedEntityId: any = null;
  let resolvedGeoId: any = '1';

  if (isDynamicUser) {
    resolvedEntityId = dynamicEntityId || selectedBeatId || 1;
    resolvedGeoId = dynamicEntityId || '1';
  } else {
    resolvedEntityId = null; // Send null for static users
    resolvedGeoId = '1'; // Always send 1 for geo_id as requested
  }

  console.log('🔑 Entity ID Resolution:', { isDynamicUser, dynamicEntityId, selectedBeatId, resolvedEntityId, resolvedGeoId });

  const commonPayload = {
    api_token: token,
    entity_id: resolvedEntityId,
    latitude: this.currentLat.toString(),
    longitude: this.currentLng.toString(),
    photo: this.capturedPhoto,
    // Maintaining these properties for local offline fallback compatibility
    geo_id: resolvedGeoId, 
    geo_name: this.selectedBeat?.name || userData?.dynamic_assignment?.entity?.name || this.currentAddress || 'Unknown Location',
    site_id: 'beat',
    attendance_type: 'BEAT',
    site_name: this.selectedBeat?.name || userData?.dynamic_assignment?.entity?.name || this.siteName,
    location: `${this.currentLat},${this.currentLng}`,
    remark: this.remark || 'Beat Attendance'
  };

  // 5. Debug Logs
  console.log('--- ATTENDANCE SUBMISSION START ---');
  console.log('Type:', this.isEntry ? 'Entry' : 'Exit');
  console.log('Payload:', commonPayload);

  // 6. Check Online Status
  if (!this.dataService.isOnline()) {
    console.warn("Offline detected. Saving attendance draft locally.");
    const offlinePayload = {
      ...commonPayload,
      isEntry: this.isEntry, // Store type for offline sync
      createdAt: new Date().toISOString(),
      geo_name: commonPayload.geo_name || 'Offline Location'
    };
    this.dataService.saveAttendanceDraft(offlinePayload, 'beat');
    
    this.isSubmitting = false;
    this.resetSlider();
    this.presentToast('Attendance saved offline. It will sync when online.', 'secondary');
    this.pushService.triggerSelfNotification(
      'Attendance Saved (Offline)',
      'Your beat attendance has been saved as offline draft successfully.',
      'info'
    );
    
    setTimeout(() => {
      this.navCtrl.navigateRoot('/attendance-list', { queryParams: { mode: 'beat' } });
    }, 1500);
    return;
  }

  // 7. API Call through DataService
  const req = this.isEntry 
      ? this.dataService.markAttendance(commonPayload, headers) 
      : this.dataService.markAttendanceExit(commonPayload, headers);

  const loader = await this.loadingCtrl.create({
    message: 'Submitting Attendance...',
    spinner: 'crescent'
  });
  await loader.present();

  req.subscribe({
    next: async () => {
      await loader.dismiss();
      const msg = await this.translate.get('ATTENDANCE.SUCCESS').toPromise();
      this.presentToast(msg, 'success');
      this.pushService.triggerSelfNotification(
        'Attendance Marked Successfully',
        this.isEntry ? 'Your entry beat attendance has been marked successfully.' : 'Your exit beat attendance has been marked successfully.',
        'success'
      );
      
      // Clear flag after success
      setTimeout(() => {
        this.isSubmitting = false;
        this.navCtrl.navigateRoot('/attendance-list', { queryParams: { mode: 'beat' } });
      }, 1500);
    },
    error: async (err) => {
      await loader.dismiss();
      console.error("Submission Error Details:", err);
      this.isSubmitting = false;
      this.resetSlider();
      
      let errorMsg = await this.translate.get('ATTENDANCE.SYNC_ERROR').toPromise();
      if (err.status === 400) {
        errorMsg = "Validation Error: Check coordinates/IDs";
      }
      
      this.presentToast(errorMsg, 'danger');
    }
  });
}

  async presentImageSourceOptions() {
    this.captureImage(CameraSource.Camera);
  }

  // Rest of slider logic stays same...
  resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  async captureImage(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({ 
        quality: 50, 
        source: source, 
        resultType: CameraResultType.Base64 ,
        width: 800,
      });
      if (photo.base64String) {
        this.capturedPhoto = `data:image/jpeg;base64,${photo.base64String}`;
      }
    } catch (e) { console.log('Camera cancelled'); }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/attendance-list'); }

  ngOnDestroy() { 
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId }); 
    if (this.map) this.map.remove();
  }

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 60; 
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting) return;
    let moveX = event.touches[0].clientX - this.startX;
    if (moveX < 0) moveX = 0;
    if (moveX > this.maxSlide) moveX = this.maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / this.maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting) return;
    if (this.currentTranslateX >= this.maxSlide * 0.85) {
      this.currentTranslateX = this.maxSlide;
      this.submitAttendance();
    } else {
      this.resetSlider();
    }
  }

  // --- Image Viewer Methods ---
  openZoom(imageUrl: string) {
    this.selectedZoomImage = imageUrl;
    this.currentZoom = 1;
  }

  toggleZoom(event: any) {
    event.stopPropagation();
    if (this.currentZoom >= 2.5) {
      this.currentZoom = 1;
    } else {
      this.currentZoom += 0.5;
    }
  }

  closeZoom() {
    this.selectedZoomImage = null;
    this.currentZoom = 1;
  }
  async downloadImage(imageUrl: string) {
    if (!imageUrl) return;
    await this.photoViewer.download(imageUrl);
  }
}