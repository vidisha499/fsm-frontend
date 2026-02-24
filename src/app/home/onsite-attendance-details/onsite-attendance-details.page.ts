import { Component, OnInit, AfterViewInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as L from 'leaflet';

@Component({
  selector: 'app-onsite-attendance-details',
  templateUrl: './onsite-attendance-details.page.html',
  styleUrls: ['./onsite-attendance-details.page.scss'],
  standalone: false 
})
export class OnsiteAttendanceDetailsPage implements OnInit {
  private map!: L.Map;
  public attendanceData: any;
  private apiUrl = `${environment.apiUrl}/onsite-attendance`;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private http: HttpClient
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
  this.http.get(`${this.apiUrl}/${id}`).subscribe({
    next: (data: any) => {
      this.attendanceData = data;
      
      // If the data arrives AFTER the page has finished entering, 
      // we trigger the map here manually.
      if (data && data.latitude) {
        setTimeout(() => {
          this.initMap(data.latitude, data.longitude);
        }, 100);
      }
    },
    error: (err) => console.error('Error loading details', err)
  });
}

initMap(lat: number, lng: number) {
  if (this.map) { this.map.remove(); }

  this.map = L.map('attendanceMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 16); // Standard street zoom level

  // STANDARD STREET VIEW
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

  setTimeout(() => {
    this.map.invalidateSize();
  }, 300);

  const markerIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style='background-color:#0d9488; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px rgba(0,0,0,0.3);'></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  L.marker([lat, lng], { icon: markerIcon }).addTo(this.map);
}

  goBack() { this.navCtrl.back(); }
}