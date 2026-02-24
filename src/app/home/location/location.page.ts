// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { NavController } from '@ionic/angular';
// import { Geolocation } from '@capacitor/geolocation';
// import { TranslateService } from '@ngx-translate/core';
// import { HttpClient } from '@angular/common/http'; // Import this
// import * as L from 'leaflet';
// import { environment } from 'src/environments/environment';

// @Component({
//   selector: 'app-location',
//   templateUrl: './location.page.html',
//   styleUrls: ['./location.page.scss'],
//   standalone: false
// })
// export class LocationPage implements OnInit, OnDestroy {
//   // Define Layer Groups
// private attendanceLayer = L.featureGroup();
// private onsiteLayer = L.featureGroup();
// private patrolLayer = L.featureGroup();
// private incidentLayer = L.featureGroup();
// private sightingsLayer = L.featureGroup();
//   map: any;
//   marker: any;
//   lat: any;
//   lng: any;
//   isMapLoading: boolean = true;
  
//   // Use your actual backend URL here
//   private apiUrl: string = `${environment.apiUrl}/attendance`; 
//   private onsiteApiUrl: string = `${environment.apiUrl}/onsite-attendance`;
//   private patrolApiUrl: string = `${environment.apiUrl}/patrols/logs`;
//   private incidentApiUrl: string = `${environment.apiUrl}/incidents`;


//   constructor(
//     private navCtrl: NavController,
//     private translate: TranslateService,
//     private http: HttpClient // Inject HttpClient
//   ) {}

//   ngOnInit() {
//     setTimeout(() => {
//       this.initMap();
//     }, 800); 
//   }

//   async initMap() {
//     try {
//       const coordinates = await Geolocation.getCurrentPosition();
//       this.lat = coordinates.coords.latitude.toFixed(6);
//       this.lng = coordinates.coords.longitude.toFixed(6);

//       this.map = L.map('map', { 
//         zoomControl: false,
//         attributionControl: false 
//       }).setView([this.lat, this.lng], 12); // Slightly zoomed out to see others

//       L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
//         maxZoom: 20,
//         subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
//       }).addTo(this.map);
      
      
//       // 1. Current User Marker (Blue Dot)
//       const customIcon = L.divIcon({
//         className: 'current-loc-icon',
//         html: `<div style="background-color: #4285F4; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
//         iconSize: [20, 20],
//         iconAnchor: [10, 10]
//       });
//       this.marker = L.marker([this.lat, this.lng], { icon: customIcon }).addTo(this.map);

//       // 2. Load all other attendance markers
//       this.loadAttendanceMarkers(); // The green ones
//       this.loadOnsiteMarkers(); 
//       this.loadPatrolPaths(); 
//       this.loadSightingMarkers(); 
//       this.loadIncidentMarkers();  // The new ones
  
//   this.isMapLoading = false;

//       this.isMapLoading = false;
//     } catch (error) {
//       console.error('Error getting location', error);
//       this.isMapLoading = false;
//     }
//   }


// loadSightingMarkers() {
//   this.http.get<any[]>(this.patrolApiUrl).subscribe({
//     next: (logs) => {
//       logs.forEach(log => {
//         // Change observationData to obsDetails to match your service code
//         const sightings = log.obsDetails || log.observationData; 
//         if (sightings && Array.isArray(sightings)) {
//           sightings.forEach((sighting: any) => {
//             // Check if coordinates exist before adding
//             if (sighting.lat && sighting.lng) {
//               this.addSightingMarker(sighting);
//             }
//           });
//         }
//       });
//     }
//   });
// }

// addSightingMarker(sighting: any) {
//   // Use a Red/Yellow icon to represent a "Sighting" or "Observation"
//   const sightingIcon = L.divIcon({
//     className: 'sighting-marker',
//     html: `<div style="background-color: #ef4444; width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);"></div>`,
//     iconSize: [14, 14],
//     iconAnchor: [7, 7]
//   });

//   const marker = L.marker([sighting.lat, sighting.lng], { icon: sightingIcon })
//     .addTo(this.map);

