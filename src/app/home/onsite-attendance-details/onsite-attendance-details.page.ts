import { Component, OnInit, AfterViewInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-onsite-attendance-details',
  templateUrl: './onsite-attendance-details.page.html',
  styleUrls: ['./onsite-attendance-details.page.scss'],
  standalone: false 
})
export class OnsiteAttendanceDetailsPage implements OnInit {
  private map!: L.Map;
  public attendanceData: any;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dataService: DataService
  ) {}

  ngOnInit() {
    // Get ID from Query Params
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.loadDetails(params['id']);
      }
    });
  }

  

 // 1. Ensure ionViewDidEnter only runs if data is already there
ionViewDidEnter() {
  if (this.attendanceData && this.attendanceData.latitude) {
    this.initMap(this.attendanceData.latitude, this.attendanceData.longitude);
  }
}

// 2. Update loadDetails to trigger the map if the page is already active
loadDetails(id: string) {
  this.dataService.getAttendanceRequestDetails(id).subscribe({
    next: (res: any) => {
      // Sir's API data normalization
      const raw = res.data || res.attendance || res;
      
      this.attendanceData = {
        ...raw,
        geofence: raw.geo_name || raw.geofence || 'Verified Location',
        created_at: raw.timestamp || raw.entryDateTime || raw.created_at || new Date(),
        ranger: raw.name || raw.rangerName || 'Ranger',
        ranger_id: raw.id || raw.ranger_id || '#'
      };
      
      const data = this.attendanceData;
      if (data && (data.latitude || data.location)) {
        let lat = data.latitude;
        let lng = data.longitude;

        // Sir's API specific: parse location string "lat,lng"
        if (!lat && data.location && typeof data.location === 'string' && data.location.includes(',')) {
          const parts = data.location.split(',');
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          setTimeout(() => {
            this.initMap(Number(lat), Number(lng));
          }, 500); // 👈 Wait for full DOM/Wrapper rendering
        }
      }
    },
    error: (err) => console.error('Error loading details via Sir\'s API', err)
  });
}

// initMap(lat: number, lng: number) {
//   if (this.map) { this.map.remove(); }

//   this.map = L.map('attendanceMap', {
//     zoomControl: false,
//     attributionControl: false
//   }).setView([lat, lng], 16); // Standard street zoom level

//   // STANDARD STREET VIEW
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

//   setTimeout(() => {
//     this.map.invalidateSize();
//   }, 300);

//   const markerIcon = L.divIcon({
//     className: 'custom-div-icon',
//     html: `<div style='background-color:#0d9488; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px rgba(0,0,0,0.3);'></div>`,
//     iconSize: [14, 14],
//     iconAnchor: [7, 7]
//   });

//   L.marker([lat, lng], { icon: markerIcon }).addTo(this.map);
// }


initMap(lat: number, lng: number) {
  if (this.map) { this.map.remove(); }

  // 1. Initialize map with the same clean settings
  this.map = L.map('attendanceMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 16);

  // 2. CHANGE THIS: Use the Google Maps Roadmap tiles
  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(this.map);

  // Trigger size recalculation to fix gray tiles
  setTimeout(() => {
    this.map.invalidateSize();
  }, 400);

  // 3. Premium Marker: Using your theme color (#0d9488) 
  // but with the "Google GPS dot" style
  const markerIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: #0d9488; 
        width: 16px; 
        height: 16px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 0 15px rgba(13, 148, 136, 0.5);
      "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  L.marker([lat, lng], { icon: markerIcon }).addTo(this.map);
}

  goBack() { this.navCtrl.back(); }
}