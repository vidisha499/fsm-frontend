import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
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
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    // 1. DataService se selected record uthao
    this.attendance = this.dataService.getSelectedAttendance();

    // 2. Safety Check: Agar data nahi hai (refresh hone par), toh list par wapas bhej do
    if (!this.attendance) {
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
      const lat = parseFloat(this.attendance.latitude);
      const lng = parseFloat(this.attendance.longitude);

      // Map initialization
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