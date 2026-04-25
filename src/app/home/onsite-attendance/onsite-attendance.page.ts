import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavController, ToastController, LoadingController, ActionSheetController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';
import { HierarchyService } from '../../services/hierarchy.service';

@Component({
  selector: 'app-onsite',
  templateUrl: './onsite-attendance.page.html',
  styleUrls: ['./onsite-attendance.page.scss'],
  standalone: false
})
export class OnsiteAttendancePage implements OnInit, OnDestroy {
  // Leaflet Map Variables
  map!: L.Map;
  marker!: L.Marker;
  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  // Slider Logic Variables
  public currentTranslateX: number = 0;
  public textOpacity: number = 1;
  private startX: number = 0;
  
  // Data Variables
  public selectedZoomImage: string | null = null;
  public currentZoom: number = 1; // 🔍 Zoom level state
  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Loading...';
  public currentAddress: string = 'Detecting location...';
  public currentLat: number = 20.1013;
  public currentLng: number = 77.1337;
  public currentDateTime: string = '';
  
  // State Variables
  public isSubmitting: boolean = false;
  public mapLoaded: boolean = false;
  private gpsWatchId: any = null;
  private timer: any;

  // Configuration
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw'; // Re-check if this is restricted

  private assignedSiteId: any = '0'; // Site ID not required for Onsite Attendance

  constructor(
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private dataService: DataService,
    private photoViewer: PhotoViewerService,
    private hierarchyService: HierarchyService
  ) {}

  ngOnInit() {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 60000);
    
    // 1. Deep Scan LocalStorage for ANY assigned Site/Beat ID
    const cId = localStorage.getItem('company_id');
    const possibleKeys = ['site_id', 'beat_id', 'geo_id', 'assigned_site', 'ranger_site_id', 'beatId', 'siteId'];
    for (const key of possibleKeys) {
      const val = localStorage.getItem(key);
      if (val && val !== '0') {
        this.assignedSiteId = val;
        console.log(`✅ Found site ID in ${key}:`, val);
        break;
      }
    }

