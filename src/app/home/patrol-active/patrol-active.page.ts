import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { NavController, AlertController, LoadingController, ToastController, GestureController, DomController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';

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
  currentZoom: number = 1;
  
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

  // UI flags
  isSubmitting: boolean = false;
  isFinished: boolean = false;
  capturedPhotos: string[] = [];
  startTime: string = new Date().toISOString();

  totalDistanceKm: number = 0;
  lastLatLng: L.LatLng | null = null;
  routePoints: { lat: number; lng: number }[] = [];
  activeReportCategory: 'criminal' | 'events' = 'criminal';

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
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private dataService: DataService,
    private photoViewer: PhotoViewerService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const rawId = params['id'] || params['patrolId'] || localStorage.getItem('active_patrol_id');
      if (rawId) {
        this.activePatrolId = rawId.toString();
        localStorage.setItem('active_patrol_id', this.activePatrolId || '');
        if (params['startTime']) {
          localStorage.setItem('patrol_session_start_time', params['startTime']);
        } else if (!localStorage.getItem('patrol_session_start_time')) {
          localStorage.setItem('patrol_session_start_time', new Date().toISOString());
        }
      } else {
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
    if (!localStorage.getItem('active_patrol_session_id')) {
      this.dataService.getOngoingPatrols().subscribe({
        next: (res: any) => {
          const patrols = res?.data || res || [];
          const match = patrols.find((p: any) => p.id?.toString() === this.activePatrolId || p.sessionId === this.activePatrolId);
          if (match && (match.sessionId || match.session_id)) {
            const sId = match.sessionId || match.session_id;
            localStorage.setItem('active_patrol_session_id', sId);
            this.refreshRecentSightings();
          }
        }
      });
    }
    this.refreshRecentSightings();
  }

  ionViewWillEnter() {
    this.refreshRecentSightings();
  }

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

  refreshRecentSightings() {
    const sessionId = localStorage.getItem('active_patrol_session_id') || this.activePatrolId;
    if (!sessionId) return;

    const currentUserId = Number(this.dataService.getRangerId());
    const sessionStart = new Date(localStorage.getItem('patrol_session_start_time') || '2000-01-01').getTime();
    const now = new Date();

    this.dataService.getForestReports({ user_id: currentUserId }).subscribe({
      next: (res: any) => {
        const reports = res?.data || res || [];
        const onlineReports = reports
          .filter((item: any) => {
            const itemPid = String(item.patrol_id || item.patrolId || '0');
            const currentPid = String(sessionId || '');
            const numericPid = String(this.activePatrolId || '');
            const isDirectMatch = (itemPid !== '0' && (itemPid === currentPid || itemPid === numericPid));
            if (isDirectMatch) return true;
            if (itemPid === '0' || itemPid === '') {
              const itemUserId = Number(item.user_id || 0);
              const itemTime = new Date(item.created_at || item.date_time || now).getTime();
              if (itemUserId === currentUserId && itemTime >= sessionStart) return true;
            }
            return false;
          })
          .map((item: any) => {
            const ui = this.getIconForCategory(item.report_type || item.category || 'other');
            return { ...item, icon: ui.icon, colorClass: ui.colorClass, source: 'report', displayTitle: this.formatTitle(item.report_type || item.category || 'Observation') };
          });

        const drafts = this.dataService.getForestEventDrafts().filter(d => d.patrol_id === this.activePatrolId || d.patrolId === this.activePatrolId).map(d => {
          const ui = this.getIconForCategory(d.report_type || d.category || 'other');
          return { ...d, isOffline: true, status: 'OFFLINE', icon: ui.icon, colorClass: ui.colorClass, displayTitle: this.formatTitle(d.report_type || d.category || 'Observation'), created_at: d.createdAt || d.timestamp };
        });

        this.recentSightings = [...drafts, ...onlineReports].sort((a: any, b: any) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());
        this.updateSightingMarkers();
        this.cdr.detectChanges();
      },
      error: err => {
        const drafts = this.dataService.getForestEventDrafts().filter(d => d.patrol_id === this.activePatrolId || d.patrolId === this.activePatrolId).map(d => {
          const ui = this.getIconForCategory(d.report_type || d.category || 'other');
          return { ...d, isOffline: true, status: 'OFFLINE', icon: ui.icon, colorClass: ui.colorClass, displayTitle: this.formatTitle(d.report_type || d.category || 'Observation'), created_at: d.createdAt || d.timestamp };
        });
        this.recentSightings = drafts;
        this.cdr.detectChanges();
      }
    });
  }

  parsePhotos(photoJson: any): any[] {
    if (!photoJson) return [];
    if (Array.isArray(photoJson)) return photoJson.map(p => p.photo || p);
    if (typeof photoJson === 'string' && photoJson.includes('data:')) return [{ photo: photoJson }];
    try {
      const parsed = JSON.parse(photoJson);
      return Array.isArray(parsed) ? parsed.map((p: any) => p.photo || p) : [{ photo: photoJson }];
    } catch (e) { return [{ photo: photoJson }]; }
  }

  async takeQuickPhoto() {
    try {
      const image = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Base64, source: CameraSource.Camera });
      if (image.base64String) {
        this.capturedPhotos.push(`data:image/jpeg;base64,${image.base64String}`);
        this.cdr.detectChanges();
      }
    } catch (error) { console.error('Camera error:', error); }
  }

  async confirmDeleteLog(index: number, event: Event) {
    event.stopPropagation();
    const item = this.recentSightings[index];
    if (!item.id) {
      this.showToast('Cannot delete unsynced log.', 'warning');
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
            const url = `${environment.apiUrl}/forest-events/${item.id}`;
            this.http.delete(url).subscribe({
              next: () => {
                this.recentSightings.splice(index, 1);
                this.updateSightingMarkers();
                this.cdr.detectChanges();
              },
              error: err => console.error('Delete failed', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async initMap() {
    // Small delay to ensure DOM is ready for Leaflet
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if the map container exists
    const mapEl = document.getElementById('map');
    if (!mapEl) {
      console.warn('Map container not found, retrying in 500ms...');
      setTimeout(() => this.initMap(), 500);
      return;
    }

    try {
      let lat = 21.1458; let lng = 79.0882;
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch (e) {
        if (this.routePoints.length > 0) {
          const lp = this.routePoints[this.routePoints.length - 1];
          lat = lp.lat; lng = lp.lng;
        }
      }
      this.lastLatLng = L.latLng(lat, lng);
      this.map = L.map('map', { center: [lat, lng], zoom: 17, zoomControl: false });
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], maxZoom: 20 }).addTo(this.map);
      this.sightingMarkersLayer.addTo(this.map);
      this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
      this.routePolyline = L.polyline([], { color: '#16a34a', weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(this.map);

      const savedRoute = localStorage.getItem('active_patrol_route');
      if (savedRoute) {
        try {
          this.routePoints = JSON.parse(savedRoute);
          const lls = this.routePoints.map(p => L.latLng(p.lat, p.lng));
          this.routePolyline.setLatLngs(lls);
          if (lls.length > 0) {
            this.lastLatLng = lls[lls.length - 1];
            this.map.panTo(this.lastLatLng);
            this.marker.setLatLng(this.lastLatLng);
          }
        } catch (e) {}
      }
      this.startTracking();
    } catch (e) { console.error('Map init failed', e); }
  }

  private formatTitle(str: string): string {
    if (!str) return 'Other';
    return str.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }

  private getIconForCategory(category: string): { icon: string; colorClass: string } {
    const cat = category?.toLowerCase().trim() || '';
    if (cat.includes('felling')) return { icon: 'fa-tree', colorClass: 'felling' };
    if (cat.includes('encroachment')) return { icon: 'fa-map-location-dot', colorClass: 'water' };
    if (cat.includes('poaching')) return { icon: 'fa-bullseye', colorClass: 'death' };
    if (cat.includes('fire')) return { icon: 'fa-fire', colorClass: 'death' };
    if (cat.includes('animal')) return { icon: 'fa-paw', colorClass: 'animal' };
    return { icon: 'fa-circle-plus', colorClass: 'other' };
  }

  private updateSightingMarkers() {
    if (!this.map) return;
    this.sightingMarkersLayer.clearLayers();
    this.recentSightings.forEach(s => {
      const lat = parseFloat(s.latitude || s.lat);
      const lng = parseFloat(s.longitude || s.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        L.marker([lat, lng], { icon: this.createSightingIcon(s.category, s.report_type) }).addTo(this.sightingMarkersLayer);
      }
    });
  }

  private createSightingIcon(category: string, reportType?: string) {
    const ui = this.getIconForCategory(reportType || category || 'other');
    return L.divIcon({
      className: 'custom-details-marker',
      html: `<div style="background-color: #64748b; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;"><i class="fas ${ui.icon}"></i></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 3000 }, position => {
      if (position && this.map) {
        const current = L.latLng(position.coords.latitude, position.coords.longitude);
        if (this.marker) this.marker.setLatLng(current);
        if (!this.lastLatLng || this.lastLatLng.distanceTo(current) > 10) {
          this.routePoints.push({ lat: current.lat, lng: current.lng });
          localStorage.setItem('active_patrol_route', JSON.stringify(this.routePoints));
          if (this.routePolyline) this.routePolyline.addLatLng(current);
          this.lastLatLng = current;
        }
        this.cdr.detectChanges();
      }
    });
  }

  async handleEndTrip(isManual: boolean = false) {
    if (!isManual || this.isSubmitting) return;
    this.isSubmitting = true;
    const loader = await this.loadingCtrl.create({ message: 'Syncing Final Patrol Data...', mode: 'ios' });
    await loader.present();
    const sessionId = localStorage.getItem('active_patrol_session_id') || this.activePatrolId;
    const payload = {
      end_lat: String(this.lastLatLng?.lat || 0),
      end_lng: String(this.lastLatLng?.lng || 0),
      coords: this.routePoints.map(p => [p.lng, p.lat]),
      status: 'COMPLETED'
    };

    if (!this.dataService.isOnline()) {
      this.dataService.savePatrolDraft(payload, 'end');
      await loader.dismiss();
      this.finalizeSession();
    } else {
      this.dataService.updatePatrolStats(sessionId!, payload).subscribe({
        next: async () => {
          for (const photo of this.capturedPhotos) {
            await firstValueFrom(this.dataService.uploadPatrolPhoto(this.activePatrolId!, { photo }));
          }
          await loader.dismiss();
          this.finalizeSession();
        },
        error: async () => { await loader.dismiss(); this.isSubmitting = false; }
      });
    }
  }

  private finalizeSession() {
    localStorage.removeItem('active_patrol_id');
    localStorage.removeItem('patrol_session_start_time');
    localStorage.removeItem('active_patrol_route');
    localStorage.removeItem('active_patrol_session_id');
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    this.navCtrl.navigateRoot('/home/patrol-logs');
  }

  viewSightingDetails(log: any, index: number) {
    this.navCtrl.navigateForward(['/sightings-details', log.id || 0], { state: { data: log, source: 'report' } });
  }

  setupEndTripGesture() {
    if (!this.endTripKnob) return;
    const knob = this.endTripKnob.nativeElement;
    const track = this.endTripTrack.nativeElement;
    const gesture = this.gestureCtrl.create({
      el: knob, gestureName: 'end-trip',
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

  startTimer() {
    const startStr = localStorage.getItem('patrol_session_start_time');
    if (startStr) this.seconds = Math.max(0, Math.floor((Date.now() - new Date(startStr).getTime()) / 1000));
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

  recenterMap() { if (this.lastLatLng && this.map) this.map.panTo(this.lastLatLng); }
  goBack() { this.navCtrl.navigateBack('/patrol-logs'); }
  openZoom(imgUrl: string) { if (imgUrl) this.photoViewer.open(imgUrl); }
  closeZoom() { this.photoViewer.close(); }

  async downloadImage(imageUrl: string) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `patrol_photo_${Date.now()}.jpg`;
    link.click();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
    if (this.map) this.map.remove();
  }
}