

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

      // --- Session State ---
      activePatrolId: string | null = null; 
      patrolName: string = 'Active Patrol';
      recentSightings: any[] = [];
      selectedZoomImage: string | null = null;

      // --- Map and Tracking ---
      map!: L.Map;
      marker!: L.Marker;
      private sightingMarkersLayer = L.layerGroup();
      timerDisplay: string = '00:00:00';
      seconds = 0;
      timerInterval: any;
      gpsWatchId: any;
      
      // UI States (Needed for Template)
      isSubmitting: boolean = false;
      isFinished: boolean = false; 
      capturedPhotos: string[] = [];
      
      totalDistanceKm: number = 0;
      lastLatLng: L.LatLng | null = null;
      routePoints: { lat: number; lng: number }[] = [];
      activeReportCategory: 'criminal' | 'events' = 'criminal';
      
      criminalActions = [
        { id: 'if', title: 'Illegal Felling', icon: 'fa-tree', class: 'felling', category: 'crimes' },
        { id: 'enc', title: 'Encroachment', icon: 'fa-map-location-dot', class: 'water', category: 'crimes' },
        { id: 'itt', title: 'Illegal Timber Transport', icon: 'fa-truck', class: 'impact', category: 'crimes' },
        { id: 'its', title: 'Illegal Timber Storage', icon: 'fa-warehouse', class: 'other', category: 'crimes' },
        { id: 'wap', title: 'Wild Animal Poaching', icon: 'fa-bullseye', class: 'death', category: 'crimes' },
        { id: 'im', title: 'Illegal Mining', icon: 'fa-mountain', class: 'animal', category: 'crimes' }
      ];

      eventActions = [
        { id: 'jfmc', title: 'JFMC / Social Forestry', icon: 'fa-users', class: 'impact', category: 'events' },
        { id: 'was', title: 'Wild Animal Sighting', icon: 'fa-paw', class: 'animal', category: 'events' },
        { id: 'wss', title: 'Water Source Status', icon: 'fa-droplet', class: 'water', category: 'events' },
        { id: 'fire', title: 'Fire Alerts', icon: 'fa-fire', class: 'felling', category: 'events' },
        { id: 'comp', title: 'Wildlife Compensation', icon: 'fa-wallet', class: 'other', category: 'events' }
      ];

      startTime: string = new Date().toISOString();

    
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
        private dataService: DataService
      ) { }

    ngOnInit() {
      this.route.queryParams.subscribe(params => {
        // 1. Get the ID from any available source
        const rawId = params['id'] || params['patrolId'] || localStorage.getItem('active_patrol_id');
        
        // 2. Only proceed if rawId actually exists
        if (rawId) {
          const validatedId: string = rawId.toString(); 
          this.activePatrolId = validatedId;
          
          // 🛡️ SYNC SECURITY: Ensure LocalStorage always matches the active screen URL
          localStorage.setItem('active_patrol_id', validatedId);
          console.log("🚀 [SYNC] Patrol ID locked to:", validatedId);
        } else {
          console.error("CRITICAL: No ID found!");
          this.navCtrl.navigateRoot('/home/patrol-logs');
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
        // 🛡️ REFRESH GUARD: Always fetch fresh data on entry
        if (this.activePatrolId && this.activePatrolId !== this.route.snapshot.queryParamMap.get('id')) {
            console.log("🛡️ ID CHANGE DETECTED: Flushing state...");
            this.recentSightings = [];
            this.sightingMarkersLayer.clearLayers();
        }
        
        this.refreshRecentSightings();
      }

      // --- Navigation & Sightings ---



    openQuickReport(action: any) {
      // 🛡️ RE-VALIDATE: Ensure we haven't lost the ID before navigating
      const currentId = this.activePatrolId || localStorage.getItem('active_patrol_id');
      
      if (!currentId) {
        this.showToast("No active patrol session found!", "warning");
        return;
      }
      
      // Navigate to events-fields with title and category
      this.navCtrl.navigateForward([`/events-fields/${action.title}/${action.category}`], {
        queryParams: {
          patrolId: currentId,
          activeId: currentId // Second key for redundancy
        }
      });
    }

    setCategoryGroup(group: 'criminal' | 'events') {
      this.activeReportCategory = group;
      this.cdr.detectChanges();
    }

    goToSightings(type: string) {
      if (!this.activePatrolId) return;
      this.navCtrl.navigateForward(['/home/sightings'], {
        queryParams: { type: type, patrolId: this.activePatrolId }
      });
    }


    refreshRecentSightings() {
      // 🛡️ Guard: Strict ID check to avoid getting 'all' data
      if (!this.activePatrolId || this.activePatrolId === 'null' || this.activePatrolId === 'undefined') {
        console.warn("Refresh skipped: Invalid activePatrolId", this.activePatrolId);
        this.recentSightings = []; // Clear current list if no active patrol
        return;
      }

      const rangerId = this.dataService.getRangerId();
      const activeObs$ = this.http.get(`${this.apiUrl}/active?userId=${rangerId}`);
      const forestReports$ = this.http.get(`${environment.apiUrl}/forest-events?patrolId=${this.activePatrolId}`);

      forkJoin([activeObs$, forestReports$]).subscribe({
        next: ([activeData, forestData]: [any, any]) => {
          console.log("DEBUG: Processing Active Session Data:", { activeData, forestData });

          // 1. Process Legacy Sightings from active data (STRICT ID CHECK)
          let active: any = null;
          let combinedLogs: any[] = [];
          
          if (Array.isArray(activeData)) {
            active = activeData.find((p: any) => p.id.toString() === this.activePatrolId);
          } else if (activeData && activeData.id && activeData.id.toString() === this.activePatrolId) {
            active = activeData;
          }

<<<<<<< Updated upstream
        this.dataService.getOngoingPatrols().subscribe({
          next: (res: any) => {
            // Support both direct array and { data: [] } formats
            const allPatrols = Array.isArray(res) ? res : (res.data || []);
            
            const active = allPatrols.find((p: any) => p.id.toString() === this.activePatrolId);
            
            if (active) {
              // FIX: Map through the sightings and provide a fallback for category
              const rawSightings = active.obs_details || active.obsDetails || [];
              this.recentSightings = rawSightings.map((s: any) => ({
                ...s,
                category: s.category || 'Other' 
              }));
=======
          // 🛡️ Determine Session Start Time with STRICT Normalization
          const rawStart = active?.startTime || active?.start_time || this.startTime;
          
          // Helper to ensure we treat database strings correctly
          const toUtcEpoch = (dateStr: any) => {
              if (!dateStr) return 0;
              let s = dateStr.toString();
>>>>>>> Stashed changes
              
              // 1. If it's pure number (epoch), use it
              if (!isNaN(s) && s.length > 10) return Number(s);

              // 2. Clear parsing: Trust the browser's Date constructor
              // It will treat strings with 'Z' as UTC and others as Local (IST)
              const d = new Date(s);
              if (!isNaN(d.getTime())) return d.getTime();

              // 3. Fallback for "Year-Month-Day HH:MM:SS" with no TZ
              if (s.includes('-') && s.includes(':') && !s.includes('T')) {
                  // Try parsing as Local first, then UTC
                  const d2 = new Date(s.replace(' ', 'T'));
                  if (!isNaN(d2.getTime())) return d2.getTime();
              }
              
              return 0;
          };

          const sessionStart = toUtcEpoch(rawStart);
          
          // 🛡️ REFRESH GUARD: Always start with a clean slate for combinedLogs
          let sessionLogs: any[] = [];

          console.log(`🔍 [ISO SYNC] Session Start: ${rawStart} -> Epoch: ${sessionStart} (${new Date(sessionStart).toLocaleString()})`);
          console.log(`🔍 [ISO SYNC] Current Time: ${new Date().toLocaleString()} -> Epoch: ${Date.now()}`);

          if (active) {
            const rawSightings = active.obs_details || active.obsDetails || [];
            const mappedActive = rawSightings.map((s: any) => {
              const iconData = this.getIconForCategory(s.category);
              const rawTime = s.created_at || s.timestamp || s.date_time || s.date || s.time;
              
              if (!rawTime) return null;

              return {
                ...s,
                displayTitle: this.formatTitle(s.category || 'Other'),
                displaySubtitle: null,
                timestamp: rawTime,
                icon: iconData.icon,
                colorClass: iconData.colorClass,
                source: 'patrol',
                lat: parseFloat(s.latitude || s.lat),
                lng: parseFloat(s.longitude || s.lng)
              };
            }).filter((item: any) => item !== null);

            // Filter legacy items by time AND ID (STRICT ISO)
            const currentIdStr = (this.activePatrolId || "").toString();
            
            mappedActive.forEach((s: any) => {
              const t = toUtcEpoch(s.timestamp);
              
              const isAfter = t >= (sessionStart - 1000); 
              const matchesId = s.patrol_id != null ? (s.patrol_id.toString() == currentIdStr) : true; // Local items might lack ID
              
              if (isAfter && matchesId) {
                  console.log(`✅ [ALLOW LOCAL] ${s.category} at ${s.timestamp} (ID: ${s.patrol_id})`);
                  sessionLogs.push(s);
              } else {
                  console.log(`🚫 [BLOCK LOCAL] ${s.category} at ${s.timestamp} -> ${!isAfter ? 'OLD' : 'WRONG ID'}`);
              }
            });
          }

          // 2. Process Forest Reports (TRUST BACKEND FILTER + TEMPORAL SESSION FILTER)
          if (Array.isArray(forestData)) {
            const mappedReports = forestData.map(r => {
                const iconData = this.getIconForCategory(r.report_type || r.category);
                return {
                    id: r.id,
                    displayTitle: this.formatTitle(r.report_type || r.category),
                    displaySubtitle: null,
                    lat: parseFloat(r.latitude),
                    lng: parseFloat(r.longitude),
                    timestamp: r.created_at || r.date_time,
                    icon: iconData.icon,
                    colorClass: iconData.colorClass,
                    source: 'report',
                    photo: r.photo,
                    photos: r.photos,
                    patrol_id: r.patrol_id
                };
            });

            // 🛡️ Filter forest reports by current session (STRICT ID + LENIENT TIME)
            mappedReports.forEach(r => {
                const reportTime = toUtcEpoch(r.timestamp);
                
                // LAYER 1: Patrol ID check (PRIMARY TRUST)
                const currentIdStr = (this.activePatrolId || "").toString();
                const matchesId = r.patrol_id != null && r.patrol_id.toString() == currentIdStr;

                // LAYER 2: Temporal check (With 60s leniency for clock drift)
                const isAfterSession = reportTime >= (sessionStart - 60000); 
                
                // FINAL DECISION: If ID matches, we TRUST it. 
                // Time is secondary guard for safety.
                if (matchesId || (isAfterSession && !r.patrol_id)) {
                  console.log(`✅ [ALLOW FOREST] Report ${r.id} (${r.timestamp}) -> Matches Active Session`);
                  sessionLogs.push(r);
                } else {
                  const reason = !matchesId ? `ID MISMATCH (${r.patrol_id} != ${currentIdStr})` : `TIME OLD`;
                  console.warn(`🚫 [BLOCK FOREST] Report ${r.id} (${r.timestamp}) -> ${reason}`);
                }
            });
          }

          // 3. Strict Deduplication & Sorting
          const seen = new Set();
          this.recentSightings = sessionLogs
            .filter((item: any) => {
                const key = `${item.source}-${item.id || item.timestamp}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a: any, b: any) => {
                const timeA = toUtcEpoch(a.timestamp);
                const timeB = toUtcEpoch(b.timestamp);
                return timeB - timeA;
            });

          console.log(`🏁 [SUMMARY] Session Logs Final Count: ${this.recentSightings.length}`);

          console.log(`✅ Session Logs Prepared: ${this.recentSightings.length} items`);
          this.updateSightingMarkers();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Combined Refresh failed", err);
          this.showToast("Failed to sync patrol data", "danger");
        }
      });
    }

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
        this.showToast("Cannot delete unsynced log. Refreshing...", "warning");
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
<<<<<<< Updated upstream
              this.dataService.deletePatrolLog(sighting.id).subscribe({
=======
              const url = item.source === 'report' 
                ? `${environment.apiUrl}/forest-events/${item.id}`
                : `${environment.apiUrl}/patrols/sightings/${item.id}`;


              this.http.delete(url).subscribe({
>>>>>>> Stashed changes
                next: () => {
                  this.recentSightings.splice(index, 1);
                  this.updateSightingMarkers();
                  this.showToast('Deleted successfully');
                  this.cdr.detectChanges();
                },
                error: (err) => {
                  console.error("Delete failed", err);
                  this.showToast('Server Error: Delete failed', 'danger');
                }
              });
            }
          }
        ]
      });
      await alert.present();
    }


      // --- Map Logic ---

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
          
          this.sightingMarkersLayer.addTo(this.map);
          this.marker = L.marker([lat, lng], { icon: this.locationIcon }).addTo(this.map);
          this.startTracking();
        } catch (e) { console.error("Map failed", e); }
      }

      private formatTitle(str: string): string {
        if (!str) return 'Other';
        return str.replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
      }

      private getIconForCategory(category: string): { icon: string, colorClass: string } {
        const cat = category?.toLowerCase().trim() || '';
        
        // 1. Criminal Actions Mapping
        if (cat.includes('felling')) return { icon: 'fa-tree', colorClass: 'felling' };
        if (cat.includes('encroachment')) return { icon: 'fa-map-location-dot', colorClass: 'water' };
        if (cat.includes('timber transport')) return { icon: 'fa-truck', colorClass: 'impact' };
        if (cat.includes('timber storage')) return { icon: 'fa-warehouse', colorClass: 'other' };
        if (cat.includes('poaching')) return { icon: 'fa-bullseye', colorClass: 'death' };
        if (cat.includes('mining')) return { icon: 'fa-mountain', colorClass: 'animal' };

        // 2. Event Actions Mapping
        if (cat.includes('jfmc')) return { icon: 'fa-users', colorClass: 'impact' };
        if (cat.includes('animal sighting') || cat.includes('species') || cat.includes('animal')) return { icon: 'fa-paw', colorClass: 'animal' };
        if (cat.includes('water')) return { icon: 'fa-droplet', colorClass: 'water' };
        if (cat.includes('fire')) return { icon: 'fa-fire', colorClass: 'felling' };
        if (cat.includes('compensation')) return { icon: 'fa-wallet', colorClass: 'other' };

        // 3. Fallback
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
          // Legacy
          animal: '#ca8a04', water: '#0284c7', impact: '#ea580c', death: '#dc2626', felling: '#16a34a', 
          // New Report Types
          'illegal felling': '#16a34a',
          'encroachment': '#ca8a04',
          'timber transport': '#ea580c',
          'timber storage': '#8b5cf6',
          'poaching': '#dc2626',
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
          html: `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16]
        });
      }

      async startTracking() {
        this.gpsWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 3000 }, (position) => {
          if (position && this.map) {
            const current = L.latLng(position.coords.latitude, position.coords.longitude);
            this.marker.setLatLng(current);
            this.routePoints.push({ lat: current.lat, lng: current.lng });
            if (this.lastLatLng) {
              const dist = this.lastLatLng.distanceTo(current);
              if (dist > 10) { 
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
          this.http.patch(`${environment.apiUrl}/patrols/active/${this.activePatrolId}/route`, { lat, lng }).subscribe();
        }
      }

    
async handleEndTrip(isManual: boolean = false) {
  // 1. Safety Guard: Prevent double-clicks or accidental triggers
  if (!isManual || this.isSubmitting) return;

  // 2. Data Validation: Ensure we have the necessary IDs from LocalStorage
  const rId = localStorage.getItem('ranger_id');
  const cId = localStorage.getItem('company_id');
  const rName = localStorage.getItem('ranger_username') || localStorage.getItem('ranger_name') || 'Ranger';

  if (!rId || !cId) {
    this.showToast("Session Error: Missing Ranger or Company ID. Please log in again.", "danger");
    return;
  }

  // 3. Update UI State
  this.isSubmitting = true;
  this.isFinished = true; // Visual feedback for the slider

  // 4. Show Loading Overlay
  const loader = await this.loadingCtrl.create({ 
    message: 'Syncing Final Patrol Data...', 
    mode: 'ios',
    backdropDismiss: false
  });
  await loader.present();

  // 5. Construct the Payload
  // 5. Construct the FMS Payload
  let eLat = this.lastLatLng ? this.lastLatLng.lat : 0;
  let eLng = this.lastLatLng ? this.lastLatLng.lng : 0;
  
  const fmsPayload = {
    end_lat: String(eLat),
    end_lng: String(eLng),
    status: 'COMPLETED',
    coords: this.routePoints.map(p => [p.lng, p.lat])
  };

  // Upload photos if any before ending trip? Actually Postman has separate `/patrol/{sessionId}/photos` 
  // but we can send it or omit it for now since the mapping asks for `updatePatrolStats` for the end call.
  
  // 6. Execute the Request
  if (!this.activePatrolId) {
    this.showToast("No active patrol ID found", "danger");
    return;
  }
  
  this.dataService.updatePatrolStats(this.activePatrolId, fmsPayload).subscribe({
    next: async (response: any) => {
      console.log("Patrol Sync Success:", response);
      
      // If there are photos, we can upload them sequentially
      for (const photo of this.capturedPhotos) {
        try {
           await firstValueFrom(this.dataService.uploadPatrolPhoto(this.activePatrolId as string, { photo: photo }));
        } catch(e) {
           console.log("Photo upload issue", e);
        }
      }
      
      await loader.dismiss();
      
      // Clear session data only on success
      localStorage.removeItem('active_patrol_id');
      localStorage.removeItem('temp_patrol_name');
      
      // Stop the GPS and Timer
      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.gpsWatchId) {
        await Geolocation.clearWatch({ id: this.gpsWatchId });
      }

      this.showToast("Patrol Saved Successfully", "success");

      // Navigate to History (ensure this path matches your routing)
      this.navCtrl.navigateRoot('/home/patrol-logs');
    },
    error: async (err) => {
      console.error("CRITICAL SYNC ERROR:", err);
      
      await loader.dismiss();
      
      // Revert UI states so the user can try again
      this.isSubmitting = false;
      this.isFinished = false;
      
      // Reset the slider knob position
      this.domCtrl.write(() => {
        if (this.endTripKnob) {
          this.endTripKnob.nativeElement.style.transform = `translateX(0px)`;
        }
      });

      // Provide specific feedback if possible
      const errorMsg = err.error?.message || "Sync Error: Please check your connection.";
      this.showToast(errorMsg, "danger");
    }
  });
}
  viewSightingDetails(log: any, index: number) {
    console.log('Navigating to details for log:', log);
    const sightingId = log.id || `temp-${Date.now()}`;
    this.navCtrl.navigateForward(['/sightings-details', sightingId], {
      state: { 
        data: log,
        source: log.source || 'report',
        id: log.id
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
            if (ev.deltaX > max * 0.8) this.handleEndTrip(true);
            else this.domCtrl.write(() => knob.style.transform = `translateX(0px)`);
          }
        });
        gesture.enable(true);
      }

      // --- Helpers ---

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

      recenterMap() { if (this.lastLatLng && this.map) this.map.panTo(this.lastLatLng); }
      goBack() { this.navCtrl.navigateBack('/patrol-logs'); }
      openZoom(imgUrl: string) { this.selectedZoomImage = imgUrl; }
      closeZoom() { this.selectedZoomImage = null; }

      ngOnDestroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.gpsWatchId) Geolocation.clearWatch({ id: this.gpsWatchId });
        if (this.map) this.map.remove();
      }
    }   