//   marker.bindPopup(`
//     <div style="font-family: sans-serif;">
//       <b style="color: #ef4444;">Observation: ${sighting.sighting_type || 'General'}</b><br>
//       Species: ${sighting.species || 'N/A'}<br>
//       <small>Count: ${sighting.count || 1}</small>
//     </div>
//   `);
// }

// loadPatrolPaths() {
//   // Fetching from your working /api/patrols/logs endpoint
//   this.http.get<any[]>(this.patrolApiUrl).subscribe({
//     next: (logs) => {
//       logs.forEach(log => {
//         // Only draw if there are at least two points to make a line
//         if (log.route && Array.isArray(log.route) && log.route.length > 1) {
//           this.drawPatrolRoute(log);
//         }
//       });
//     },
//     error: (err) => console.error('Patrol Load Error:', err)
//   });
// }

// drawPatrolRoute(log: any) {
//   // Convert your [{lat, lng}] array from the DB to Leaflet's [[lat, lng]] format
//   const pathCoordinates = log.route.map((point: any) => [point.lat, point.lng]);

//   // Create a dashed blue line for the patrol path
//   const polyline = L.polyline(pathCoordinates, {
//     color: '#3b82f6',
//     weight: 4,
//     opacity: 0.8,
//     dashArray: '10, 10', // Creates the dashed effect
//     lineJoin: 'round'
//   }).addTo(this.map);

//   // Add a popup with patrol details from your entity
//   polyline.bindPopup(`
//     <div style="font-family: sans-serif; padding: 5px;">
//       <strong style="color: #3b82f6;">${log.patrolName}</strong><br>
//       <b>Distance:</b> ${log.distanceKm} km<br>
//       <b>Status:</b> ${log.status}<br>
//       <small>${new Date(log.startTime).toLocaleString()}</small>
//     </div>
//   `);
// }
 

// addOnsiteMarker(record: any) {
//   // Use a Purple color for Onsite Attendance
//   const onsiteIcon = L.divIcon({
//     className: 'onsite-marker',
//     html: `<div style="background-color: #8b5cf6; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(139, 92, 246, 0.6);"></div>`,
//     iconSize: [18, 18],
//     iconAnchor: [9, 9]
//   });

//   const marker = L.marker([record.latitude, record.longitude], { icon: onsiteIcon })
//     .addTo(this.map);

//   marker.bindPopup(`
//     <div style="font-family: sans-serif;">
//       <b style="color: #8b5cf6;">Onsite: ${record.ranger || 'Ranger'}</b><br>
//       <small>Type: ${record.attendance_type || 'N/A'}</small><br>
//       <span style="font-size: 10px; color: #64748b;">${new Date(record.created_at).toLocaleString()}</span>
//     </div>
//   `);
// }

// loadAttendanceMarkers() {
//   // Uses the regular attendance URL
//   this.http.get<any[]>(this.apiUrl).subscribe({
//     next: (attendances) => {
//       // ... logic for green markers
//     },
//     error: (err) => console.error(err)
//   });
// }

// loadOnsiteMarkers() {
//   // FIX: Changed from this.apiUrl to this.onsiteApiUrl
//   console.log('Fetching Onsite from:', this.onsiteApiUrl); 
  
//   this.http.get<any[]>(this.onsiteApiUrl).subscribe({
//     next: (records) => {
//       console.log('Onsite Markers found:', records.length);
//       records.forEach(record => {
//         if (record.latitude && record.longitude) {
//           this.addOnsiteMarker(record);
//         }
//       });
//     },
//     error: (err) => console.error('Onsite API Error:', err)
//   });
// }

//   addAttendanceMarker(record: any) {
//     // Green marker for attendance
//     const attendanceIcon = L.divIcon({
//       className: 'attendance-marker',
//       html: `<div style="background-color: #10b981; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);"></div>`,
//       iconSize: [16, 16],
//       iconAnchor: [8, 8]
//     });

//     const marker = L.marker([record.latitude, record.longitude], { icon: attendanceIcon })
//       .addTo(this.map);

