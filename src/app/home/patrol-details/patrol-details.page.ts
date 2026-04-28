import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-patrol-details',
  templateUrl: './patrol-details.page.html',
  styleUrls: ['./patrol-details.page.scss'],
  standalone: false
})
export class PatrolDetailsPage implements OnInit {
  patrolId: string | null = null;
  patrol: any = null;
  map!: L.Map;
  mapLoading = true;
  selectedZoomImage: string | null = null;
  

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService, // Added
    private dataService: DataService,
    private photoViewer: PhotoViewerService
  ) {}

  ngOnInit() {
    // 1. Check for data passed via navigation state (Admin Dashboard / Logs)
    const state = window.history.state;
    if (state && state.data) {
      console.log("📍 Received Patrol Data via State:", state.data);
      this.patrol = state.data;
      this.patrolId = String(this.patrol.id || this.patrol.patrol_id);
      
      // Still load details to get full route/observations if missing
      this.loadPatrolDetails();
      return;
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.patrolId = id;
        this.loadPatrolDetails();
      }
    });
  }

  loadPatrolDetails() {
    // Reset current data to avoid stale UI
    this.patrol = { observationData: [] };

    this.dataService.getPatrolById(String(this.patrolId)).subscribe({
      next: (res: any) => { 
        console.log(`📍 Response for ID ${this.patrolId}:`, res);
        
        let data = null;
        const allLogs = Array.isArray(res) ? res : (res?.data || []);
        
        if (Array.isArray(allLogs)) {
          // Strict search for the requested ID in the list
          data = allLogs.find((p: any) => 
            String(p.id) === String(this.patrolId) || 
            String(p.patrol_id) === String(this.patrolId) ||
            String(p.sessionId) === String(this.patrolId)
          );
          
          // Fallback if not found in list but list has items
          if (!data && allLogs.length > 0) {
             console.warn("Exact ID match not found in list.");
          }
        } else {
          data = res;
        }

        if (data) {
          this.processPatrolData(data);
        } else {
          console.warn("Patrol not found by ID. Attempting fallback list search...");
          this.dataService.getOngoingPatrols().subscribe({
            next: (listRes: any) => {
              const list = listRes.data || listRes || [];
              const match = list.find((p: any) => 
                String(p.id) === String(this.patrolId) || 
                String(p.patrol_id) === String(this.patrolId) ||
                String(p.sessionId) === String(this.patrolId)
              );
              if (match) {
                console.log("📍 Found match in fallback list:", match);
                this.processPatrolData(match);
              } else {
                console.error("No patrol found even in fallback list.");
              }
            }
          });
        }
      },
      error: (err: any) => console.error("Load failed", err)
    });
  }

  processPatrolData(data: any) {
    // Try to get photos from the main response first
    let rawPhotos = data.patrol_photos || data.patrolPhotos || data.photos || data.photo || [];
    if (typeof rawPhotos === 'string') {
      try { rawPhotos = JSON.parse(rawPhotos); } catch(e) { rawPhotos = [rawPhotos]; }
    }
    if (!Array.isArray(rawPhotos)) rawPhotos = [];
    
    let processedPhotos = rawPhotos.map((p: any) => {
      let url = p.photo || p.url || p;
      if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:')) {
          return `https://fms.pugarch.in/public/profilepics/patrols/${url}`;
      }
      return url;
    });

    this.patrol = {
      ...data,
      photos: processedPhotos,
      patrolPhotos: processedPhotos
    };

    // Fallback property mapping and parsing
    let routeVal = this.patrol.route || this.patrol.coords || this.patrol.path || this.patrol.polyline || [];
    if (typeof routeVal === 'string') {
      try { routeVal = JSON.parse(routeVal); } catch(e) { routeVal = []; }
    }
    this.patrol.route = Array.isArray(routeVal) ? routeVal : [];

    // 🚀 NEW FALLBACK: If active patrol and server has no route yet, check localStorage
    if (this.patrol.route.length === 0) {
      const localId = localStorage.getItem('active_patrol_id');
      const localSessionId = localStorage.getItem('active_patrol_session_id');
      if (this.patrolId === localId || this.patrolId === localSessionId) {
        const localRoute = localStorage.getItem('active_patrol_route');
        if (localRoute) {
          try { this.patrol.route = JSON.parse(localRoute); } catch(e) {}
        }
      }
    }

    this.patrol.start_time = this.patrol.start_time || this.patrol.start_lat_time || this.patrol.created_at || this.patrol.startTime;
    this.patrol.end_time = this.patrol.end_time || this.patrol.end_lat_time || this.patrol.ended_at || this.patrol.endTime;

    // Calculate distance if missing or 0
    const calcDist = this.calculateDistance(this.patrol.route);
    let rawDist = (calcDist !== '0.00') ? calcDist : (this.patrol.distanceKm || this.patrol.distance || this.patrol.distance_km || this.patrol.total_distance || '0.00');
    // Ensure formatting to 2 decimal places even for fallback values
    this.patrol.distanceKm = !isNaN(Number(rawDist)) ? Number(rawDist).toFixed(2) : '0.00';

    // Calculate duration if missing
    this.patrol.duration = this.calculateDuration(this.patrol);
    
    // Calculate Speed
    this.patrol.avgSpeed = this.calculateSpeed(this.patrol.distanceKm, this.patrol.duration);

    // Ensure startTime is set for the Date field
    if (!this.patrol.startTime) {
        this.patrol.startTime = this.patrol.start_time || new Date().toISOString();
    }

    // Parse existing observations if any
    if (this.patrol.observationData && this.patrol.observationData.length > 0) {
      this.patrol.observationData = this.patrol.observationData.map((obs: any) => this.processObservationPhoto(obs));
    }

    // Fetch observations if not included in patrol details response
    if (!this.patrol.observationData || this.patrol.observationData.length === 0) {
      this.fetchObservations();
    }

    setTimeout(() => this.initMap(), 500);
  }

  fetchObservations() {
    this.dataService.getForestReports().subscribe({
      next: (res: any) => {
        const reports = Array.isArray(res) ? res : (res?.data || []);
        const sessionIds: string[] = [];
        const validId = (id: any) => id && id !== '0' && id !== 0 && id !== 'null';
        
        if (validId(this.patrol.id)) sessionIds.push(String(this.patrol.id));
        if (validId(this.patrol.session_id)) sessionIds.push(String(this.patrol.session_id));
        if (validId(this.patrol.sessionId)) sessionIds.push(String(this.patrol.sessionId));
        if (validId(this.patrolId)) sessionIds.push(String(this.patrolId));

        const startStr = this.patrol.start_time || this.patrol.startTime || this.patrol.created_at;
        const endStr = this.patrol.end_time || this.patrol.ended_at;
        
        const startTime = new Date(startStr).getTime();
        // If completed, use end_time. If active, use now.
        const endTime = endStr ? new Date(endStr).getTime() : Date.now();
        const userId = Number(this.patrol.user_id || this.patrol.ranger_id);

        console.log(`🔍 Filtering Sightings for User: ${userId}, Range: ${startStr} to ${endStr || 'NOW'}`);
        console.log(`🎯 Valid Session IDs:`, sessionIds);

        const patrolObs = reports.filter((r: any) => {
          const rPatrolId = (r.patrol_id && r.patrol_id !== '0' && r.patrol_id !== 0) ? String(r.patrol_id) : null;
          const rSessionId = (r.session_id && r.session_id !== '0' && r.session_id !== 0) ? String(r.session_id) : null;
          
          // 1. Direct ID Match (Priority)
          const isIdMatch = (rPatrolId && sessionIds.includes(rPatrolId)) || 
                           (rSessionId && sessionIds.includes(rSessionId));
          if (isIdMatch) return true;

          // 2. Explicit Rejection: If it has a different ID, it's not ours
          if (rPatrolId || rSessionId) return false;

          // 3. Time-Range Match (Only if NO ID exists on report)
          const rUserId = Number(r.user_id || r.ranger_id || 0);
          if (rUserId !== userId) return false;

          const rTime = new Date(r.created_at || r.timestamp || r.date_time).getTime();
          if (isNaN(rTime) || isNaN(startTime)) return false;

          // If start_time is just a date (00:00:00), the window is too wide. 
          // We only fallback to time-match if we have a proper timestamp.
          const isFullTimestamp = String(startStr).includes(':');
          if (!isFullTimestamp) return false;

          return rTime >= startTime && rTime <= (endTime + 1000); // 1s grace period
        });
        
        console.log(`✅ Found ${patrolObs.length} matching observations.`);
        
        if (patrolObs.length > 0) {
          this.patrol.observationData = patrolObs.map((obs: any) => this.processObservationPhoto(obs));
          this.initMap(); 
        } else {
          this.patrol.observationData = [];
        }
      },
      error: (err) => console.error("Error fetching observations:", err)
    });
  }

  private processObservationPhoto(obs: any) {
    let photosList: string[] = [];
    
    if (Array.isArray(obs.photos)) {
      photosList = [...obs.photos];
    }
    
    if (obs.photo) {
      if (typeof obs.photo === 'string') {
        let cleaned = obs.photo.trim();
        if (cleaned.startsWith('"[') && cleaned.endsWith(']"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1).replace(/\\"/g, '"');
        }
        
        if (cleaned.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
               parsed.forEach((p: any) => {
                  if (p && p.photo) photosList.push(p.photo);
                  else if (p && p.url) photosList.push(p.url);
                  else if (p && p.path) photosList.push(p.path);
                  else if (typeof p === 'string') photosList.push(p);
               });
            }
          } catch(e) {
            let stripped = cleaned.replace(/^\["?|"?]$/g, '');
            if (stripped.startsWith('data:') || stripped.startsWith('http')) {
               photosList.push(stripped);
            } else {
               photosList.push(obs.photo);
            }
          }
        } else {
          photosList.push(cleaned);
        }
      } else if (Array.isArray(obs.photo)) {
        obs.photo.forEach((p: any) => {
            if (p && p.photo) photosList.push(p.photo);
            else if (typeof p === 'string') photosList.push(p);
        });
      }
    }
    
    let validPhotos = photosList.filter(p => typeof p === 'string' && p.length > 5 && !p.startsWith('['));
    validPhotos = validPhotos.map(url => {
        // Fix for absolute URLs that are missing '/public/' which causes 404
        if (typeof url === 'string' && url.includes('fms.pugarch.in/profilepics/')) {
            url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/');
        }
        if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:')) {
            return `https://fms.pugarch.in/public/profilepics/forest_reports/${url}`;
        }
        return url;
    });

    obs.photos = validPhotos;
    obs.photo = null; 
    return obs;
  }

  calculateDistance(route: any): string {
    let routeArr: any[] = [];
    if (typeof route === 'string') {
      try { routeArr = JSON.parse(route); } catch(e) { return '0.00'; }
    } else if (Array.isArray(route)) {
      routeArr = route;
    }
    
    if (routeArr.length < 2) return '0.00';
    let totalDist = 0;
    for (let i = 0; i < routeArr.length - 1; i++) {
      const p1 = routeArr[i];
      const p2 = routeArr[i+1];
      
      let lat1, lng1, lat2, lng2;
      
      // Handle [lng, lat] vs [lat, lng] vs {lat, lng}
      if (Array.isArray(p1)) {
        if (p1[0] > 100 || p1[0] < -100) { // Likely longitude
          lng1 = Number(p1[0]); lat1 = Number(p1[1]);
        } else {
          lat1 = Number(p1[0]); lng1 = Number(p1[1]);
        }
      } else {
        lat1 = Number(p1.latitude || p1.lat); lng1 = Number(p1.longitude || p1.lng);
      }
      
      if (Array.isArray(p2)) {
        if (p2[0] > 100 || p2[0] < -100) {
          lng2 = Number(p2[0]); lat2 = Number(p2[1]);
        } else {
          lat2 = Number(p2[0]); lng2 = Number(p2[1]);
        }
      } else {
        lat2 = Number(p2.latitude || p2.lat); lng2 = Number(p2.longitude || p2.lng);
      }
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue;
      // Skip points at [0,0] which cause massive distance errors
      if ((lat1 === 0 && lng1 === 0) || (lat2 === 0 && lng2 === 0)) continue;
      
      const R = 6371; 
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const segmentDist = R * c;
      
      // Sanity Check: If a single segment is > 2km, it's almost certainly a GPS glitch
      if (segmentDist < 2) {
        totalDist += segmentDist;
      } else {
        console.warn("Skipping glitchy segment of", segmentDist, "km");
      }
    }
    return totalDist.toFixed(2);
  }

  calculateDuration(patrol: any): string {
    const startStr = patrol.start_time || patrol.startTime || patrol.created_at || patrol.started_at || patrol.start_at || patrol.date_time || patrol.timestamp;
    const endStr = patrol.end_time || patrol.ended_at || patrol.updated_at || patrol.endTime || patrol.end_at || patrol.finished_at;
    
    console.log(`⏱️ Calculating duration for Patrol ${patrol.id || patrol.sessionId}:`, { startStr, endStr });

    if (!startStr) return '00:00:00';
    
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs < 0) return '00:00:00';
    
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    
    return `${h}:${m}:${s}`;
  }

  calculateSpeed(distanceKm: string | number, durationStr: string): string {
    const dist = parseFloat(String(distanceKm));
    if (isNaN(dist) || dist <= 0) return '0.0';
    
    let totalHours = 0;
    
    // Check for HH:MM:SS format first (00:00:00)
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':');
      if (parts.length === 3) {
        totalHours = parseInt(parts[0]) + (parseInt(parts[1]) / 60) + (parseInt(parts[2]) / 3600);
      } else if (parts.length === 2) {
        totalHours = (parseInt(parts[0]) / 60) + (parseInt(parts[1]) / 3600);
      }
    } 
    // Fallback for "1h 20m" type formats
    else if (durationStr.includes('h')) {
      const parts = durationStr.split('h');
      totalHours += parseFloat(parts[0]);
      if (parts[1].includes('m')) {
        totalHours += parseFloat(parts[1].split('m')[0]) / 60;
      }
    } else if (durationStr.includes('m')) {
      const parts = durationStr.split('m');
      totalHours += parseFloat(parts[0]) / 60;
      if (parts[1].includes('s')) {
        totalHours += parseFloat(parts[1].replace('s', '')) / 3600;
      }
    }
    
    if (totalHours <= 0) return '0.0';
    const speed = dist / totalHours;
    return speed > 40 ? '0.0' : speed.toFixed(1); // Filter out GPS jumps
  }

