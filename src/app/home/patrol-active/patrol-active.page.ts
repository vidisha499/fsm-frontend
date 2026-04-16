

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
          // Convert to string and store in a CONSTANT
          // TypeScript knows a 'const' won't change to null suddenly
          const validatedId: string = rawId.toString(); 
          
          this.activePatrolId = validatedId;
          localStorage.setItem('active_patrol_id', validatedId);
          
          console.log("SUCCESS: Found Patrol ID:", validatedId);
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
        this.refreshRecentSightings();
      }

      // --- Navigation & Sightings ---



    goToSightings(type: string) {
      // Use the activePatrolId we found in ngOnInit
      if (!this.activePatrolId) {
        console.error("No Active Patrol ID found!");
        return;
      }
      
      // Navigate to the correct path (usually /home/sightings)
      this.navCtrl.navigateForward(['/home/sightings'], {
        queryParams: {
          type: type,
          patrolId: this.activePatrolId
        }
      });
    }

      viewSightingDetails(sighting: any, index: number) {
        const tempId = sighting.id || `temp-${index}`;
        this.navCtrl.navigateForward(['/sightings-details', tempId], {
          state: { data: sighting }
        });
      }

      // refreshRecentSightings() {
      //   if (!this.activePatrolId) return;

      //   this.http.get(`${this.apiUrl}/active`).subscribe({
      //     next: (data: any) => {
      //       const active = Array.isArray(data)
      //         ? data.find((p: any) => p.id.toString() === this.activePatrolId)
      //         : data;
            
      //       if (active) {
      //         this.recentSightings = active.obs_details || active.obsDetails || [];
      //         this.updateSightingMarkers();
      //         this.cdr.detectChanges();
      //       }
      //     },
      //     error: (err) => console.error("Refresh failed", err)
      //   });
      // }

      refreshRecentSightings() {
        if (!this.activePatrolId) return;

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
              
              this.updateSightingMarkers();
              this.cdr.detectChanges();
            }
          },
          error: (err) => console.error("Refresh failed", err)
        });
      }

      // async confirmDeleteLog(index: number, event: Event) {
      //   event.stopPropagation();
      //   const alert = await this.alertCtrl.create({
      //     header: 'Remove Sighting?',
      //     message: 'Are you sure you want to delete this log?',
      //     buttons: [
      //       { text: 'Cancel', role: 'cancel' },
      //       {
      //         text: 'Delete',
      //         role: 'destructive',
      //         handler: () => {
      //           this.recentSightings.splice(index, 1);
      //           this.showToast('Log removed locally');
      //         }
      //       }
      //     ]
      //   });
      //   await alert.present();
      // }
    async confirmDeleteLog(index: number, event: Event) {
      event.stopPropagation();
      const sighting = this.recentSightings[index];
      
      // CRITICAL: Ensure we have an ID. If you just created it, 
      // ensure the backend returned the ID and you saved it.
      if (!sighting.id) {
        this.showToast("Cannot delete unsynced log. Refreshing...", "warning");
        this.refreshRecentSightings();
        return;
      }

      const alert = await this.alertCtrl.create({
        header: 'Remove Sighting?',
        message: 'Permanently delete this from the server?',
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              this.dataService.deletePatrolLog(sighting.id).subscribe({
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

      // --- Photo Logic ---

      async takeQuickPhoto() {
        try {
          const image = await Camera.getPhoto({ 
            quality: 40, 
            resultType: CameraResultType.DataUrl, 
            source: CameraSource.Prompt
          });
          if (image?.dataUrl) {
            this.capturedPhotos = [...this.capturedPhotos, image.dataUrl];
            this.showToast('Photo added');
            this.cdr.detectChanges();
          }
        } catch (e) { console.warn('Photo cancelled'); }
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
        const colors: any = { animal: '#ca8a04', water: '#0284c7', impact: '#ea580c', death: '#dc2626', felling: '#16a34a', other: '#64748b' };
        return L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${colors[cat] || colors.other}; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
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