//     // Add a popup with Ranger Name and Time
//     marker.bindPopup(`
//       <div style="font-family: sans-serif; padding: 5px;">
//         <strong style="color: #0d9488;">${record.rangerName || 'Ranger'}</strong><br>
//         <small>${record.region || ''}</small><br>
//         <span style="font-size: 10px; color: #64748b;">${new Date(record.created_at).toLocaleString()}</span>
//       </div>
//     `);
//   }

//   // ... rest of your goBack, refreshLocation, and ngOnDestroy methods

  
//   goBack() {
//     this.navCtrl.back();
//   }

//   async refreshLocation() {
//     this.isMapLoading = true;
//     try {
//       const coordinates = await Geolocation.getCurrentPosition();
//       this.lat = coordinates.coords.latitude.toFixed(6);
//       this.lng = coordinates.coords.longitude.toFixed(6);
      
//       if (this.map) {
//         this.map.setView([this.lat, this.lng], 15);
//         this.marker.setLatLng([this.lat, this.lng]);
//       }
//     } catch (error) {
//       console.error('Error refreshing location', error);
//     } finally {
//       this.isMapLoading = false;
//     }
//   }

//   ngOnDestroy() {
//     if (this.map) this.map.remove();
//   }


//   loadIncidentMarkers() {
//   this.http.get<any[]>(this.incidentApiUrl).subscribe({
//     next: (incidents) => {
//       incidents.forEach(incident => {
//         if (incident.latitude && incident.longitude) {
//           this.addIncidentMarker(incident);
//         }
//       });
//     },
//     error: (err) => console.error('Incident Load Error:', err)
//   });
// }

// addIncidentMarker(incident: any) {
//   // Create a pulsing red marker for incidents
//   const incidentIcon = L.divIcon({
//     className: 'incident-marker',
//     html: `
//       <div style="
//         background-color: #ef4444; 
//         width: 18px; 
//         height: 18px; 
//         border: 3px solid white; 
//         border-radius: 50%; 
//         box-shadow: 0 0 15px rgba(239, 68, 68, 0.9);
//         animation: pulse 1.5s infinite;
//       "></div>
//       <style>
//         @keyframes pulse {
//           0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
//           70% { transform: scale(1.2); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
//           100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
//         }
//       </style>
//     `,
//     iconSize: [24, 24],
//     iconAnchor: [12, 12]
//   });

//   const marker = L.marker([incident.latitude, incident.longitude], { icon: incidentIcon })
//     .addTo(this.map);

//   // Popup shows Incident type, Priority, and the Photo if available
//   marker.bindPopup(`
//     <div style="font-family: sans-serif; min-width: 150px;">
//       <strong style="color: #ef4444;">🚨 ${incident.incidentCriteria || 'Incident'}</strong><br>
//       <b>Priority:</b> ${incident.responsePriority || 'Normal'}<br>
//       <p style="font-size: 12px; margin: 5px 0;">${incident.fieldObservation || ''}</p>
//       ${incident.photo ? `<img src="${incident.photo}" style="width: 100%; border-radius: 4px; margin-top: 5px;"/>` : ''}
//       <small style="color: #64748b;">${new Date(incident.createdAt).toLocaleString()}</small>
//     </div>
//   `);
// }
// }


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

  private apiUrl: string = `${environment.apiUrl}/attendance`;
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

      // --- SETUP TOGGLE MENU ---
      const overlays = {
        "<span style='color: #10b981'>● Attendance</span>": this.attendanceLayer,
        "<span style='color: #8b5cf6'>● On-Site</span>": this.onsiteLayer,
        "<span style='color: #3b82f6'>━ Patrol Paths</span>": this.patrolLayer,
        "<span style='color: #ef4444'>● Sightings</span>": this.sightingsLayer,
        "<span style='color: #ef4444'>⚠️ Incidents</span>": this.incidentLayer
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
        logs.forEach(log => {
          const sightings = log.obsDetails || log.observationData;
          if (sightings && Array.isArray(sightings)) {
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
          if (log.route && Array.isArray(log.route) && log.route.length > 1) {
            this.drawPatrolRoute(log);
          }
        });
      }
    });
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