initMap() {
    const mapElement = document.getElementById('detailsMap');
    if (!mapElement || !this.patrol) return;

    // 1. Setup Map Instance
    // If a map already exists (e.g., from a previous view), remove it to avoid "Map already initialized" error
    if (this.map) { 
      this.map.remove(); 
    }
    
    this.map = L.map('detailsMap', { 
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: false
    });

    // Add Google Maps Roadmap Layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    }).addTo(this.map);

    // 2. Initialize Bounds to track the area we need to show
    const bounds = L.latLngBounds([]);

    // 3. Handle Route Polyline
    // Map the route array to Leaflet LatLng tuples
    const routeCoords: L.LatLngTuple[] = (this.patrol.route || []).map((p: any) => {
      let lat = p.latitude || p.lat;
      let lng = p.longitude || p.lng;
      if (lat === undefined && Array.isArray(p)) {
         if (p[0] > p[1]) {
           lng = p[0]; lat = p[1];
         } else {
           lat = p[0]; lng = p[1];
         }
      }
      return [Number(lat), Number(lng)] as L.LatLngTuple;
    }).filter((c: any) => !isNaN(c[0]) && !isNaN(c[1]));

    if (routeCoords.length > 0) {
      const polyline = L.polyline(routeCoords, { 
        color: '#059669', 
        weight: 5, 
        opacity: 0.8 
      }).addTo(this.map);

      // Extend bounds to include the entire polyline
      routeCoords.forEach(coord => bounds.extend(coord));
    }

    // 4. Handle Sighting Markers (Observation Data)
    const sightings = this.patrol.observationData || [];  

    sightings.forEach((obs: any) => {
      // Check both 'latitude/longitude' (Backend) and 'lat/lng' (Old/Fallback)
      let lat = obs.latitude || obs.lat;
      let lng = obs.longitude || obs.lng;
      
      if (lat === undefined && Array.isArray(obs.coords)) {
         lat = obs.coords[0]; lng = obs.coords[1];
      }

      const numLat = Number(lat);
      const numLng = Number(lng);

      if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
        const sightingCoord: L.LatLngTuple = [numLat, numLng];
        
        // 🛡️ Enhanced Icon Mapping
        const iconInfo = this.getIconAndColor(obs.report_type || obs.category);
        const icon = L.divIcon({
          className: 'custom-details-marker',
          html: `<div style="background-color: ${iconInfo.color}; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
                  <i class="fas ${iconInfo.icon}"></i>
                </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        
        L.marker(sightingCoord, { icon })
          .addTo(this.map)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 5px;">
              <b style="text-transform: capitalize; color: #111827;">${this.formatTitle(obs.report_type || obs.category)}</b><br>
              <span style="color: #6b7280; font-size: 11px;">${obs.source === 'report' ? 'Field Report' : (obs.species || 'Sighting')}</span>
            </div>
          `);
        
        bounds.extend(sightingCoord);
      }
    });

    // 5. Final Auto-Zoom Logic
    if (bounds.isValid()) {
      // fitBounds adjusts zoom and center so all polyline points and markers are visible
      this.map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      // Fallback view if no route or sightings exist (Center of project area)
      this.map.setView([19.95, 79.12], 13);
    }

    this.mapLoading = false;
    this.cdr.detectChanges();
  }

