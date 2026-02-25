


import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-location',
  templateUrl: './location.page.html',
  styleUrls: ['./location.page.scss'],
  standalone: false
})
export class LocationPage implements OnInit, OnDestroy {
  map: any;
  marker: any;
  lat: any;
  lng: any;
  isMapLoading: boolean = true;

  // --- LAYER GROUPS ---
  private attendanceLayer = L.featureGroup();
  private onsiteLayer = L.featureGroup();
  private patrolLayer = L.featureGroup();
  private incidentLayer = L.featureGroup();
  private sightingsLayer = L.featureGroup();
  private patrolStartLayer = L.featureGroup();

  // private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;

  private apiUrl: string = `${environment.apiUrl}/attendance/beat-attendance`;
  private onsiteApiUrl: string = `${environment.apiUrl}/onsite-attendance`;
  private patrolApiUrl: string = `${environment.apiUrl}/patrols/logs`;
  private incidentApiUrl: string = `${environment.apiUrl}/incidents`;



  constructor(
    private navCtrl: NavController,
    private translate: TranslateService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
    }, 800);
  }

  async initMap() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      this.lat = coordinates.coords.latitude.toFixed(6);
      this.lng = coordinates.coords.longitude.toFixed(6);

      this.map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([this.lat, this.lng], 12);

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(this.map);

      // Add all layers to map initially
      this.attendanceLayer.addTo(this.map);
      this.onsiteLayer.addTo(this.map);
      this.patrolLayer.addTo(this.map);
      this.incidentLayer.addTo(this.map);
      this.sightingsLayer.addTo(this.map);
      this.patrolStartLayer.addTo(this.map);

      // --- SETUP TOGGLE MENU ---
      const overlays = {
        "<span style='color: #10b981'>● Attendance</span>": this.attendanceLayer,
        "<span style='color: #8b5cf6'>● On-Site</span>": this.onsiteLayer,
        "<span style='color: #ef4444'>● Sightings</span>": this.sightingsLayer,
        "<span style='color: #ef4444'>⚠️ Incidents</span>": this.incidentLayer,
        "<span style='color: #3b82f6'>📍 Patrol Starts</span>": this.patrolStartLayer,
        "<span style='color: #3b82f6'>━ Patrol Paths</span>": this.patrolLayer,

      };

     // Replace the old line with this one:
