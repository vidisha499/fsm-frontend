

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http'; // 1. Added Import
import * as L from 'leaflet';

@Component({
  selector: 'app-patrol-active',
  templateUrl: './patrol-active.page.html',
  styleUrls: ['./patrol-active.page.scss'],
  standalone: false
})
export class PatrolActivePage implements OnInit, OnDestroy, AfterViewInit {
  map!: L.Map;
  marker!: L.Marker;
  timerDisplay: string = '00:00:00';
  seconds = 0;
  timerInterval: any;
  gpsWatchId: any; 
  patrolStartTime: string = ''; // 2. Added Property to store start time

  // 3. Injected HttpClient into the constructor
  constructor(
    private navCtrl: NavController, 
    private alertCtrl: AlertController,
    private http: HttpClient 
  ) { }

  ngOnInit() {
    // 4. Capture the exact ISO string when the patrol starts
    this.patrolStartTime = new Date().toISOString();
    this.startTimer();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.map) this.map.remove();
    this.stopTracking(); 
  }

  async initMap() {
    const coordinates = await Geolocation.getCurrentPosition();
    const lat = coordinates.coords.latitude;
    const lng = coordinates.coords.longitude;

    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 17,
      zoomControl: false
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Google Maps'
    }).addTo(this.map);

    const locationIcon = L.divIcon({
      className: 'my-location-icon',
      html: `
        <div class="blue-dot-wrapper">
          <div class="blue-dot-pulse"></div>
          <div class="blue-dot"></div>
        </div>`,
      iconSize: [20, 20]
    });

    this.marker = L.marker([lat, lng], { icon: locationIcon }).addTo(this.map);
    this.startTracking();
    setTimeout(() => { this.map.invalidateSize(); }, 500);
  }

  async startTracking() {
    this.gpsWatchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position) => {
        if (position) {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          this.marker.setLatLng([newLat, newLng]);
          this.map.panTo([newLat, newLng]);
        }
      }
    );
  }

  stopTracking() {
    if (this.gpsWatchId) {
      Geolocation.clearWatch({ id: this.gpsWatchId });
    }
  }

  recenterMap() {
    Geolocation.getCurrentPosition().then((pos) => {
      this.map.setView([pos.coords.latitude, pos.coords.longitude], 17, { animate: true });
    });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
      const h = Math.floor(this.seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((this.seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (this.seconds % 60).toString().padStart(2, '0');
      this.timerDisplay = `${h}:${m}:${s}`;
    }, 1000);
  }

  async endPatrol() {
    const rangerId = localStorage.getItem('ranger_id');
    const endTime = new Date().toISOString();

    const patrolData = {
      ranger_id: rangerId,
      patrol_name: 'Main Beat Patrol',
      start_time: this.patrolStartTime, 
      end_time: endTime
    };

    // 5. Logic to send data to your backend
    this.http.post('http://localhost:3000/api/patrols/end-patrol', patrolData)
      .subscribe({
        next: (res: any) => {
          console.log('Patrol Saved!');
          this.navCtrl.navigateRoot('/patrol-logs'); 
        },
        error: (err: any) => {
          console.error('Error ending patrol', err);
        }
      });
  }
}


