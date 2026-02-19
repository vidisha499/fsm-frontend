import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController, GestureController, DomController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-patrol-logs',
  templateUrl: './patrol-logs.page.html',
  styleUrls: ['./patrol-logs.page.scss'],
  standalone: false
})
export class PatrolLogsPage implements OnInit {
  @ViewChild('sliderKnob', { read: ElementRef }) sliderKnob!: ElementRef;
  @ViewChild('sliderTrack', { read: ElementRef }) sliderTrack!: ElementRef;

  public patrolLogs: any[] = [];
  public isModalOpen = false;
  public selectedMethod = '';
  public selectedType = '';
  public isDetailModalOpen = false;
  public selectedPatrol: any = null;
  public isSubmitting = false;
  public mapLoading = true;
  private detailMap: any;

  // Verified API URL from your deployment
  private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef,
    private gestureCtrl: GestureController,
    private domCtrl: DomController
  ) {}

  ngOnInit() { }
  
  ionViewWillEnter() { 
    this.loadPatrolLogs(); 
    this.isSubmitting = false; 
  }

  // --- GESTURE LOGIC ---
  setupSwipeGesture() {
    if (!this.sliderKnob || !this.sliderTrack) return;

    const knob = this.sliderKnob.nativeElement;
    const track = this.sliderTrack.nativeElement;

    const gesture = this.gestureCtrl.create({
      el: knob,
      threshold: 0,
      gestureName: 'swipe-to-start',
      onMove: ev => {
        if (this.isSubmitting) return;
        
        const maxDelta = track.clientWidth - knob.clientWidth - 10; 
        let deltaX = ev.deltaX;

        if (deltaX < 0) deltaX = 0;
        if (deltaX > maxDelta) deltaX = maxDelta;

        this.domCtrl.write(() => {
          knob.style.transform = `translateX(${deltaX}px)`;
        });
      },
      onEnd: ev => {
        if (this.isSubmitting) return;

        const maxDelta = track.clientWidth - knob.clientWidth - 10;

        if (ev.deltaX > maxDelta * 0.8) {
          this.domCtrl.write(() => {
            knob.style.transition = '0.3s ease-out';
            knob.style.transform = `translateX(${maxDelta}px)`;
            this.savePatrol(); 
          });
        } else {
          this.domCtrl.write(() => {
            knob.style.transition = '0.3s ease-out';
            knob.style.transform = `translateX(0px)`;
          });
        }
        
        setTimeout(() => { knob.style.transition = 'none'; }, 300);
      }
    });

    gesture.enable(true);
  }

  // --- DATA OPERATIONS ---

  async loadPatrolLogs() {
    const loader = await this.loadingCtrl.create({ message: 'Loading logs...', mode: 'ios' });
    await loader.present();
    this.http.get(`${this.apiUrl}/logs`).subscribe({
      next: (data: any) => { 
        this.patrolLogs = data; 
        loader.dismiss(); 
      },
      error: () => { 
        loader.dismiss(); 
        this.presentToast('Failed to load logs', 'danger'); 
      }
    });
  }

//  async savePatrol() {
//   if (!this.selectedMethod || !this.selectedType) {
//     this.presentToast('Please select Method and Type', 'warning');
//     this.resetKnob();
//     return;
//   }
//   this.isSubmitting = true; 
  
//   const loader = await this.loadingCtrl.create({ message: 'Starting Patrol Session...', mode: 'ios' });
//   await loader.present();

//   // Change endpoint from '/start' to '/active' to match your controller/service logic
//   // this.http.post(`${this.apiUrl}/active`, { rangerId: 1 }).subscribe({
//   //   next: (res: any) => {
//   //     loader.dismiss();
      
//   //     // Store the active patrol ID for persistence
//   //     localStorage.setItem('active_patrol_id', res.id.toString());
//   //     localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
      
//   //     this.isModalOpen = false;
//   //     this.navCtrl.navigateForward('/home/patrol-active');
//   //   },
//   //   error: (err) => {
//   //     loader.dismiss();
//   //     this.isSubmitting = false;
//   //     this.resetKnob();
//   //     console.error('Database Error:', err);
//   //     this.presentToast('Failed to start patrol in database', 'danger');
//   //   }
//   // });

//   this.http.post(`${this.apiUrl}/start`, { rangerId: 1 }).subscribe({
//     next: (res: any) => {
//       loader.dismiss();
//       localStorage.setItem('active_patrol_id', res.id.toString());
//       this.isModalOpen = false;
//       this.navCtrl.navigateForward('/home/patrol-active');
//     },
//     error: (err) => {
//       loader.dismiss();
//       this.isSubmitting = false;
//       this.resetKnob();
//       console.error('Database Error:', err);
//       this.presentToast('Failed to start patrol', 'danger');
//     }
//   });
// }

