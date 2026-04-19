import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service'; // Path apne hisaab se check kar lein
import * as L from 'leaflet';

@Component({
  selector: 'app-attendance-detail',
  templateUrl: './attendance-detail.page.html',
  styleUrls: ['./attendance-detail.page.scss'],
  standalone: false
})
export class AttendanceDetailPage implements OnInit, AfterViewInit, OnDestroy {
  attendance: any;
  map!: L.Map;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // 1. URL se ID check karein (Agar Direct Link ya Refresh hai toh)
    const id = this.route.snapshot.paramMap.get('id');
    
    // 2. DataService se selected record uthao
    this.attendance = this.dataService.getSelectedAttendance();

    // 3. Agar selectedData nahi hai aur ID hai, toh fetch karein
    if (!this.attendance && id) {
      this.dataService.getAttendanceRequestDetails(id).subscribe({
        next: (res: any) => {
          const raw = res.data || res.attendance || res;
          
          // Normalize Keys for Template
          this.attendance = {
            ...raw,
            geofence: raw.geo_name || raw.geofence || 'General Area',
            region: raw.site_name || raw.region || 'Forest Region',
            rangerName: raw.name || raw.rangerName || 'Ranger',
            createdAt: raw.timestamp || raw.entryDateTime || raw.created_at || raw.createdAt
          };

          if (this.attendance && (this.attendance.latitude || this.attendance.location)) {
            setTimeout(() => {
              this.initMap();
            }, 700); // 👈 Increased delay for absolute frame readiness
          }
        },
        error: (err) => {
          console.error("Could not load attendance details", err);
          this.navCtrl.navigateBack('/home/attendance-list');
        }
      });
    } else if (!this.attendance) {
      this.navCtrl.navigateBack('/home/attendance-list');
    }
  }

  ngAfterViewInit() {
    // 3. Map tabhi initialize karein jab data aur coordinates available hon
    if (this.attendance && this.attendance.latitude && this.attendance.longitude) {
      setTimeout(() => {
        this.initMap();
      }, 600); // 600ms ka delay taaki premium-wrapper transitions complete ho jayein
    }
  }

  initMap() {
    try {
      let lat = parseFloat(this.attendance.latitude);
      let lng = parseFloat(this.attendance.longitude);

      // Robust check for "lat,lng" string in 'location' field
      if ((isNaN(lat) || isNaN(lng)) && this.attendance.location) {
        const parts = this.attendance.location.split(',');
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }

      if (isNaN(lat) || isNaN(lng)) {
        console.warn("Invalid coordinates for map:", lat, lng);
        return;
      }

      // Map initialization
      if (this.map) { this.map.remove(); }
      
      this.map = L.map('detailMap', {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // Standard OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

      // Custom Marker Icon (Optional: Aap apna icon bhi daal sakte hain)
      const customIcon = L.icon({
        iconUrl: 'assets/marker-icon.png', // Check karein ye file assets mein ho
        shadowUrl: 'assets/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });

      // Marker placement
      L.marker([lat, lng]).addTo(this.map)
        .bindPopup(`<b>${this.attendance.geofence}</b><br>Marked here.`)
        .openPopup();

      // Fix for gray tiles issue
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);

    } catch (error) {
      console.error("Map initialization failed", error);
    }
  }

  // Back Button Logic (Header ke glass-btn ke liye)
  goBack() {
    this.navCtrl.back();
  }

  // Memory Leak se bachne ke liye map destroy karein
  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}