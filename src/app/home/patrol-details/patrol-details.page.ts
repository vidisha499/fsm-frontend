import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DataService } from '../../data.service';
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
    private dataService: DataService
  ) {}

  ngOnInit() {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.patrolId = idFromUrl;
      this.loadPatrolDetails();
    }
  }

  loadPatrolDetails() {
    this.dataService.getPatrolById(String(this.patrolId)).subscribe({
      next: (data: any) => { 
        this.patrol = {
          ...data,
          patrolPhotos: data.patrol_photos || data.patrolPhotos || []
        };

        // If no photos found in main details, try fetching separately as per Postman collection
        if (!this.patrol.patrolPhotos.length && this.patrolId) {
          this.dataService.getPatrolPhotos(this.patrolId).subscribe({
            next: (photoRes: any) => {
              if (photoRes) {
                const photos = Array.isArray(photoRes) ? photoRes : (photoRes.data || []);
                this.patrol.patrolPhotos = photos;
                this.patrol.photos = photos; // Compatibility with template
                this.cdr.detectChanges();
              }
            }
          });
        }

        // Calculate distance if missing
        if (!this.patrol.distanceKm && !this.patrol.distance) {
          this.patrol.distanceKm = this.calculateDistance(this.patrol.route);
        } else {
          this.patrol.distanceKm = this.patrol.distanceKm || this.patrol.distance || '0.00';
        }

        // Calculate duration if missing
        if (!this.patrol.duration) {
          this.patrol.duration = this.calculateDuration(this.patrol);
        }
        
        // Ensure startTime is set for the Date field
        if (!this.patrol.startTime) {
           this.patrol.startTime = this.patrol.start_time || this.patrol.created_at || this.patrol.timestamp || new Date().toISOString();
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
      },
      error: (err: any) => console.error("Load failed", err)
    });
  }

  fetchObservations() {
    this.dataService.getForestReports().subscribe({
      next: (res: any) => {
        const reports = Array.isArray(res) ? res : (res?.data || []);
        const sessionIds: string[] = [];
        if (this.patrol.id) sessionIds.push(String(this.patrol.id));
        if (this.patrol.session_id) sessionIds.push(String(this.patrol.session_id));
        if (this.patrol.sessionId) sessionIds.push(String(this.patrol.sessionId));
        if (this.patrolId) sessionIds.push(String(this.patrolId));

        const startTime = new Date(this.patrol.start_time || this.patrol.startTime || this.patrol.created_at).getTime();
        const endTime = this.patrol.end_time || this.patrol.ended_at ? new Date(this.patrol.end_time || this.patrol.ended_at).getTime() : Date.now() + 10000;
        const userId = Number(this.patrol.user_id || this.patrol.ranger_id);

        const patrolObs = reports.filter((r: any) => {
          const rPatrolId = r.patrol_id ? String(r.patrol_id) : null;
          const rSessionId = r.session_id ? String(r.session_id) : null;
          
          // 1. Direct ID Match
          const isIdMatch = (rPatrolId && sessionIds.includes(rPatrolId)) || 
                           (rSessionId && sessionIds.includes(rSessionId));
          if (isIdMatch) return true;

          // 2. Time-Range Match (Fallback for patrol_id: 0)
          if (!rPatrolId || rPatrolId === '0') {
             const rUserId = Number(r.user_id);
             const rTime = new Date(r.created_at || r.timestamp).getTime();
             
             // If it's the same user and within patrol time window
             if (rUserId === userId && rTime >= (startTime - 30000) && rTime <= (endTime + 30000)) {
               return true;
             }
          }
          return false;
        });
        
        if (patrolObs.length > 0) {
          this.patrol.observationData = patrolObs.map((obs: any) => this.processObservationPhoto(obs));
          this.initMap(); // Re-init map to show markers
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

  calculateDistance(route: any[]): string {
    if (!route || route.length < 2) return '0.00';
    let totalDist = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i+1];
      // Try array format [lat, lng] or object format
      let lat1, lng1, lat2, lng2;
      
      if (Array.isArray(p1)) {
        lat1 = Number(p1[0]); lng1 = Number(p1[1]);
      } else {
        lat1 = Number(p1.latitude || p1.lat); lng1 = Number(p1.longitude || p1.lng);
      }
      
      if (Array.isArray(p2)) {
        lat2 = Number(p2[0]); lng2 = Number(p2[1]);
      } else {
        lat2 = Number(p2.latitude || p2.lat); lng2 = Number(p2.longitude || p2.lng);
      }
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue;
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDist += R * c;
    }
    return totalDist.toFixed(2);
  }

  calculateDuration(patrol: any): string {
    const startStr = patrol.start_time || patrol.created_at || patrol.startTime;
    const endStr = patrol.end_time || patrol.ended_at || patrol.updated_at || patrol.endTime;
    
    if (!startStr || !endStr) return '--:--';
    
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diffMs = end - start;
    
    // If diff is negative or 0 or invalid, maybe still active or corrupted
    if (diffMs <= 0 || isNaN(diffMs)) return '--:--';
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
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
  this.selectedZoomImage = imgUrl;
  
}

closeZoom() {
  this.selectedZoomImage = null;
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