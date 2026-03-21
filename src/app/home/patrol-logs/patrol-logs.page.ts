import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController, GestureController, DomController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
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
  public isFilterModalOpen = false;
  public filterFrom: string = '';
  public filterTo: string = '';
  public maxDate: string = new Date().toISOString().split('T')[0];

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
    private domCtrl: DomController,
    private translate: TranslateService // Added for translation
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




  // async loadPatrolLogs(from?: string, to?: string) {
  //   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
  //   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
  //   await loader.present();

  //   let params = new Array();
  // if (from) params.push(`from=${from}`);
  // if (to) params.push(`to=${to}`);
  
  // const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  // const url = `${this.apiUrl}/logs${queryString}`;


  //    this.http.get(url).subscribe({
  //      next: (data: any) => { 
  //        this.patrolLogs = data; 
  //        loader.dismiss(); 
  //      },
      
  //      error: async () => { 
  //        loader.dismiss(); 
  //        const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
  //        this.presentToast(errMsg, 'danger'); 
  //      }

  //   });
  // }


//  async loadPatrolLogs(from?: string, to?: string) {
//   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
//   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
//   await loader.present();

//   // LocalStorage se IDs nikaalna
//   const storedRangerId = localStorage.getItem('ranger_id');
//   const storedCompanyId = localStorage.getItem('company_id');

//   let params = new Array();
//   if (from) params.push(`from=${from}`);
//   if (to) params.push(`to=${to}`);
  
//   // Ranger ID and Company ID ko query params mein add karein
//   if (storedRangerId) params.push(`rangerId=${storedRangerId}`);
//   if (storedCompanyId) params.push(`company_id=${storedCompanyId}`); // 👈 Admin view ke liye zaroori

//   const queryString = params.length > 0 ? `?${params.join('&')}` : '';
//   const url = `${this.apiUrl}/logs${queryString}`;

//   this.http.get(url).subscribe({
//     next: (data: any) => { 
//       this.patrolLogs = data; 
//       loader.dismiss(); 
//     },
//     error: async () => { 
//       loader.dismiss(); 
//       const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
//       this.presentToast(errMsg, 'danger'); 
//     }
//   });
// }

