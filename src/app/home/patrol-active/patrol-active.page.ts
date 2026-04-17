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
    if (!this.activePatrolId) {
      console.warn('Refresh skipped: Invalid activePatrolId', this.activePatrolId);
      this.recentSightings = [];
      return;
    }
    const rangerId = this.dataService.getRangerId();
    const activeObs$ = this.http.get(`${this.apiUrl}/active?userId=${rangerId}`);
    const forestReports$ = this.http.get(`${environment.apiUrl}/forest-events?patrolId=${this.activePatrolId}`);

    forkJoin([activeObs$, forestReports$]).subscribe({
      next: ([activeData, forestData]: [any, any]) => {
        // Determine session start
        let active: any = null;
        if (Array.isArray(activeData)) {
          active = activeData.find(p => p.id?.toString() === this.activePatrolId);
        } else if (activeData && activeData.id?.toString() === this.activePatrolId) {
          active = activeData;
        }
        const rawStart = active?.startTime || active?.start_time || this.startTime;
        const toUtcEpoch = (dateStr: any) => {
          if (!dateStr) return 0;
          const s = dateStr.toString();
          if (!isNaN(s) && s.length > 10) return Number(s);
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.getTime();
          if (s.includes('-') && s.includes(':') && !s.includes('T')) {
            const d2 = new Date(s.replace(' ', 'T'));
            if (!isNaN(d2.getTime())) return d2.getTime();
          }
          return 0;
        };
        const sessionStart = toUtcEpoch(rawStart);
        const sessionLogs: any[] = [];

        // Process active patrol sightings
        if (active) {
          const rawSightings = active.obs_details || active.obsDetails || [];
          rawSightings.forEach((s: any) => {
            const t = toUtcEpoch(s.timestamp || s.created_at);
            const isAfter = t >= sessionStart - 1000;
            const matchesId = s.patrol_id ? s.patrol_id.toString() === this.activePatrolId : true;
            if (isAfter && matchesId) {
              sessionLogs.push({
                ...s,
                source: 'patrol',
                timestamp: s.timestamp || s.created_at,
                lat: parseFloat(s.latitude || s.lat),
                lng: parseFloat(s.longitude || s.lng)
              });
            }
          });
        }

        // Process forest reports
        if (Array.isArray(forestData)) {
          forestData.forEach((r: any) => {
            const reportTime = toUtcEpoch(r.created_at || r.date_time);
            const matchesId = r.patrol_id ? r.patrol_id.toString() === this.activePatrolId : false;
            const isAfter = reportTime >= sessionStart - 60000;
            if (matchesId || (!r.patrol_id && isAfter)) {
              sessionLogs.push({
                ...r,
                source: 'report',
                timestamp: r.created_at || r.date_time,
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude)
              });
            }
          });
        }

        // Deduplicate, enrich and sort
        const seen = new Set();
        this.recentSightings = sessionLogs
          .filter(item => {
            const key = `${item.source}-${item.id || item.timestamp}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map(item => {
            const ui = this.getIconForCategory(item.category || item.report_type || 'other');
            return {
              ...item,
              icon: ui.icon,
              colorClass: ui.colorClass,
              displayTitle: this.formatTitle(item.report_type || item.category || 'Observation')
            };
          })
          .sort((a, b) => toUtcEpoch(b.timestamp) - toUtcEpoch(a.timestamp));

        this.updateSightingMarkers();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Combined Refresh failed', err);
        this.showToast('Failed to sync patrol data', 'danger');
      }
    });
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
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.lastLatLng = L.latLng(lat, lng);
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(this.map);
      this.sightingMarkersLayer.addTo(this.map);
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
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
    if (cat.includes('fire')) return { icon: 'fa-fire', colorClass: 'felling' };
    if (cat.includes('compensation')) return { icon: 'fa-wallet', colorClass: 'other' };
    return { icon: 'fa-circle-plus', colorClass: 'other' };
  }

  private updateSightingMarkers() {
    if (!this.map) return;
    this.sightingMarkersLayer.clearLayers();
    this.recentSightings.forEach(s => {
      const lat = s.latitude || s.lat;
      const lng = s.longitude || s.lng;
      if (lat && lng) {
        const icon = this.createSightingIcon(s.category);
        L.marker([lat, lng], { icon }).addTo(this.sightingMarkersLayer);
      }
    });
  }

  private createSightingIcon(category: string) {
    const cat = category?.toLowerCase().trim() || 'other';
    const colors: any = {
      animal: '#ca8a04',
      water: '#0284c7',
      impact: '#ea580c',
      death: '#dc2626',
      felling: '#16a34a',
      'illegal felling': '#16a34a',
      encroachment: '#ca8a04',
      'timber transport': '#ea580c',
      'timber storage': '#8b5cf6',
      poaching: '#dc2626',
      'illegal mining': '#0284c7',
      'wild animal sighting': '#ca8a04',
      'water source status': '#0284c7',
      'fire alerts': '#ef4444',
      other: '#64748b'
    };
    let color = colors.other;
    for (const key in colors) {
      if (cat.includes(key)) {
        color = colors[key];
        break;
      }
    }
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16]
    });
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 3000 }, position => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        this.marker.setLatLng(current);
        this.routePoints.push({ lat: current.lat, lng: current.lng });
        if (this.lastLatLng) {
          const dist = this.lastLatLng.distanceTo(current);
          if (dist > 10) {
            this.totalDistanceKm += dist / 1000;
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
      this.http.patch(`${environment.apiUrl}/patrols/active/${this.activePatrolId}/route`, { lat, lng }).subscribe();
    }
  }

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
    const fmsPayload = {
      end_lat: String(eLat),
      end_lng: String(eLng),
      status: 'COMPLETED',
      coords: this.routePoints.map(p => [p.lng, p.lat])
    };
    if (!this.activePatrolId) {
      this.showToast('No active patrol ID found', 'danger');
      return;
    }
    this.dataService.updatePatrolStats(this.activePatrolId, fmsPayload).subscribe({
      next: async () => {
        for (const photo of this.capturedPhotos) {
          try {
            await firstValueFrom(this.dataService.uploadPatrolPhoto(this.activePatrolId as string, { photo }));
          } catch (e) {
            console.log('Photo upload issue', e);
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
        const errorMsg = err.error?.message || 'Sync Error: Please check your connection.';
        this.showToast(errorMsg, 'danger');
      }
    });
  }

  viewSightingDetails(log: any, index: number) {
    const sightingId = log.id || `temp-${Date.now()}`;
    this.navCtrl.navigateForward(['/sightings-details', sightingId], {
      state: { data: log, source: log.source || 'report', id: log.id }
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