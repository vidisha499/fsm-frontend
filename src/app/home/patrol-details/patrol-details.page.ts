import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular'; // FIXED: Character '軟' remove kar diya
import * as L from 'leaflet';

@Component({
  selector: 'app-patrol-details',
  templateUrl: './patrol-details.page.html',
  styleUrls: ['./patrol-details.page.scss'],
  standalone: false // NgModule declarations ke liye ye zaroori hai
})
export class PatrolDetailsPage implements OnInit {
  patrolId: string | null = null;
  patrol: any = null;
  map!: L.Map;
  mapLoading = true;
  loading: boolean = true;
  selectedZoomImage: string | null = null;
  
  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) {}

 



ngOnInit() {
  // Grab ID from the path: /patrol-details/109
  const idFromUrl = this.route.snapshot.paramMap.get('id');

  if (idFromUrl) {
    this.patrolId = idFromUrl;
    this.loadPatrolDetails();
  }
}


loadPatrolDetails() {
  this.http.get(`${this.apiUrl}/logs/${this.patrolId}`).subscribe({
    next: (data: any) => { 
      // Ensure patrol is populated with the correct property names
     this.patrol = {
   ...data,
   patrolPhotos: data.patrol_photos || data.patrolPhotos || []
};
      
      console.log("Verified Photos in Frontend:", this.patrol.patrolPhotos);
      setTimeout(() => this.initMap(), 500);
    }
  });
}



  initMap() {
    const mapElement = document.getElementById('detailsMap');
    if (!mapElement || !this.patrol) return;

    const coords: L.LatLngTuple[] = (this.patrol.route || []).map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
    const center = coords.length > 0 ? coords[0] : [19.95, 79.12];

    if (this.map) { this.map.remove(); }

    this.map = L.map('detailsMap', { zoomControl: false }).setView(center as L.LatLngExpression, 15);
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
      subdomains: ['mt0','mt1','mt2','mt3'] 
    }).addTo(this.map);

    if (coords.length > 1) {
      const polyline = L.polyline(coords, { color: '#059669', weight: 5 }).addTo(this.map);
      this.map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    } else if (coords.length === 1) {
      L.marker(coords[0]).addTo(this.map);
    }
    
    this.mapLoading = false;
    this.cdr.detectChanges();
  }

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return 'fas fa-paw';
    if (cat.includes('water')) return 'fas fa-tint';
    if (cat.includes('felling')) return 'fas fa-tree';
    if (cat.includes('death')) return 'fas fa-skull';
    return 'fas fa-eye';
  }

  goBack() { this.navCtrl.back(); }

  openZoom(imgUrl: string) {
    this.selectedZoomImage = imgUrl;
  }

  // Method to close zoom
  closeZoom() {
    this.selectedZoomImage = null;
  } 
}