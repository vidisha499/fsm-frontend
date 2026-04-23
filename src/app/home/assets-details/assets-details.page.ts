import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DataService } from '../../data.service'; 
import * as L from 'leaflet';

@Component({
  selector: 'app-asset-details',
  templateUrl: './assets-details.page.html',
  styleUrls: ['./assets-details.page.scss'],
  standalone: false
})
export class AssetDetailsPage implements OnInit, AfterViewInit, OnDestroy {
  asset: any;
  private map: any;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    // 1. Try to get data from Navigation State first (passed from drill-down lists)
    const navigation = (window as any).history.state;
    if (navigation && navigation.data) {
      this.asset = navigation.data;
    } else {
      // 2. Fallback to DataService
      this.asset = this.dataService.getSelectedAsset(); 
    }
    
    // 🔥 ROBUST LOCATION PARSING
    if (this.asset && this.asset.location) {
      try {
        const loc = typeof this.asset.location === 'string' 
          ? JSON.parse(this.asset.location) 
          : this.asset.location;
          
        if (loc.lat) this.asset.latitude = loc.lat;
        if (loc.lng) this.asset.longitude = loc.lng;
      } catch (e) {
        console.warn('Failed to parse asset location string:', e);
      }
    }

    // Fallback mapping for various API formats
    if (this.asset) {
      this.asset.latitude = this.asset.latitude || this.asset.lat;
      this.asset.longitude = this.asset.longitude || this.asset.lng;
    }
  }

  ngAfterViewInit() {
    // Moved initialization to ionViewDidEnter for better Ionic compatibility
  }

  ngOnDestroy() {
    if (this.map) {
      try {
        this.map.remove();
        this.map = null;
      } catch (e) {
        console.warn("Destroy Map Error:", e);
      }
    }
  }

  
  getIcon(category: string) {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('office')) return 'business-outline';
    if (cat.includes('nursery')) return 'leaf-outline';
    if (cat.includes('plantation')) return 'flower-outline';
    return 'cube-outline';
  }

  goBack() {
    this.navCtrl.back();
  }

  // ionViewDidEnter use karein ngOnInit ki jagah map ke liye
ionViewDidEnter() {
  if (this.asset && this.asset.latitude) {
    // Thoda zyada delay dein taaki transition smooth ho
    setTimeout(() => {
      this.initDynamicMap();
    }, 500); 
  }
}

initDynamicMap() {
  if (!this.asset || !this.asset.latitude || !this.asset.longitude) return;

  const lat = parseFloat(this.asset.latitude);
  const lng = parseFloat(this.asset.longitude);

  const mapContainer = document.getElementById('assetDetailMap');
  if (!mapContainer) return;

  // 1. Properly remove existing map instance first
  if (this.map) {
    try {
      this.map.remove();
      this.map = null;
    } catch (e) {
      console.warn("Error removing existing map:", e);
    }
  }

  // 2. Ensure container is clean
  if ((mapContainer as any)._leaflet_id) {
    delete (mapContainer as any)._leaflet_id;
  }

  // Fresh Initialize
  this.map = L.map('assetDetailMap', {
    zoomControl: false,
    attributionControl: false,
    fadeAnimation: true
  }).setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OSM'
  }).addTo(this.map);

  L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'custom-pin',
      html: `<span style="font-size: 30px; filter: drop-shadow(0 4px 5px rgba(0,0,0,0.3));">📍</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    })
  }).addTo(this.map);

  // Sabse zaroori: Map size refresh (Multiple passes for safety)
  setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);
  setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 800);
}
}