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


//   initMap() {
//   const mapElement = document.getElementById('detailsMap');
//   if (!mapElement || !this.patrol) return;

//   // 1. Setup Map Instance
//   if (this.map) { this.map.remove(); }
//   this.map = L.map('detailsMap', { zoomControl: false });

//   L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
//     subdomains: ['mt0','mt1','mt2','mt3'] 
//   }).addTo(this.map);

//   // 2. Initialize Bounds
//   const bounds = L.latLngBounds([]);

//   // 3. Handle Route Polyline
//   const routeCoords: L.LatLngTuple[] = (this.patrol.route || []).map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
//   if (routeCoords.length > 0) {
//     const polyline = L.polyline(routeCoords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.map);
//     routeCoords.forEach(coord => bounds.extend(coord));
//   }

//   // 4. Handle Sighting Markers
//   // const sightings = this.patrol.observationData?.Details || [];
//   // 4. Handle Sighting Markers
// const sightings = this.patrol.observationData || [];  
//   sightings.forEach((obs: any) => {
//     // Note: Backend uses 'latitude'/'longitude', Frontend HTML used 'lat'/'lng'
//     // Let's check both to be safe
//     const lat = obs.latitude || obs.lat;
//     const lng = obs.longitude || obs.lng;

//     if (lat && lng) {
//       const sightingCoord: L.LatLngTuple = [lat, lng];
//       const icon = this.createSightingMarkerIcon(obs.category);
      
//       L.marker(sightingCoord, { icon })
//         .addTo(this.map)
//         .bindPopup(`<b>${obs.category}</b><br>${obs.species || ''}`);
      
//       bounds.extend(sightingCoord);
//     }
//   });
  
//   // sightings.forEach((obs: any) => {
//   //   if (obs.lat && obs.lng) {
//   //     const sightingCoord: L.LatLngTuple = [obs.lat, obs.lng];
//   //     const icon = this.createSightingMarkerIcon(obs.category);
      
//   //     L.marker(sightingCoord, { icon })
//   //       .addTo(this.map)
//   //       .bindPopup(`<b>${obs.category}</b><br>${obs.species || ''}`);
      
//   //     // Extend bounds to include this sighting
//   //     bounds.extend(sightingCoord);
//   //   }
//   // });

//   // 5. Final Auto-Zoom Logic
//   if (bounds.isValid()) {
//     // fitBounds makes sure EVERYTHING is visible
//     this.map.fitBounds(bounds, { padding: [40, 40] });
//   } else {
//     // Fallback if no data exists
//     this.map.setView([19.95, 79.12], 13);
//   }

//   this.mapLoading = false;
//   this.cdr.detectChanges();
// }

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
        const icon = this.createSightingMarkerIcon(obs.category);
        
        L.marker(sightingCoord, { icon })
          .addTo(this.map)
          .bindPopup(`
            <div style="font-family: sans-serif;">
              <b style="text-transform: capitalize;">${obs.category || 'Sighting'}</b><br>
              <span>${obs.species || ''}</span>
            </div>
          `);
        
        // Extend bounds so this marker is visible on the map
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

private createSightingMarkerIcon(category: string) {
  const cat = category?.toLowerCase() || 'other';
  const colors: any = {
    animal: '#ca8a04',
    water: '#0284c7',
    impact: '#ea580c',
    death: '#dc2626',
    felling: '#16a34a',
    other: '#64748b'
  };
  const color = colors[cat] || colors['other'];

  return L.divIcon({
    className: 'custom-details-marker',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return 'fas fa-paw';
    if (cat.includes('water')) return 'fas fa-tint';
    if (cat.includes('impact')) return 'fas fa-person-hiking';
    if (cat.includes('felling')) return 'fas fa-tree';
    if (cat.includes('death')) return 'fas fa-skull';
    return 'fas fa-eye';
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
 
  this.navCtrl.navigateForward(['/sightings-details', 'view'], {
    state: { data: obs }
  });
}
}