async savePatrol() {
  if (!this.selectedMethod || !this.selectedType) {
    this.presentToast('Please select Method and Type', 'warning');
    this.resetKnob();
    return;
  }

  // ✅ 1. Get the logged-in user from localStorage
  const storedUser = localStorage.getItem('user'); 
  if (!storedUser) {
    this.presentToast('User session not found. Please login again.', 'danger');
    this.navCtrl.navigateRoot('/login');
    return;
  }

  // ✅ 2. Parse the string into an object and get the ID
  const user = JSON.parse(storedUser);
  const dynamicRangerId = user.id; 

  this.isSubmitting = true; 
  const loader = await this.loadingCtrl.create({ 
    message: 'Starting Patrol Session...', 
    mode: 'ios' 
  });
  await loader.present();

  // ✅ 3. Use the dynamic ID in the payload
  const payload = { 
    rangerId: dynamicRangerId,
    method: this.selectedMethod,
    type: this.selectedType 
  };

  // Note: Ensure your backend controller matches this endpoint (/active vs /start)
  this.http.post(`${this.apiUrl}/active`, payload).subscribe({
    next: (res: any) => {
      loader.dismiss();
      
      // Store the active patrol ID for the next screen
      localStorage.setItem('active_patrol_id', res.id.toString());
      localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
      
      this.isModalOpen = false;
      this.navCtrl.navigateForward('/home/patrol-active');
    },
    error: (err) => {
      loader.dismiss();
      this.isSubmitting = false;
      this.resetKnob();
      console.error('Database Error:', err);
      this.presentToast('Failed to start patrol', 'danger');
    }
  });
}

  private async processDelete(id: number) {
    this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
      next: () => {
        this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
        this.presentToast('Log deleted', 'success');
      },
      error: () => this.presentToast('Delete failed', 'danger')
    });
  }

  // --- TEMPLATE HELPERS (Fixes TS2339 Error) ---

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return 'fas fa-paw';
    if (cat.includes('water')) return 'fas fa-tint';
    if (cat.includes('impact')) return 'fas fa-exclamation-triangle';
    if (cat.includes('death')) return 'fas fa-skull';
    if (cat.includes('felling')) return 'fas fa-tree';
    return 'fas fa-eye';
  }

  // --- MODAL & UI CONTROL ---

  setOpen(isOpen: boolean) { 
    this.isModalOpen = isOpen; 
    if (isOpen) {
      setTimeout(() => this.setupSwipeGesture(), 150);
    } else {
      this.isSubmitting = false;
    }
  }

  // viewDetails(log: any) {
  //   this.selectedPatrol = log;
  //   this.isDetailModalOpen = true;
  //   this.mapLoading = true;
  //   this.cdr.detectChanges();
  // }


  // Replace your existing viewDetails method
viewDetails(log: any) {
  // Navigate to the new page and pass the ID as a parameter
  this.navCtrl.navigateForward(['/home/patrol-details'], {
    queryParams: { id: log.id }
  });
}

  onDetailModalPresent() {
    setTimeout(() => {
      this.initDetailMap();
    }, 800); 
  }

  initDetailMap() {
    const mapElement = document.getElementById('detailMap');
    if (!mapElement) return;

    if (this.detailMap) { 
      this.detailMap.remove(); 
      this.detailMap = null;
    }

    let coords: L.LatLngTuple[] = [];
    if (this.selectedPatrol?.route && this.selectedPatrol.route.length > 0) {
      coords = this.selectedPatrol.route.map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
    }

    const center = coords.length > 0 ? coords[0] : [0, 0] as L.LatLngTuple;

    this.detailMap = L.map(mapElement, { 
      zoomControl: false,
      attributionControl: false
    }).setView(center, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.detailMap);

    if (coords.length > 1) {
      const polyline = L.polyline(coords, { color: '#059669', weight: 6, opacity: 0.8 }).addTo(this.detailMap);
      this.detailMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      
      L.circleMarker(coords[0], { color: '#3b82f6', radius: 5, fillOpacity: 1 }).addTo(this.detailMap);
      L.circleMarker(coords[coords.length - 1], { color: '#ef4444', radius: 5, fillOpacity: 1 }).addTo(this.detailMap);
    }

    this.mapLoading = false;
    
    setTimeout(() => { 
      if(this.detailMap) this.detailMap.invalidateSize(); 
      this.cdr.detectChanges();
    }, 200);
  }

  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: 'Are you sure you want to delete this log?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => { this.processDelete(id); } }
      ]
    });
    await alert.present();
  }

  private resetKnob() {
    if (this.sliderKnob) {
      this.domCtrl.write(() => {
        this.sliderKnob.nativeElement.style.transition = '0.3s ease-out';
        this.sliderKnob.nativeElement.style.transform = `translateX(0px)`;
      });
    }
    this.isSubmitting = false;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
    await toast.present();
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }
}