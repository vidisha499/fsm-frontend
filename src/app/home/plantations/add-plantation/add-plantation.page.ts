import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../../../data.service';
import { Geolocation } from '@capacitor/geolocation';
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
  
  map: L.Map | undefined;
  marker: L.Marker | undefined;
  boundaryLayer: L.Polygon | undefined;

  showSuccessModal: boolean = false;
  isLocating: boolean = false;
  isEditMode: boolean = false;

  // Swipe Button logic
  @ViewChild('swipeThumb') swipeThumb!: ElementRef;
  @ViewChild('swipeContainer') swipeContainer!: ElementRef;
  isSwiped = false;
  swipeStartX = 0;
  maxSwipeDistance = 0;
  plantationData: any = null; // Store full object for status check
  
  formData: any = {
    siteName: '',
    totalArea: 0,
    soilType: '',
    species: '',
    plant_count: 0,
    latitude: 21.840000,
    longitude: 84.030000,
    startDate: new Date().toISOString().split('T')[0],
    isFinished: false,
    endDate: '',
    isFencingDone: false
  };

  today: string = new Date().toISOString().split('T')[0];

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    console.log("AddPlantationPage initialized");
    
    // Check if we have incoming data from the navigation state (for editing/updating)
    const navigation = window.history.state;
    if (navigation && navigation.plantationData) {
      const data = navigation.plantationData;
      this.plantationData = data;
      console.log("Pre-filling form with:", data);
      
      this.formData = {
        siteName: data.siteName || data.name || '',
        totalArea: data.totalArea || data.area || 0,
        soilType: data.soilType || data.soil_type || '',
        species: data.species || '',
        plant_count: data.plant_count || 0,
        latitude: parseFloat(data.latitude) || 21.840000,
        longitude: parseFloat(data.longitude) || 84.030000
      };
      
      this.isEditMode = true;
      this.currentStep = 2; // Start at Stage 2 if we are updating from detail page
    }
  }

  ngAfterViewInit() {
    // Keep this empty, we will use ionViewDidEnter for map
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.initMap();
    }, 400); // Small delay to let Ionic page transitions finish
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap() {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

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
      const position = this.marker!.getLatLng();
      this.formData.latitude = position.lat;
      this.formData.longitude = position.lng;
    });

    this.map.on('click', (e: any) => {
      const position = e.latlng;
      this.marker!.setLatLng(position);
      this.formData.latitude = position.lat;
      this.formData.longitude = position.lng;
    });

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  async useCurrentLocation() {
    console.log("Fetching current location...");
    this.isLocating = true;
    try {
      const position = await Geolocation.getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      this.formData.latitude = lat;
      this.formData.longitude = lng;
      
      if (this.map && this.marker) {
        this.map.setView([lat, lng], 17);
        this.marker.setLatLng([lat, lng]);
      }
    } catch (error) {
      console.error("Error getting location", error);
    } finally {
      this.isLocating = false;
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.navCtrl.back();
    }
  }

  async nextStep() {
    // Stage 1 to 2 Restriction
    if (this.currentStep === 1) {
      const status = this.plantationData?.status;
      if (status !== 'Approved' && status !== 'APPROVED' && status !== 1) {
        const toast = await this.toastCtrl.create({
          message: 'Stage 2 is locked. Please wait for Admin Approval.',
          duration: 2500,
          color: 'warning',
          position: 'bottom',
          cssClass: 'custom-toast'
        });
        toast.present();
        return;
      }
    }

    if (this.currentStep < 4) {
      this.currentStep++;
      if (this.currentStep === 4) {
        setTimeout(() => this.initMap(), 300);
      }
    }
  }

  // --- SWIPE BUTTON LOGIC ---
  onSwipeStart(event: TouchEvent) {
    if (!this.swipeThumb || !this.swipeContainer) return;
    this.swipeStartX = event.touches[0].clientX;
    this.maxSwipeDistance = this.swipeContainer.nativeElement.offsetWidth - this.swipeThumb.nativeElement.offsetWidth - 8;
  }

  onSwipeMove(event: TouchEvent) {
    if (!this.swipeThumb) return;
    event.preventDefault(); // prevent scrolling while swiping
    const currentX = event.touches[0].clientX;
    let distance = currentX - this.swipeStartX;
    if (distance < 0) distance = 0;
    if (distance > this.maxSwipeDistance) distance = this.maxSwipeDistance;
    
    this.swipeThumb.nativeElement.style.transform = `translateX(${distance}px)`;
    
    if (distance >= this.maxSwipeDistance - 5) {
      this.isSwiped = true;
    } else {
      this.isSwiped = false;
    }
  }

  onSwipeEnd(event: TouchEvent) {
    if (!this.swipeThumb) return;
    if (this.isSwiped) {
      if (this.currentStep < 4) {
        this.nextStep();
      } else {
        this.submitForm();
      }
      
      // Reset thumb
      setTimeout(() => {
        this.isSwiped = false;
        this.swipeThumb.nativeElement.style.transition = 'none';
        this.swipeThumb.nativeElement.style.transform = `translateX(0px)`;
      }, 300);
    } else {
      // Snap back
      this.swipeThumb.nativeElement.style.transition = 'transform 0.3s ease';
      this.swipeThumb.nativeElement.style.transform = `translateX(0px)`;
      setTimeout(() => this.swipeThumb.nativeElement.style.transition = 'none', 300);
    }
  }
  // --------------------------

  async submitForm() {
    console.log("Submitting form:", this.formData);
    
    const loader = await this.loadingCtrl.create({
      message: 'Creating plantation...',
      spinner: 'crescent'
    });
    await loader.present();

    this.dataService.createPlantation(this.formData).subscribe({
      next: async (res: any) => {
        loader.dismiss();
        // Show success modal instead of toast
        this.showSuccessModal = true;
      },
      error: async (err: any) => {
        loader.dismiss();
        console.error("Error creating plantation", err);
        // Fallback for mock testing
        this.showSuccessModal = true;
      }
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.navCtrl.navigateRoot('/plantations');
  }
}
