import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../../../data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-add-plantation',
  templateUrl: './add-plantation.page.html',
  styleUrls: ['./add-plantation.page.scss'],
  standalone: false
})
export class AddPlantationPage implements OnInit, AfterViewInit, OnDestroy {
  currentStep: number = 1;
  totalSteps: number = 4;
  
  map!: L.Map;
  marker!: L.Marker;
  
  formData: any = {
    siteName: '',
    totalArea: 0,
    soilType: '',
    species: '',
    plant_count: 0,
    latitude: 21.840000,
    longitude: 84.030000
  };

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    console.log("AddPlantationPage initialized");
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 500);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap() {
    const lat = this.formData.latitude || 21.840000;
    const lng = this.formData.longitude || 84.030000;

    this.map = L.map('plantation-map', {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], {
      draggable: true,
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(this.map);

    this.marker.on('dragend', () => {
      const position = this.marker.getLatLng();
      this.formData.latitude = position.lat;
      this.formData.longitude = position.lng;
    });

    this.map.on('click', (e: any) => {
      const position = e.latlng;
      this.marker.setLatLng(position);
      this.formData.latitude = position.lat;
      this.formData.longitude = position.lng;
    });
  }

  useCurrentLocation() {
    console.log("Fetching current location...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.formData.latitude = lat;
        this.formData.longitude = lng;
        
        if (this.map && this.marker) {
          this.map.setView([lat, lng], 17);
          this.marker.setLatLng([lat, lng]);
        }
      }, (error) => {
        console.error("Error getting location", error);
      });
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.navCtrl.back();
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else {
      this.submitForm();
    }
  }

  async submitForm() {
    console.log("Submitting form:", this.formData);
    
    const loader = await this.loadingCtrl.create({
      message: 'Creating plantation...',
      spinner: 'crescent'
    });
    await loader.present();

    this.dataService.addPlantation(this.formData).subscribe({
      next: async (res: any) => {
        loader.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Plantation added successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        toast.present();
        this.navCtrl.back();
      },
      error: async (err) => {
        loader.dismiss();
        console.error("Error creating plantation", err);
        const toast = await this.toastCtrl.create({
          message: 'Error creating plantation. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    });
  }
}