L.control.layers(undefined, overlays, { collapsed: false }).addTo(this.map);

      // Current User Marker
      const customIcon = L.divIcon({
        className: 'current-loc-icon',
        html: `<div style="background-color: #4285F4; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      this.marker = L.marker([this.lat, this.lng], { icon: customIcon }).addTo(this.map);

      // Load Data
      this.loadAttendanceMarkers();
      this.loadOnsiteMarkers();
      this.loadPatrolPaths();
      this.loadSightingMarkers();
      this.loadIncidentMarkers();

      this.isMapLoading = false;
    } catch (error) {
      console.error('Error getting location', error);
      this.isMapLoading = false;
    }
  }

loadSightingMarkers() {
  this.http.get<any[]>(this.patrolApiUrl).subscribe({
    next: (logs) => {
      console.log('Total Patrols fetched:', logs.length); // Check this number in console
      
      logs.forEach(log => {
        // Accessing the nested path we found earlier
        const sightings = log.observationData?.Details || [];
        
        if (Array.isArray(sightings)) {
          sightings.forEach((sighting: any) => {
            if (sighting.lat && sighting.lng) {
              this.addSightingMarker(sighting);
            }
          });
        }
      });
    }
  });
}

  addSightingMarker(sighting: any) {
    const sightingIcon = L.divIcon({
      className: 'sighting-marker',
      html: `<div style="background-color: #ef4444; width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    L.marker([sighting.lat, sighting.lng], { icon: sightingIcon })
      .addTo(this.sightingsLayer) // ADD TO LAYER
      .bindPopup(`
        <div style="font-family: sans-serif;">
          <b style="color: #ef4444;">Observation: ${sighting.sighting_type || 'General'}</b><br>
          Species: ${sighting.species || 'N/A'}<br>
          <small>Count: ${sighting.count || 1}</small>
        </div>
      `);
  }


 loadPatrolPaths() {
  this.http.get<any[]>(this.patrolApiUrl).subscribe({
    next: (logs) => {
      logs.forEach(log => {
        // Ensure route is valid and has at least one point
        if (log.route && Array.isArray(log.route) && log.route.length > 0) {
          
          // FIX 1: Call the helper function to add the marker to patrolStartLayer
          this.addStartMarker(log);

          // Draw the actual path line if there are multiple points
          if (log.route.length > 1) {
            this.drawPatrolRoute(log);
          }
        }
      });
    }
  });
}
// addStartMarker(log: any) {
//   const firstPoint = log.route[0];
//   const startIcon = L.divIcon({
//     className: 'patrol-start-marker',
//     // Use #3b82f6 to match your blue path theme
//     html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);"></div>`,
//     iconSize: [16, 16],
//     iconAnchor: [8, 8]
//   });

//   L.marker([firstPoint.lat, firstPoint.lng], { icon: startIcon })
//     .addTo(this.patrolStartLayer) // This is the layer linked to your "Patrol Starts" toggle
//     .bindPopup(`
//       <div style="font-family: sans-serif;">
//         <b style="color: #3b82f6;">Patrol Started</b><br>
//         Name: ${log.patrolName}<br>
//         <small>ID: ${log.id}</small>
//       </div>
//     `);
// }


addStartMarker(log: any) {
  const firstPoint = log.route[0];
  
  // Create a DivIcon containing the emoji 📍
  const pinIcon = L.divIcon({
    className: 'custom-pin-marker',
    html: `<div style="font-size: 24px; line-height: 1;">📍</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30] // This ensures the tip of the pin points to the exact coordinate
  });

  L.marker([firstPoint.lat, firstPoint.lng], { icon: pinIcon })
    .addTo(this.patrolStartLayer)
    .bindPopup(`
      <div style="font-family: sans-serif;">
        <b style="color: #3b82f6;">Patrol Started</b><br>
        Name: ${log.patrolName}<br>
        <small>ID: ${log.id}</small>
      </div>
    `);
}

  drawPatrolRoute(log: any) {
    const pathCoordinates = log.route.map((point: any) => [point.lat, point.lng]);
    const polyline = L.polyline(pathCoordinates, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10',
      lineJoin: 'round'
    }).addTo(this.patrolLayer); // ADD TO LAYER

    polyline.bindPopup(`
      <div style="font-family: sans-serif; padding: 5px;">
        <strong style="color: #3b82f6;">${log.patrolName}</strong><br>
        <b>Distance:</b> ${log.distanceKm} km<br>
        <small>${new Date(log.startTime).toLocaleString()}</small>
      </div>
    `);
  }

  loadAttendanceMarkers() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (attendances) => {
        attendances.forEach(record => {
            if (record.latitude && record.longitude) {
                this.addAttendanceMarker(record);
            }
        });
      },
      error: (err) => console.error(err)
    });
  }

  addAttendanceMarker(record: any) {
    const attendanceIcon = L.divIcon({
      className: 'attendance-marker',
      html: `<div style="background-color: #10b981; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    L.marker([record.latitude, record.longitude], { icon: attendanceIcon })
      .addTo(this.attendanceLayer) // ADD TO LAYER
      .bindPopup(`
        <div style="font-family: sans-serif; padding: 5px;">
          <strong style="color: #0d9488;">${record.rangerName || 'Ranger'}</strong><br>
          <span style="font-size: 10px; color: #64748b;">${new Date(record.created_at).toLocaleString()}</span>
        </div>
      `);
  }

  loadOnsiteMarkers() {
    this.http.get<any[]>(this.onsiteApiUrl).subscribe({
      next: (records) => {
        records.forEach(record => {
          if (record.latitude && record.longitude) {
            this.addOnsiteMarker(record);
          }
        });
      }
    });
  }

  addOnsiteMarker(record: any) {
    const onsiteIcon = L.divIcon({
      className: 'onsite-marker',
      html: `<div style="background-color: #8b5cf6; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(139, 92, 246, 0.6);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([record.latitude, record.longitude], { icon: onsiteIcon })
      .addTo(this.onsiteLayer) // ADD TO LAYER
      .bindPopup(`<b>Onsite: ${record.ranger || 'Ranger'}</b><br><small>${new Date(record.created_at).toLocaleString()}</small>`);
  }

  loadIncidentMarkers() {
    this.http.get<any[]>(this.incidentApiUrl).subscribe({
      next: (incidents) => {
        incidents.forEach(incident => {
          if (incident.latitude && incident.longitude) {
            this.addIncidentMarker(incident);
          }
        });
      }
    });
  }

  addIncidentMarker(incident: any) {
    const incidentIcon = L.divIcon({
      className: 'incident-marker',
      html: `
        <div style="background-color: #ef4444; width: 18px; height: 18px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(239, 68, 68, 0.9); animation: pulse 1.5s infinite;"></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { transform: scale(1.2); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        </style>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([incident.latitude, incident.longitude], { icon: incidentIcon })
      .addTo(this.incidentLayer) // ADD TO LAYER
      .bindPopup(`🚨 <b>${incident.incidentCriteria || 'Incident'}</b><br>Priority: ${incident.responsePriority}`);
  }

  goBack() {
    this.navCtrl.back();
  }

  async refreshLocation() {
    this.isMapLoading = true;
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      this.lat = coordinates.coords.latitude.toFixed(6);
      this.lng = coordinates.coords.longitude.toFixed(6);
      if (this.map) {
        this.map.setView([this.lat, this.lng], 15);
        this.marker.setLatLng([this.lat, this.lng]);
      }
    } catch (error) {
      console.error('Error refreshing location', error);
    } finally {
      this.isMapLoading = false;
    }
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }
}