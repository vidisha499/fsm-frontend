


// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { NavController } from '@ionic/angular';
// import { DataService } from 'src/app/data.service';
// import * as L from 'leaflet';

// @Component({
//   selector: 'app-todays-patrols-details-admin',
//   templateUrl: './todays-patrols-details-admin.page.html',
//   styleUrls: ['./todays-patrols-details-admin.page.scss'],
//   standalone: false
// })
// export class TodaysPatrolsDetailsAdminPage implements OnInit, OnDestroy {
//   patrolId: string | null = null;
//   patrolData: any = null;
//   isLoading: boolean = true;
//   private map!: L.Map;

//   constructor(
//     private route: ActivatedRoute,
//     private dataService: DataService,
//     private navCtrl: NavController
//   ) {}

//   ngOnInit() {
//     this.patrolId = this.route.snapshot.paramMap.get('id');
//     if (this.patrolId) {
//       this.loadPatrolDetails();
//     }
//   }

//   ngOnDestroy() {
//     if (this.map) {
//       this.map.remove();
//     }
//   }

//  loadPatrolDetails() {
//   this.http.get(`${this.apiUrl}/logs/${this.patrolId}`).subscribe({
//     next: (data: any) => { 
//       // Handle potential stringified fields from the database
//       let obsData = data.observationData;
//       if (typeof obsData === 'string') {
//         try { obsData = JSON.parse(obsData); } catch { obsData = []; }
//       }

//       this.patrol = {
//         ...data,
//         observationData: obsData, // Now a flat array
//         patrolPhotos: data.photos || [] 
//       };
      
//       setTimeout(() => this.initMap(), 500);
//     },
//     error: (err) => console.error("Load failed", err)
//   });
// }



//   initMap() {
//     if (!this.patrolData || !this.patrolData.route || this.patrolData.route.length === 0) return;

//     if (this.map) { this.map.remove(); }

//     const route = this.patrolData.route;
//     const startPoint = route[0];
//     const endPoint = route[route.length - 1];
//     const sightings = this.patrol.observationData || [];

//     this.map = L.map('map').setView([startPoint.lat, startPoint.lng], 16);

//     sightings.forEach((obs: any) => {
//     // Check for both 'lat' and 'latitude' based on your entity
//     const lat = obs.lat || obs.latitude;
//     const lng = obs.lng || obs.longitude;

//     if (lat && lng) {
//       const sightingCoord: L.LatLngTuple = [lat, lng];
//       const category = obs.category || obs.sightingType; // Support both names
//       const icon = this.createSightingMarkerIcon(category);
      
//       L.marker(sightingCoord, { icon })
//         .addTo(this.map)
//         .bindPopup(`<b>${category}</b><br>${obs.species || ''}`);
      
//       bounds.extend(sightingCoord);
//     }
//   });

//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '© OpenStreetMap'
//     }).addTo(this.map);

//     const isStationary = route.length <= 1 || 
//       (startPoint.lat === endPoint.lat && startPoint.lng === endPoint.lng);

//     if (isStationary) {
//       L.marker([startPoint.lat, startPoint.lng]).addTo(this.map)
//         .bindPopup('<b>Stationary Patrol</b>').openPopup();
//     } else {
//       const path = route.map((p: any) => [p.lat, p.lng] as L.LatLngExpression);
//       const polyline = L.polyline(path, { color: '#0d9488', weight: 5 }).addTo(this.map);
//       this.map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
//     }

//     // Force refresh to fix gray tiles
//     setTimeout(() => { this.map.invalidateSize(); }, 200);
//   }

//   // ... (Keep your calculateDuration, getCategoryIcon/Color, and Zoom methods exactly as they are)
//   calculateDuration(start: string, end: string) {
//     if (!start || !end) return 'Active';
//     const s = new Date(start).getTime();
//     const e = new Date(end).getTime();
//     const mins = Math.floor((e - s) / 60000);
//     return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
//   }

//   goBack() { this.navCtrl.navigateBack('/admin'); }

//   getCategoryIcon(category: string): string {
//     const cat = category?.toLowerCase() || '';
//     if (cat.includes('animal')) return 'fas fa-paw';
//     if (cat.includes('water')) return 'fas fa-tint';
//     if (cat.includes('impact')) return 'fas fa-person-hiking';
//     if (cat.includes('felling')) return 'fas fa-tree';
//     if (cat.includes('death')) return 'fas fa-skull';
//     return 'fas fa-eye';
//   }

