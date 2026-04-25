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
    const navigation = (window as any).history.state;
    if (navigation && navigation.data) {
      this.asset = navigation.data;
    } else {
      this.asset = this.dataService.getSelectedAsset();
    }

    if (this.asset) {
      console.log('📊 Raw asset from API:', JSON.stringify(this.asset));

      // Try to parse location JSON field
      if (this.asset.location) {
        try {
          const loc = typeof this.asset.location === 'string'
            ? JSON.parse(this.asset.location)
            : this.asset.location;
          if (loc.lat) this.asset.latitude = loc.lat;
          if (loc.lng) this.asset.longitude = loc.lng;
        } catch (e) {}
      }

      // Normalize all possible coordinate field names
      this.asset.latitude  = this.asset.latitude  || this.asset.lat  || null;
      this.asset.longitude = this.asset.longitude || this.asset.lng || null;

      // Validate — reject non-numeric values like 'Detecting...'
      const lat = parseFloat(this.asset.latitude);
      const lng = parseFloat(this.asset.longitude);
      this.asset.hasValidLocation = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      if (this.asset.hasValidLocation) {
        this.asset.latitude  = lat;
        this.asset.longitude = lng;
      }

      // Normalize condition from all possible field names
      this.asset.displayCondition =
        this.asset.condition ||
        this.asset.condition_status ||
        this.asset.status_name ||
        this.asset.status ||
        'Unknown';
      console.log('🏷️ Resolved condition:', this.asset.displayCondition);

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

  ionViewDidEnter() {
    if (this.asset?.hasValidLocation) {
      setTimeout(() => this.initDynamicMap(), 500);
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