import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-patrol-active',
  templateUrl: './patrol-active.page.html',
  styleUrls: ['./patrol-active.page.scss'],
  standalone: false
})
export class PatrolActivePage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('endTripKnob', { read: ElementRef }) endTripKnob!: ElementRef;
  @ViewChild('endTripTrack', { read: ElementRef }) endTripTrack!: ElementRef;

  // Session state
  activePatrolId: string | null = null;
  patrolName: string = 'Active Patrol';
  recentSightings: any[] = [];
  selectedZoomImage: string | null = null;
  currentZoom: number = 1; // 🔍 Zoom level state
  
  criminalActions = [
    { title: 'Illegal Felling', category: 'criminal', icon: 'fa-tree', class: 'felling' },
    { title: 'Encroachment', category: 'criminal', icon: 'fa-map-location-dot', class: 'water' },
    { title: 'Wild Animal Poaching', category: 'criminal', icon: 'fa-bullseye', class: 'death' },
    { title: 'Illegal Mining', category: 'criminal', icon: 'fa-mountain', class: 'animal' },
    { title: 'Illegal Timber Transport', category: 'criminal', icon: 'fa-truck', class: 'impact' },
    { title: 'Illegal Timber Storage', category: 'criminal', icon: 'fa-warehouse', class: 'other' }
  ];

  eventActions = [
    { title: 'Wild Animal Sighting', category: 'events', icon: 'fa-paw', class: 'animal' },
    { title: 'Water Source Status', category: 'events', icon: 'fa-droplet', class: 'water' },
    { title: 'Fire Alerts', category: 'events', icon: 'fa-fire', class: 'felling' },
    { title: 'JFMC / Social Forestry', category: 'events', icon: 'fa-users', class: 'impact' },
    { title: 'Wildlife Compensation', category: 'events', icon: 'fa-wallet', class: 'other' },
    { title: 'Plantation', category: 'events', icon: 'fa-leaf', class: 'felling' }
  ];

  // Map & tracking
  map!: L.Map;
  marker!: L.Marker;
  private routePolyline: L.Polyline | null = null;
  private sightingMarkersLayer = L.layerGroup();
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any;

  // UI flags used in template
  isSubmitting: boolean = false;
  isFinished: boolean = false;
  capturedPhotos: string[] = [];
  // Timestamp when component initialized, used for session start fallback
  startTime: string = new Date().toISOString();

  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  routePoints: { lat: number; lng: number }[] = [];
  activeReportCategory: 'criminal' | 'events' = 'criminal';

  // Helper icons
  private locationIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="blue-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  // Legacy API URL (kept for backward compatibility)
  private apiUrl = environment.apiUrl;

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
    private route: ActivatedRoute,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const rawId = params['id'] || params['patrolId'] || localStorage.getItem('active_patrol_id');
      if (rawId) {
        this.activePatrolId = rawId.toString();
        localStorage.setItem('active_patrol_id', this.activePatrolId || '');
        
        // --- STRICT SESSION TRACKING ---
        // Record EXACTLY when this session started on this device
        if (!localStorage.getItem('patrol_session_start_time')) {
          localStorage.setItem('patrol_session_start_time', new Date().toISOString());
        }
        
        console.log('🚀 [SYNC] Patrol ID locked to:', this.activePatrolId);
      } else {
        console.error('CRITICAL: No ID found!');
        this.navCtrl.navigateRoot('/home/patrol-logs');
        return;
      }
      this.patrolName = localStorage.getItem('temp_patrol_name') || 'Active Patrol';
      this.startTimer();
    });
  }

  ngAfterViewInit() {
    this.initMap();
    this.setupEndTripGesture();
  }

  async ionViewDidEnter() {
    if (this.activePatrolId && this.activePatrolId !== this.route.snapshot.queryParamMap.get('id')) {
      console.log('🛡️ ID CHANGE DETECTED: Flushing state...');
      this.recentSightings = [];
      this.sightingMarkersLayer.clearLayers();
    }
    
    // Recovery Logic: If session string is missing, fetch it from the server
    if (!localStorage.getItem('active_patrol_session_id')) {
      console.log('🔍 Recovering sessionId string from server...');
      this.dataService.getOngoingPatrols().subscribe({
        next: (res: any) => {
          const patrols = res?.data || res || [];
          const match = patrols.find((p: any) => p.id?.toString() === this.activePatrolId || p.sessionId === this.activePatrolId);
          if (match && (match.sessionId || match.session_id)) {
            const sId = match.sessionId || match.session_id;
            localStorage.setItem('active_patrol_session_id', sId);
            console.log('✅ Session string recovered:', sId);
            // Re-refresh now that we have the strict ID
            this.refreshRecentSightings();
          }
        }
      });
    }

    this.refreshRecentSightings();
  }

  ionViewWillEnter() {
    // Refresh reports every time we come back from the reporting page
    this.refreshRecentSightings();
  }

  // ---------- Navigation & UI ----------
  openQuickReport(action: any) {
    const currentId = this.activePatrolId || localStorage.getItem('active_patrol_id');
    if (!currentId) {
      this.showToast('No active patrol session found!', 'warning');
      return;
    }
    this.navCtrl.navigateForward([`/events-fields/${action.title}/${action.category}`], {
      queryParams: { patrolId: currentId, activeId: currentId }
    });
  }

  setCategoryGroup(group: 'criminal' | 'events') {
    this.activeReportCategory = group;
    this.cdr.detectChanges();
  }

  goToSightings(type: string) {
    if (!this.activePatrolId) return;
    this.navCtrl.navigateForward(['/home/sightings'], {
      queryParams: { type, patrolId: this.activePatrolId }
    });
  }

  // ---------- Data Refresh ----------
  refreshRecentSightings() {
    const sessionId = localStorage.getItem('active_patrol_session_id') || this.activePatrolId;
    if (!sessionId) {
      console.warn('Refresh skipped: No active session ID found');
      this.recentSightings = [];
      return;
    }

    // FIX: Do NOT pass the string session ID to Sir's API as patrol_id - backend won't find it.
    // Instead, fetch all reports for this user and apply our client-side smart filter.
    const userId = this.dataService.getRangerId();
    this.dataService.getForestReports({ user_id: userId }).subscribe({
      next: (res: any) => {
        const reports = res?.data || res || [];
        
        // SMART SYNC FAILSAFE: 
        // Sir's API currently has a bug where it saves patrol_id as 0 even when sent correctly.
        // We use a "Double Verification" strategy:
        const currentUserId = Number(this.dataService.getRangerId());
        const sessionStart = new Date(localStorage.getItem('patrol_session_start_time') || '2000-01-01').getTime();
        const now = new Date();
        
        this.recentSightings = reports
          .filter((item: any) => {
            const itemPid = String(item.patrol_id || item.patrolId || '0');
            const currentPid = String(sessionId || '');
            const numericPid = String(this.activePatrolId || '');
            
            // 1. Direct ID Match (Primary)
            const isDirectMatch = (itemPid !== '0' && (itemPid === currentPid || itemPid === numericPid));
            if (isDirectMatch) return true;

            // 2. Strict Session Session Match (Fallback for patrol_id: 0)
            if (itemPid === '0' || itemPid === '') {
              const itemUserId = Number(item.user_id || 0);
              const itemTime = new Date(item.created_at || item.date_time || now).getTime();
              
              // Only match if it's OUR report and was created AFTER the patrol started
              if (itemUserId === currentUserId && itemTime >= sessionStart) {
                return true; 
              }
            }
            return false;
          })
          .map((item: any) => {
            const ui = this.getIconForCategory(item.report_type || item.category || 'other');
            return {
              ...item,
              icon: ui.icon,
              colorClass: ui.colorClass,
              source: 'report',
              displayTitle: this.formatTitle(item.report_type || item.category || 'Observation')
            };
          }).sort((a: any, b: any) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

        this.updateSightingMarkers();
        this.cdr.detectChanges();
        console.log(`📊 Session Reports Synced: ${this.recentSightings.length} entries.`);
      },
      error: err => {
        console.error('Session Report fetch failed', err);
        this.showToast('Failed to sync session reports', 'danger');
      }
    });
  }

  parsePhotos(photoJson: string): any[] {
    if (!photoJson) return [];
    if (typeof photoJson === 'string' && photoJson.includes('data:')) return [{ photo: photoJson }];
    try {
      return JSON.parse(photoJson);
    } catch (e) {
      return [];
    }
  }

  // ---------- Photo handling ----------
  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
      if (image.base64String) {
        this.capturedPhotos.push(`data:image/jpeg;base64,${image.base64String}`);
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  }

  async confirmDeleteLog(index: number, event: Event) {
    event.stopPropagation();
    const item = this.recentSightings[index];
    if (!item.id) {
      this.showToast('Cannot delete unsynced log. Refreshing...', 'warning');
      this.refreshRecentSightings();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Remove Entry?',
      message: 'Permanently delete this from the server?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            const url = item.source === 'report'
              ? `${environment.apiUrl}/forest-events/${item.id}`
              : `${environment.apiUrl}/patrols/sightings/${item.id}`;
            this.http.delete(url).subscribe({
              next: () => {
                this.recentSightings.splice(index, 1);
                this.updateSightingMarkers();
                this.showToast('Deleted successfully');
                this.cdr.detectChanges();
              },
              error: err => {
                console.error('Delete failed', err);
                this.showToast('Server Error: Delete failed', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ---------- Map logic ----------
  async initMap() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 30000 });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.lastLatLng = L.latLng(lat, lng);
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(this.map);
      this.sightingMarkersLayer.addTo(this.map);
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      
      // Initialize live trail line
      this.routePolyline = L.polyline([], {
        color: '#16a34a',
        weight: 4,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(this.map);

      this.startTracking();
    } catch (e) {
      console.error('Map failed', e);
    }
  }

  private formatTitle(str: string): string {
    if (!str) return 'Other';
    return str.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getIconForCategory(category: string): { icon: string; colorClass: string } {
    const cat = category?.toLowerCase().trim() || '';
    if (cat.includes('felling')) return { icon: 'fa-tree', colorClass: 'felling' };
    if (cat.includes('encroachment')) return { icon: 'fa-map-location-dot', colorClass: 'water' };
    if (cat.includes('timber transport')) return { icon: 'fa-truck', colorClass: 'impact' };
    if (cat.includes('timber storage')) return { icon: 'fa-warehouse', colorClass: 'other' };
    if (cat.includes('poaching')) return { icon: 'fa-bullseye', colorClass: 'death' };
    if (cat.includes('mining')) return { icon: 'fa-mountain', colorClass: 'animal' };
    if (cat.includes('jfmc')) return { icon: 'fa-users', colorClass: 'impact' };
    if (cat.includes('animal sighting') || cat.includes('species') || cat.includes('animal')) return { icon: 'fa-paw', colorClass: 'animal' };
    if (cat.includes('water')) return { icon: 'fa-droplet', colorClass: 'water' };
    if (cat.includes('fire')) return { icon: 'fa-fire', colorClass: 'death' }; // FIRE is RED
    if (cat.includes('compensation')) return { icon: 'fa-wallet', colorClass: 'other' };
    if (cat.includes('plantation')) return { icon: 'fa-leaf', colorClass: 'felling' };
    return { icon: 'fa-circle-plus', colorClass: 'other' };
  }

  private updateSightingMarkers() {
    if (!this.map) return;
    this.sightingMarkersLayer.clearLayers();
    this.recentSightings.forEach(s => {
      const lat = parseFloat(s.latitude || s.lat);
      const lng = parseFloat(s.longitude || s.lng);
      
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const icon = this.createSightingIcon(s.category, s.report_type);
        L.marker([lat, lng], { icon }).addTo(this.sightingMarkersLayer)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 2px;">
              <b style="text-transform: capitalize; color: #1e293b; font-size: 12px;">${s.displayTitle || 'Observation'}</b>
            </div>
          `);
      }
    });
  }

  private createSightingIcon(category: string, reportType?: string) {
    const cat = (reportType || category || 'other').toLowerCase().trim();
    const ui = this.getIconForCategory(cat);
    
    const colors: any = {
      felling: '#16a34a',
      water: '#0ea5e9',
      impact: '#8b5cf6',
      death: '#ef4444',
      animal: '#f59e0b',
      other: '#64748b'
    };
    
    const color = colors[ui.colorClass] || colors.other;

    return L.divIcon({
      className: 'custom-details-marker',
      html: `<div style="background-color: ${color}; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
              <i class="fas ${ui.icon}"></i>
            </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 3000 }, position => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        
        // Always update marker position
        if (this.marker) this.marker.setLatLng(current);

        // --- SMART BUFFER LOGIC ---
        // Only record point if distance > 10m from last recorded point
        const shouldAdd = !this.lastLatLng || this.lastLatLng.distanceTo(current) > 10;
        
        if (shouldAdd) {
          this.routePoints.push({ lat: current.lat, lng: current.lng });
          
          if (this.routePolyline) {
            this.routePolyline.addLatLng(current);
          }

          if (this.lastLatLng) {
            const dist = this.lastLatLng.distanceTo(current);
            this.totalDistanceKm += dist / 1000;
          }
          
          this.lastLatLng = current;
        }

        this.cdr.detectChanges();
      }
    });
  }

  // syncLocation(lat: number, lng: number) {
  //   if (this.activePatrolId) {
  //     this.http.patch(`${environment.apiUrl}/patrols/active/${this.activePatrolId}/route`, { lat, lng }).subscribe();
  //   }
  // }

  async handleEndTrip(isManual: boolean = false) {
    if (!isManual || this.isSubmitting) return;
    const rId = localStorage.getItem('ranger_id');
    const cId = localStorage.getItem('company_id');
    if (!rId || !cId) {
      this.showToast('Session Error: Missing Ranger or Company ID. Please log in again.', 'danger');
      return;
    }
    this.isSubmitting = true;
    this.isFinished = true;
    const loader = await this.loadingCtrl.create({
      message: 'Syncing Final Patrol Data...',
      mode: 'ios',
      backdropDismiss: false
    });
    await loader.present();
    const eLat = this.lastLatLng ? this.lastLatLng.lat : 0;
    const eLng = this.lastLatLng ? this.lastLatLng.lng : 0;
    
    // Sir's /patrol/{{sessionId}}/end payload 
    // We strictly use the session string ID here
    const sessionId = localStorage.getItem('active_patrol_session_id') || this.activePatrolId;
    
    const fmsPayload = {
      end_lat: String(eLat),
      end_lng: String(eLng),
      coords: this.routePoints.map(p => [p.lng, p.lat]) // Sir expects raw array
    };

    if (!sessionId) {
      await loader.dismiss();
      this.showToast('No active patrol ID found', 'danger');
      return;
    }

    this.dataService.updatePatrolStats(sessionId, fmsPayload).subscribe({
      next: async () => {
        // Upload patrol photos sequentially using Sir's API
        for (const photo of this.capturedPhotos) {
          try {
            await firstValueFrom(this.dataService.uploadPatrolPhoto(sessionId, { photo }));
          } catch (e) {
            console.error('Photo upload issue', e);
          }
        }
        await loader.dismiss();
        localStorage.removeItem('active_patrol_id');
        localStorage.removeItem('temp_patrol_name');
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.gpsWatchId) await Geolocation.clearWatch({ id: this.gpsWatchId });
        this.showToast('Patrol Saved Successfully', 'success');
        this.navCtrl.navigateRoot('/home/patrol-logs');
      },
      error: async err => {
        console.error('CRITICAL SYNC ERROR:', err);
        await loader.dismiss();
        this.isSubmitting = false;
        this.isFinished = false;
        this.domCtrl.write(() => {
          if (this.endTripKnob) this.endTripKnob.nativeElement.style.transform = `translateX(0px)`;
        });
        const errorMsg = err?.error?.message || 'Sync Error: Please check your connection.';
        const alert = await this.alertCtrl.create({
          header: 'Sync Failed',
          message: errorMsg,
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  viewSightingDetails(log: any, index: number) {
    // Parse report_data safely
    let reportData = log.report_data || {};
    if (typeof reportData === 'string') {
      try { reportData = JSON.parse(reportData); } catch(e) { reportData = {}; }
    }

    // Parse photos from the server format [{photo: "url"}, ...]
    let photos: string[] = [];
    if (log.photo) {
      if (Array.isArray(log.photo)) {
        photos = log.photo.map((p: any) => p.photo || p);
      } else if (typeof log.photo === 'string') {
        try {
          const parsed = JSON.parse(log.photo);
          photos = Array.isArray(parsed) ? parsed.map((p: any) => p.photo || p) : [log.photo];
        } catch (e) { photos = [log.photo]; }
      }
    }

    const fullData = { ...log, report_data: reportData, photos };
    this.navCtrl.navigateForward(['/sightings-details', log.id || 0], {
      state: { data: fullData, source: 'report', id: log.id }
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
        const x = Math.max(0, Math.min(ev.deltaX, max));
        this.domCtrl.write(() => (knob.style.transform = `translateX(${x}px)`));
      },
      onEnd: ev => {
        const max = track.clientWidth - knob.clientWidth - 12;
        if (ev.deltaX > max * 0.8) this.handleEndTrip(true);
        else this.domCtrl.write(() => (knob.style.transform = `translateX(0px)`));
      }
    });
    gesture.enable(true);
  }

  // ---------- Timer & Toast ----------
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
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom', color });
    await toast.present();
  }

  recenterMap() {
    if (this.lastLatLng && this.map) this.map.panTo(this.lastLatLng);
  }

  goBack() {
    this.navCtrl.navigateBack('/patrol-logs');
  }

  openZoom(imgUrl: string) {
    this.selectedZoomImage = imgUrl;
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
    const loading = await this.loadingCtrl.create({
      message: 'Downloading...',
      duration: 1000
    });
    await loading.present();
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `patrol_photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    if (this.map) this.map.remove();
  }
}