import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { NavController } from '@ionic/angular';
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

  constructor(private dataService: DataService, private navCtrl: NavController) { }

  ngOnInit() {
    this.attendance = this.dataService.getSelectedAttendance();
    if (!this.attendance) {
      this.navCtrl.navigateBack('/attendance-list');
    }
  }

  ngAfterViewInit() {
    if (this.attendance) {
      setTimeout(() => { this.initMap(); }, 500);
    }
  }

  initMap() {
    const lat = this.attendance.latitude;
    const lng = this.attendance.longitude;

    this.map = L.map('detailMap', { center: [lat, lng], zoom: 16, zoomControl: false });
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    const icon = L.divIcon({ className: 'custom-marker', html: '<div class="blue-dot"></div>', iconSize: [20, 20] });
    L.marker([lat, lng], { icon }).addTo(this.map);
  }

  goBack() { this.navCtrl.back(); }

  ngOnDestroy() { if (this.map) this.map.remove(); }
}