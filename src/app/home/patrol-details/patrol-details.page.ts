import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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
  
  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService // Added
  ) {}

  ngOnInit() {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.patrolId = idFromUrl;
      this.loadPatrolDetails();
    }
  }

  loadPatrolDetails() {
    this.http.get(`${this.apiUrl}/logs/${this.patrolId}`).subscribe({
      next: (data: any) => { 
        this.patrol = {
          ...data,
          patrolPhotos: data.patrol_photos || data.patrolPhotos || []
        };
        setTimeout(() => this.initMap(), 500);
      },
      error: (err) => console.error("Load failed", err)
    });
  }


  // initMap() {
  //   const mapElement = document.getElementById('detailsMap');
  //   if (!mapElement || !this.patrol) return;

  //   // Route coordinates handle
  //   const coords: L.LatLngTuple[] = (this.patrol.route || []).map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
  //   const center = coords.length > 0 ? coords[0] : [19.95, 79.12];

  //   if (this.map) { this.map.remove(); }

  //   this.map = L.map('detailsMap', { zoomControl: false }).setView(center as L.LatLngExpression, 15);
    
  //   L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
  //     subdomains: ['mt0','mt1','mt2','mt3'] 
  //   }).addTo(this.map);

  //   if (coords.length > 1) {
  //     const polyline = L.polyline(coords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.map);
  //     this.map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
  //   } else if (coords.length === 1) {
  //     L.marker(coords[0]).addTo(this.map);
  //   }
    
  //   this.mapLoading = false;
  //   this.cdr.detectChanges();
  // }


  initMap() {
  const mapElement = document.getElementById('detailsMap');
  if (!mapElement || !this.patrol) return;

  // 1. Setup Map Instance
  if (this.map) { this.map.remove(); }
  this.map = L.map('detailsMap', { zoomControl: false });

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
    subdomains: ['mt0','mt1','mt2','mt3'] 
  }).addTo(this.map);

  // 2. Initialize Bounds
  const bounds = L.latLngBounds([]);

  // 3. Handle Route Polyline
  const routeCoords: L.LatLngTuple[] = (this.patrol.route || []).map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
  if (routeCoords.length > 0) {
    const polyline = L.polyline(routeCoords, { color: '#059669', weight: 5, opacity: 0.8 }).addTo(this.map);
    routeCoords.forEach(coord => bounds.extend(coord));
  }

  // 4. Handle Sighting Markers
  const sightings = this.patrol.observationData?.Details || [];
  sightings.forEach((obs: any) => {
    if (obs.lat && obs.lng) {
      const sightingCoord: L.LatLngTuple = [obs.lat, obs.lng];
      const icon = this.createSightingMarkerIcon(obs.category);
      
      L.marker(sightingCoord, { icon })
        .addTo(this.map)
        .bindPopup(`<b>${obs.category}</b><br>${obs.species || ''}`);
      
      // Extend bounds to include this sighting
      bounds.extend(sightingCoord);
    }
  });

  // 5. Final Auto-Zoom Logic
  if (bounds.isValid()) {
    // fitBounds makes sure EVERYTHING is visible
    this.map.fitBounds(bounds, { padding: [40, 40] });
  } else {
    // Fallback if no data exists
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