async loadPatrolLogs(from?: string, to?: string) {
  const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
  const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
  await loader.present();

  // 1. Get IDs from LocalStorage
  const storedRangerId = localStorage.getItem('ranger_id');
  const storedCompanyId = localStorage.getItem('company_id');
  const userRole = localStorage.getItem('user_role'); // Assuming you store role (e.g., 'ADMIN' or 'RANGER')

  let params: string[] = [];

  // 2. Date Filters
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  
  // 3. Role-Based Logic
  // If the user is a RANGER, we must send rangerId to filter their own logs.
  // If the user is an ADMIN, we ONLY send companyId to see everyone's logs.
  if (userRole === 'RANGER' && storedRangerId) {
    params.push(`rangerId=${storedRangerId}`);
  }
  
  // 4. Send companyId (Matched to Backend @Query('companyId'))
  if (storedCompanyId) {
    params.push(`companyId=${storedCompanyId}`); 
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  const url = `${this.apiUrl}/logs${queryString}`;

  this.http.get(url).subscribe({
    next: (data: any) => { 
      this.patrolLogs = data; 
      loader.dismiss(); 
      this.cdr.detectChanges();
    },
    error: async () => { 
      loader.dismiss(); 
      const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
      this.presentToast(errMsg, 'danger'); 
    }
  });
}

//   async savePatrol() {
//   if (!this.selectedMethod || !this.selectedType) {
//     const warnMsg = await firstValueFrom(this.translate.get('LIST.SELECT_PLACEHOLDER'));
//     this.presentToast(warnMsg, 'warning');
//     this.resetKnob();
//     return;
//   }

//   const storedRangerId = localStorage.getItem('ranger_id'); 
//   const storedCompanyId = localStorage.getItem('company_id'); // 👈 Fetch Company ID

//   if (!storedRangerId) {
//     this.presentToast('User session not found. Please login again.', 'danger');
//     this.navCtrl.navigateRoot('/login');
//     return;
//   }

//   this.isSubmitting = true; 
//   const startMsg = await firstValueFrom(this.translate.get('LIST.STARTING'));
//   const loader = await this.loadingCtrl.create({ message: startMsg, mode: 'ios' });
//   await loader.present();

//   const payload = { 
//     rangerId: parseInt(storedRangerId),
//     company_id: storedCompanyId ? parseInt(storedCompanyId) : null, // 👈 Payload mein add kiya
//     method: this.selectedMethod,
//     type: this.selectedType 
//   };

//   this.http.post(`${this.apiUrl}/active`, payload).subscribe({
//     next: (res: any) => {
//       loader.dismiss();
//       localStorage.setItem('active_patrol_id', res.id.toString());
//       localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
//       this.isModalOpen = false;
//       this.navCtrl.navigateForward('/patrol-active');
//     },
//     error: async (err) => {
//       loader.dismiss();
//       this.isSubmitting = false;
//       this.resetKnob();
//       const failMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
//       this.presentToast(failMsg, 'danger');
//     }
//   });
// }

async savePatrol() {
  if (!this.selectedMethod || !this.selectedType) {
    const warnMsg = await firstValueFrom(this.translate.get('LIST.SELECT_PLACEHOLDER'));
    this.presentToast(warnMsg, 'warning');
    this.resetKnob();
    return;
  }

  const storedRangerId = localStorage.getItem('ranger_id'); 
  const storedCompanyId = localStorage.getItem('company_id');

  if (!storedRangerId) {
    this.presentToast('User session not found. Please login again.', 'danger');
    this.navCtrl.navigateRoot('/login');
    return;
  }

  this.isSubmitting = true; 
  const startMsg = await firstValueFrom(this.translate.get('LIST.STARTING'));
  const loader = await this.loadingCtrl.create({ message: startMsg, mode: 'ios' });
  await loader.present();

  // FIX: Change 'company_id' to 'companyId' to match your NestJS Entity/DTO
  const payload = { 
    rangerId: parseInt(storedRangerId),
    // companyId: storedCompanyId ? parseInt(storedCompanyId) : null, 
    companyId: storedCompanyId ? parseInt(storedCompanyId) : null,
    method: this.selectedMethod,
    type: this.selectedType 
  };

  this.http.post(`${this.apiUrl}/active`, payload).subscribe({
    next: (res: any) => {
      loader.dismiss();
      // Store the active ID so we can update the route later
      localStorage.setItem('active_patrol_id', res.id.toString());
      localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
      
      this.isModalOpen = false;
      this.navCtrl.navigateForward('/patrol-active');
    },
    error: async (err) => {
      loader.dismiss();
      this.isSubmitting = false;
      this.resetKnob();
      const failMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
      this.presentToast(failMsg, 'danger');
    }
  });
}

  setFilterOpen(isOpen: boolean) {
    this.isFilterModalOpen = isOpen;
  }

applyFilter() {
  if (this.filterFrom && this.filterTo && this.filterFrom > this.filterTo) {
    this.presentToast("'From' date cannot be after 'To' date", 'warning');
    return;
  }
  this.isFilterModalOpen = false;
  this.loadPatrolLogs(this.filterFrom, this.filterTo);
}

  resetFilter() {
    this.filterFrom = '';
    this.filterTo = '';
    this.isFilterModalOpen = false;
    this.loadPatrolLogs();
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

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return 'fas fa-paw';
    if (cat.includes('water')) return 'fas fa-tint';
    if (cat.includes('impact')) return 'fas fa-exclamation-triangle';
    if (cat.includes('death')) return 'fas fa-skull';
    if (cat.includes('felling')) return 'fas fa-tree';
    return 'fas fa-eye';
  }

  setOpen(isOpen: boolean) { 
    this.isModalOpen = isOpen; 
    if (isOpen) {
      setTimeout(() => this.setupSwipeGesture(), 150);
    } else {
      this.isSubmitting = false;
    }
  }

  viewDetails(patrol: any) {
    const pId = patrol.id; 
    if (pId) {
      this.navCtrl.navigateForward(['/patrol-details', pId]); 
    } else {
      this.presentToast("Error: ID not found", "danger");
    }
  }

  async deleteLog(id: number, event: Event) {
    event.stopPropagation();
    const headerMsg = await firstValueFrom(this.translate.get('COMMON.DELETE_CONFIRM'));
    
    const alert = await this.alertCtrl.create({
      header: 'Delete Log',
      message: headerMsg,
      buttons: [
        { text: await firstValueFrom(this.translate.get('COMMON.CANCEL')), role: 'cancel' },
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