private getIconAndColor(category: string): { icon: string, color: string } {
  const cat = category?.toLowerCase().trim() || '';
  
  const colors: any = {
    animal: '#f59e0b',
    water: '#0ea5e9',
    impact: '#8b5cf6',
    death: '#ef4444',
    felling: '#16a34a',
    other: '#64748b'
  };

  if (cat.includes('felling')) return { icon: 'fa-tree', color: colors.felling };
  if (cat.includes('encroachment')) return { icon: 'fa-map-location-dot', color: colors.water };
  if (cat.includes('timber transport')) return { icon: 'fa-truck', color: colors.impact };
  if (cat.includes('timber storage')) return { icon: 'fa-warehouse', color: colors.other };
  if (cat.includes('poaching')) return { icon: 'fa-bullseye', color: colors.death };
  if (cat.includes('mining')) return { icon: 'fa-mountain', color: colors.animal };
  
  if (cat.includes('jfmc')) return { icon: 'fa-users', color: colors.impact };
  if (cat.includes('animal') || cat.includes('species')) return { icon: 'fa-paw', color: colors.animal };
  if (cat.includes('water')) return { icon: 'fa-droplet', color: colors.water };
  if (cat.includes('fire')) return { icon: 'fa-fire', color: colors.death };
  if (cat.includes('plantation')) return { icon: 'fa-leaf', color: colors.felling };
  
  return { icon: 'fa-circle-plus', color: colors.other };
}

formatTitle(str: string): string {
  if (!str) return 'Other';
  return str.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
}

getCategoryIcon(category: string): string {
  return this.getIconAndColor(category).icon;
}

getCategoryColor(category: string): string {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('felling')) return 'felling';
  if (cat.includes('water') || cat.includes('encroachment')) return 'water';
  if (cat.includes('impact') || cat.includes('transport') || cat.includes('jfmc')) return 'impact';
  if (cat.includes('death') || cat.includes('poaching')) return 'death';
  if (cat.includes('animal') || cat.includes('mining')) return 'animal';
  return 'other';
}

  goBack() { this.navCtrl.back(); }
 

  openZoom(imgUrl: string) {
    if (!imgUrl) return;
    this.photoViewer.open(imgUrl);
  }

  closeZoom() {
    this.photoViewer.close();
  }

viewSightingDetails(obs: any) {
  const sightingId = obs.id || `temp-${Date.now()}`;
  this.navCtrl.navigateForward(['/sightings-details', sightingId], {
    state: { 
      data: obs,
      source: obs.source || 'report',
      id: obs.id
    }
  });
}
}