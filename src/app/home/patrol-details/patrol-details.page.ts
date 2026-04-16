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

        setTimeout(() => this.initMap(), 500);
      },
      error: (err: any) => console.error("Load failed", err)
    });
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
      const lat = p.latitude || p.lat;
      const lng = p.longitude || p.lng;
      return [Number(lat), Number(lng)] as L.LatLngTuple;
    });

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
      const lat = obs.latitude || obs.lat;
      const lng = obs.longitude || obs.lng;

      if (lat !== undefined && lng !== undefined) {
        const sightingCoord: L.LatLngTuple = [Number(lat), Number(lng)];
        
        // 🛡️ Enhanced Icon Mapping
        const iconInfo = this.getIconAndColor(obs.report_type || obs.category);
        const icon = L.divIcon({
          className: 'custom-details-marker',
          html: `<div style="background-color: ${iconInfo.color}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 8px;">
                  <i class="fas ${iconInfo.icon}"></i>
                </div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
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
  
  // Color palette synchronized with PatrolActivePage
  const colors: any = {
    animal: '#ca8a04',
    water: '#0284c7',
    impact: '#ea580c',
    death: '#dc2626',
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
  if (cat.includes('fire')) return { icon: 'fa-fire', color: colors.felling };
  
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