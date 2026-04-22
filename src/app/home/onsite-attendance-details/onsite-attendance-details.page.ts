import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';
import { DataService } from '../../data.service';
import { PhotoViewerService } from '../../services/photo-viewer.service';

@Component({
  selector: 'app-onsite-attendance-details',
  templateUrl: './onsite-attendance-details.page.html',
  styleUrls: ['./onsite-attendance-details.page.scss'],
  standalone: false 
})
export class OnsiteAttendanceDetailsPage implements OnInit {
  public attendanceData: any;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dataService: DataService,
    private photoViewer: PhotoViewerService
  ) {}

  ngOnInit() {
    const log = this.dataService.getSelectedAttendance();
    if (log) {
      this.attendanceData = {
        ...log,
        geofence: log.geo_name || log.geofence || 'Verified Location',
        region: log.site_name || log.region || 'Onsite',
        rangerName: log.name || log.rangerName || 'Ranger',
        createdAt: log.timestamp || log.entryDateTime || log.created_at || log.createdAt || new Date(),
        type: log.type || 'ONSITE',
        photo: log.photo
      };
    } else {
      // Get ID from Query Params as fallback
      this.route.queryParams.subscribe(params => {
        if (params['id']) {
          this.loadDetails(params['id']);
        }
      });
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
          region: raw.site_name || raw.region || 'Onsite',
          rangerName: raw.name || raw.rangerName || 'Ranger',
          createdAt: raw.timestamp || raw.entryDateTime || raw.created_at || new Date(),
          type: raw.type || 'ONSITE',
          photo: raw.photo
        };
      },
      error: (err) => console.error('Error loading details via Sir\'s API', err)
    });
  }

  public map: any;

  ionViewDidEnter() {
    if (this.attendanceData && (this.attendanceData.latitude || this.attendanceData.location)) {
      this.triggerMapInit();
    }
  }

  triggerMapInit() {
    const data = this.attendanceData;
    let lat = Number(data.latitude);
    let lng = Number(data.longitude);

    if ((!lat || !lng) && data.location && typeof data.location === 'string' && data.location.includes(',')) {
      const parts = data.location.split(',');
      lat = parseFloat(parts[0]);
      lng = parseFloat(parts[1]);
    }

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setTimeout(() => {
        this.initMap(lat, lng);
      }, 500); 
    }
  }

  initMap(lat: number, lng: number) {
    if (this.map) { this.map.remove(); }

    this.map = L.map('attendanceMap', {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 400);

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

  openZoom(photo: string) {
    if (!photo) return;
    this.photoViewer.open(photo);
  }
}