//   getCategoryColor(category: string): string {
//     const cat = category?.toLowerCase() || '';
//     const colors: any = { animal: '#ca8a04', water: '#0284c7', impact: '#ea580c', death: '#dc2626', felling: '#16a34a' };
//     return colors[cat] || '#64748b';
//   }

//   selectedZoomImage: string | null = null;
//   openZoom(img: string) { this.selectedZoomImage = img; }
//   closeZoom() { this.selectedZoomImage = null; }
// } 


import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-todays-patrols-details-admin',
  templateUrl: './todays-patrols-details-admin.page.html',
  styleUrls: ['./todays-patrols-details-admin.page.scss'],
  standalone: false
})
export class TodaysPatrolsDetailsAdminPage implements OnInit, OnDestroy {
  patrolId: string | null = null;
  patrolData: any = null;
  isLoading: boolean = true;
  private map!: L.Map;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.patrolId = this.route.snapshot.paramMap.get('id');
    if (this.patrolId) {
      this.loadPatrolDetails();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  loadPatrolDetails() {
    this.isLoading = true;
    this.dataService.getPatrolById(Number(this.patrolId)).subscribe({
      next: (data: any) => {
        let rawData = Array.isArray(data) ? data[0] : data;

        // --- ROBUST PARSING LOGIC ---
        let obsData = rawData.observationData;
        if (typeof obsData === 'string') {
          try { obsData = JSON.parse(obsData); } catch { obsData = []; }
        }
        
        // If data is wrapped in a "Details" object (common in your previous logs)
        if (obsData && !Array.isArray(obsData) && obsData.Details) {
          obsData = obsData.Details;
        }

        let routeData = rawData.route;
        if (typeof routeData === 'string') {
          try { routeData = JSON.parse(routeData); } catch { routeData = []; }
        }

        this.patrolData = {
          ...rawData,
          observationData: Array.isArray(obsData) ? obsData : [],
          route: Array.isArray(routeData) ? routeData : [],
          photos: Array.isArray(rawData.photos) ? rawData.photos : []
        };

        this.isLoading = false;
        this.cdr.detectChanges();

        if (this.patrolData.route && this.patrolData.route.length > 0) {
          setTimeout(() => { this.initMap(); }, 500);
        }
      },
      error: (err) => {
        console.error('Error fetching details:', err);
        this.isLoading = false;
      }
    });
  }

  initMap() {
    if (!this.patrolData || !this.patrolData.route || this.patrolData.route.length === 0) return;

    if (this.map) { this.map.remove(); }

    const route = this.patrolData.route;
    const bounds = L.latLngBounds([]);

    this.map = L.map('map', { zoomControl: false }).setView([route[0].lat, route[0].lng], 16);

    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    // 1. Path Polyline
    const pathCoords: L.LatLngTuple[] = route.map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
    L.polyline(pathCoords, { color: '#0d9488', weight: 5 }).addTo(this.map);
    pathCoords.forEach((coord: L.LatLngTuple) => bounds.extend(coord));

    // 2. Sightings Markers - SAFE ARRAY CHECK
    const sightings = Array.isArray(this.patrolData.observationData) ? this.patrolData.observationData : [];
    
    sightings.forEach((obs: any) => {
      const lat = obs.lat || obs.latitude;
      const lng = obs.lng || obs.longitude;

      if (lat && lng) {
        const sightingCoord: L.LatLngTuple = [lat, lng];
        const category = obs.category || obs.sightingType || 'Observation';
        const icon = this.createSightingMarkerIcon(category);

        L.marker(sightingCoord, { icon })
          .addTo(this.map)
          .bindPopup(`<b>${category}</b><br>${obs.species || ''}`);
        
        bounds.extend(sightingCoord);
      }
    });

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }

    setTimeout(() => { this.map.invalidateSize(); }, 200);
  }

  private createSightingMarkerIcon(category: string) {
    const color = this.getCategoryColor(category);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  calculateDuration(start: string, end: string) {
    if (!start || !end) return 'Active';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const mins = Math.floor((e - s) / 60000);
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
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

  getCategoryColor(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return '#ca8a04';
    if (cat.includes('water')) return '#0284c7';
    if (cat.includes('impact')) return '#ea580c';
    if (cat.includes('death')) return '#dc2626';
    if (cat.includes('felling')) return '#16a34a';
    return '#64748b';
  }

  goBack() { this.navCtrl.navigateBack('/admin'); }
  selectedZoomImage: string | null = null;
  openZoom(img: string) { this.selectedZoomImage = img; }
  closeZoom() { this.selectedZoomImage = null; }
}