    // 2. Check inside user_data object (Don't use .id, that's the USER ID)
    if (!this.assignedSiteId || this.assignedSiteId === '0') {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const u = JSON.parse(userData);
          this.assignedSiteId = u.site_id || u.beat_id || u.geo_id || '0';
          if (this.assignedSiteId !== '0') {
            console.log('✅ Found real site ID in user_data:', this.assignedSiteId);
          }
        } catch(e) {}
      }
    }

    // 3. Robust Fallback: Fetch from Company Sites if still 0 or null
    if ((!this.assignedSiteId || this.assignedSiteId === '0') && cId) {
      console.log('Searching for company fallback sites...');
      this.dataService.getSitesList(cId).subscribe({
        next: (res: any) => {
          const sites = res.data || res;
          
          if (Array.isArray(sites) && sites.length > 0) {
            this.assignedSiteId = sites[0].id || sites[0].site_id || sites[0].geo_id || '0';
          } else if (sites && typeof sites === 'object' && sites.id) {
            this.assignedSiteId = sites.id.toString();
          }
        },
        error: () => {}
      });
    }

    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    this.translate.get('ATTENDANCE.DETECTING').subscribe(res => {
      this.currentAddress = res;
    });
  }

  private fetchFallbackSite(cId: string) {
    this.dataService.getSitesList(cId).subscribe({
      next: (sRes: any) => {
        const cSites = sRes.data || (Array.isArray(sRes) ? sRes : []);
        if (cSites.length > 0) {
          this.assignedSiteId = cSites[0].id || cSites[0].site_id || '0';
        }
      }
    });
  }

  hasOffline(): boolean {
    return this.dataService.getAttendanceDrafts('onsite').length > 0;
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

  // --- Map & GPS Logic ---
  async initLeafletMap() {
    try {
      if (this.map) { this.map.remove(); }

      this.map = L.map('onsiteMap', { 
        center: [this.currentLat, this.currentLng], 
        zoom: 17, 
        zoomControl: false 
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Maps'
      }).addTo(this.map);

      this.marker = L.marker([this.currentLat, this.currentLng], { icon: this.locationIcon }).addTo(this.map);

      const pos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: false,
        timeout: 10000 
      });

      this.currentLat = pos.coords.latitude;
      this.currentLng = pos.coords.longitude;

      const newPoint = L.latLng(this.currentLat, this.currentLng);
      this.marker.setLatLng(newPoint);
      this.map.panTo(newPoint);
      
      this.mapLoaded = true;
      this.updateAddress(this.currentLat, this.currentLng);
      this.startLiveTracking();

    } catch (e) {
      console.error("Initial GPS failed", e);
      this.mapLoaded = true; 
      this.startLiveTracking();
    }
  }

  async startLiveTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ 
      enableHighAccuracy: false, 
      maximumAge: 5000 
    }, (position) => {
      if (position && this.map) {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const newPoint = L.latLng(newLat, newLng);
        
        this.marker.setLatLng(newPoint);
        
        const distance = L.latLng(this.currentLat, this.currentLng).distanceTo(newPoint);
        if (distance > 15) { // Update address only if moved significantly
          this.currentLat = newLat;
          this.currentLng = newLng;
          this.updateAddress(newLat, newLng);
        }
        this.cdr.detectChanges();
      }
    });
  }

  recenterMap() {
    if (this.map) {
      this.map.setView([this.currentLat, this.currentLng], 17);
    }
  }

  async updateAddress(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const data: any = await firstValueFrom(this.http.get(url));
      if (data.status === 'OK' && data.results.length > 0) {
        this.currentAddress = data.results[0].formatted_address;
      }
    } catch (err) {
      this.currentAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    this.cdr.detectChanges();
  }

  // --- Photo Handling ---
  async presentImageSourceOptions() {
    const header = await firstValueFrom(this.translate.get('ATTENDANCE.SELECT_SOURCE'));
    const camera = await firstValueFrom(this.translate.get('ATTENDANCE.CAMERA'));
    const gallery = await firstValueFrom(this.translate.get('ATTENDANCE.GALLERY'));
    const cancel = await firstValueFrom(this.translate.get('ATTENDANCE.CANCEL'));

    const actionSheet = await this.actionSheetCtrl.create({
      header: header,
      mode: 'md',
      buttons: [
        { text: camera, icon: 'camera-outline', handler: () => this.captureImage(CameraSource.Camera) },
        { text: gallery, icon: 'image-outline', handler: () => this.captureImage(CameraSource.Photos) },
        { text: cancel, role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }
async captureImage(source: CameraSource) {
  try {
    const image = await Camera.getPhoto({ 
      quality: 50, 
      resultType: CameraResultType.Base64, 
      source,
      width: 800 // Size control for faster upload
    });
    if (image.base64String) {
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      this.cdr.detectChanges(); // 👈 UI update ensure karein
    }
  } catch (error) { 
    console.log('User cancelled camera'); 
  }
}

  // --- Submission & Slider ---
async submit() {
  if (!this.capturedPhoto) {
    const msg = await firstValueFrom(this.translate.get('ATTENDANCE.PHOTO_REQUIRED'));
    this.presentToast(msg, 'warning');
    this.resetSlider();
    return;
  }

  this.isSubmitting = true;
  this.cdr.detectChanges(); 

  const token = localStorage.getItem('api_token');
  
  // --- NEW PAYLOAD FORMAT FROM SIR ---
  const now = new Date();
  const fdate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const datetime = now.toTimeString().split(' ')[0]; // HH:mm:ss
  
   // --- FINAL POSTMAN-COMPLIANT PAYLOAD ---
  const formData = new FormData();
  formData.append('entry', datetime);
  formData.append('name', localStorage.getItem('ranger_username') || 'Ranger');
  formData.append('date', fdate);
  formData.append('applicant_id', localStorage.getItem('ranger_id') || '');
  formData.append('api_token', token || '');
  formData.append('type', 'ONSITE');
  formData.append('remark', 'Onsite Attendance');
  formData.append('applicant_name', localStorage.getItem('ranger_username') || 'Ranger');
  formData.append('company_id', localStorage.getItem('company_id') || '');
  formData.append('photo', this.capturedPhoto);
  // --- VALID SITE ID FOR APPROVAL FLOW ---
  // requestEntryAttendance strict validation requires a real site ID. 
  // We use the assigned site ID or '1' as a fallback. If backend still says 'No site detected', 
  // the backend developer MUST allow attendance_type='ONSITE' to bypass site validation in requestEntryAttendance.
  const validSiteId = this.assignedSiteId !== '0' ? this.assignedSiteId : '1';
  // We have completely removed geo_id and site_id to see if the backend 
  // will accept the ONSITE request without checking geofence validation.
  // formData.append('geo_id', validSiteId); 
  // formData.append('site_id', validSiteId); 
  // formData.append('id', validSiteId); 
  
  formData.append('geo_name', '[Onsite] ' + (this.currentAddress || 'Location'));
  formData.append('site_name', 'Onsite');
  formData.append('applicant_role_id', localStorage.getItem('user_role') || '3');
  formData.append('attendance_type', 'ONSITE');
  
  formData.append('location', `${this.currentLat},${this.currentLng}`); 
  formData.append('lat', this.currentLat.toString());
  formData.append('lng', this.currentLng.toString());

  if (!this.dataService.isOnline()) {
    const offlineData = {
      entry: datetime,
      name: localStorage.getItem('ranger_username'),
      date: fdate,
      applicant_id: localStorage.getItem('ranger_id'),
      api_token: token,
      type: 'ONSITE',
      geo_id: '99999',
      photo: this.capturedPhoto,
      location: `${this.currentLat},${this.currentLng}`
    };
    const offlinePayload = {
      ...offlineData,
      isEntry: true,
      createdAt: now.toISOString()
    };
    this.dataService.saveAttendanceDraft(offlinePayload, 'onsite');
    
    this.isSubmitting = false;
    this.resetSlider();
    this.presentToast('Onsite attendance saved offline.', 'secondary');
    
    setTimeout(() => {
      this.navCtrl.navigateRoot('/attendance-list', { queryParams: { mode: 'onsite' } });
    }, 1500);
    return;
  }

  const loader = await this.loadingCtrl.create({
    message: 'Marking Onsite Attendance...',
    spinner: 'crescent'
  });
  await loader.present();

  // Logging payload for backend developer debugging
  const payloadObject: any = {};
  formData.forEach((value, key) => { payloadObject[key] = value; });
  console.log('📦 FULL PAYLOAD BEING SENT TO requestEntryAttendance:', payloadObject);

  const headers = { 'Bypass-Token': 'true' };
  this.dataService.requestEntryAttendance(formData, headers).subscribe({
    next: async (res: any) => {
      console.log('✅ Final Onsite Response:', res);
      await loader.dismiss();
      this.isSubmitting = false;
      this.resetSlider();
      
      if (res.status === 'SUCCESS' || res.success) {
        this.presentToast('Onsite Attendance Marked Successfully!', 'success');
        this.navCtrl.navigateRoot('/attendance-list', { queryParams: { mode: 'onsite' } });
      } else {
        this.presentToast(res.message || 'Failed to mark attendance', 'danger');
      }
    },
    error: async (err) => {
      await loader.dismiss();
      this.isSubmitting = false;
      this.resetSlider();
      console.error('❌ Final Error:', err);
      this.presentToast('Server Error. Please try again.', 'danger');
    }
  });
}

  onDragStart(event: TouchEvent) {
    if (this.isSubmitting) return;
    this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: TouchEvent) {
    if (this.isSubmitting) return;
    let moveX = event.touches[0].clientX - this.startX;
    const maxSlide = window.innerWidth - 115; 
    if (moveX < 0) moveX = 0;
    if (moveX > maxSlide) moveX = maxSlide;
    this.currentTranslateX = moveX;
    this.textOpacity = 1 - (moveX / maxSlide);
    this.cdr.detectChanges();
  }

  onDragEnd() {
    if (this.isSubmitting) return;
    const maxSlide = window.innerWidth - 115;
    if (this.currentTranslateX > maxSlide * 0.8) {
      this.currentTranslateX = maxSlide;
      this.submit(); 
    } else {
      this.resetSlider();
    }
  }

  resetSlider() {
    this.currentTranslateX = 0;
    this.textOpacity = 1;
    this.cdr.detectChanges();
  }

  // --- Helpers ---
  updateClock() {
    const now = new Date();
    this.currentDateTime = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(now).replace(',', ' •');
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, mode: 'ios' });
    toast.present();
  }

  goBack() { this.navCtrl.back(); }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    if (this.map) this.map.remove();
  }

  // --- Image Viewer Methods ---
  openZoom(imageUrl: string) {
    if (!imageUrl) return;
    this.photoViewer.open(imageUrl);
  }

  closeZoom() {
    this.photoViewer.close();
  }
  async downloadImage(imageUrl: string) {
    const loader = await this.loadingCtrl.create({
      message: 'Downloading...',
      duration: 1000
    });
    await loader.present();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `attendance_photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}