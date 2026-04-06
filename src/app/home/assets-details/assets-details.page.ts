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
    this.asset = this.dataService.getSelectedAsset(); 
  }

  ngAfterViewInit() {
    if (this.asset && this.asset.latitude && this.asset.longitude) {
      setTimeout(() => {
        this.initDynamicMap();
      }, 600); // UI Render delay
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
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
  const lat = parseFloat(this.asset.latitude);
  const lng = parseFloat(this.asset.longitude);

  // Purana map instance clear karein
  if (this.map) {
    this.map.remove();
  }

  // ID match honi chahiye HTML se
  this.map = L.map('assetDetailMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 15);

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(this.map);

  L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'custom-pin',
      html: `<span style="font-size: 30px;">📍</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    })
  }).addTo(this.map);

  // Sabse zaroori: Map size refresh
  setTimeout(() => {
    this.map.invalidateSize();
  }, 300);
}
}