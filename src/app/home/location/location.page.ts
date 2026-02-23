import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';

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

  constructor(
    private navCtrl: NavController,
    private translate: TranslateService
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
      }).setView([this.lat, this.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      
      this.marker = L.marker([this.lat, this.lng]).addTo(this.map);
      this.isMapLoading = false;
    } catch (error) {
      console.error('Error getting location', error);
      this.isMapLoading = false;
    }
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