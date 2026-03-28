// import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
// import { Router } from '@angular/router';
// import { NavController, ToastController, AlertController, LoadingController, GestureController, DomController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { TranslateService } from '@ngx-translate/core';
// import { firstValueFrom } from 'rxjs';
// import { forkJoin } from 'rxjs';
// import * as L from 'leaflet';

// @Component({
//   selector: 'app-patrol-logs',
//   templateUrl: './patrol-logs.page.html',
//   styleUrls: ['./patrol-logs.page.scss'],
//   standalone: false
// })
// export class PatrolLogsPage implements OnInit {
//   @ViewChild('sliderKnob', { read: ElementRef }) sliderKnob!: ElementRef;
//   @ViewChild('sliderTrack', { read: ElementRef }) sliderTrack!: ElementRef;

//   // public patrolLogs: any[] = [];
//   public patrolLogs: any[] = [];
//   public isModalOpen = false;
//   public selectedMethod = '';
//   public selectedType = '';
//   public isDetailModalOpen = false;
//   public selectedPatrol: any = null;
//   public isSubmitting = false;
//   public mapLoading = true;
//   private detailMap: any;
//   public isFilterModalOpen = false;
//   public filterFrom: string = '';
//   public filterTo: string = '';
//   public rangerName: string = '';
//   public maxDate: string = new Date().toISOString().split('T')[0];

//   private apiUrl: string = 'https://forest-backend-pi.vercel.app/api/patrols';

//   constructor(
//     private navCtrl: NavController,
//     private router: Router,
//     private http: HttpClient,
//     private toastCtrl: ToastController,
//     private alertCtrl: AlertController,
//     private loadingCtrl: LoadingController,
//     private cdr: ChangeDetectorRef,
//     private gestureCtrl: GestureController,
//     private domCtrl: DomController,
//     private translate: TranslateService // Added for translation
//   ) {}

//   ngOnInit() { }
  
//   ionViewWillEnter() { 
//     this.loadPatrolLogs(); 
//     this.isSubmitting = false; 
//   }

//   // --- GESTURE LOGIC ---
//   setupSwipeGesture() {
//     if (!this.sliderKnob || !this.sliderTrack) return;

//     const knob = this.sliderKnob.nativeElement;
//     const track = this.sliderTrack.nativeElement;

//     const gesture = this.gestureCtrl.create({
//       el: knob,
//       threshold: 0,
//       gestureName: 'swipe-to-start',
//       onMove: ev => {
//         if (this.isSubmitting) return;
//         const maxDelta = track.clientWidth - knob.clientWidth - 10; 
//         let deltaX = ev.deltaX;
//         if (deltaX < 0) deltaX = 0;
//         if (deltaX > maxDelta) deltaX = maxDelta;

//         this.domCtrl.write(() => {
//           knob.style.transform = `translateX(${deltaX}px)`;
//         });
//       },
//       onEnd: ev => {
//         if (this.isSubmitting) return;
//         const maxDelta = track.clientWidth - knob.clientWidth - 10;
//         if (ev.deltaX > maxDelta * 0.8) {
//           this.domCtrl.write(() => {
//             knob.style.transition = '0.3s ease-out';
//             knob.style.transform = `translateX(${maxDelta}px)`;
//             this.savePatrol(); 
//           });
//         } else {
//           this.domCtrl.write(() => {
//             knob.style.transition = '0.3s ease-out';
//             knob.style.transform = `translateX(0px)`;
//           });
//         }
//         setTimeout(() => { knob.style.transition = 'none'; }, 300);
//       }
//     });
//     gesture.enable(true);
//   }




//   // async loadPatrolLogs(from?: string, to?: string) {
//   //   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
//   //   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
//   //   await loader.present();

//   //   let params = new Array();
//   // if (from) params.push(`from=${from}`);
//   // if (to) params.push(`to=${to}`);
  
//   // const queryString = params.length > 0 ? `?${params.join('&')}` : '';
//   // const url = `${this.apiUrl}/logs${queryString}`;


//   //    this.http.get(url).subscribe({
//   //      next: (data: any) => { 
//   //        this.patrolLogs = data; 
//   //        loader.dismiss(); 
//   //      },
      
//   //      error: async () => { 
//   //        loader.dismiss(); 
//   //        const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
//   //        this.presentToast(errMsg, 'danger'); 
//   //      }

//   //   });
//   // }


// //  async loadPatrolLogs(from?: string, to?: string) {
// //   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
// //   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
// //   await loader.present();

// //   // LocalStorage se IDs nikaalna
// //   const storedRangerId = localStorage.getItem('ranger_id');
// //   const storedCompanyId = localStorage.getItem('company_id');

// //   let params = new Array();
// //   if (from) params.push(`from=${from}`);
// //   if (to) params.push(`to=${to}`);
  
// //   // Ranger ID and Company ID ko query params mein add karein
// //   if (storedRangerId) params.push(`rangerId=${storedRangerId}`);
// //   if (storedCompanyId) params.push(`company_id=${storedCompanyId}`); // 👈 Admin view ke liye zaroori

// //   const queryString = params.length > 0 ? `?${params.join('&')}` : '';
// //   const url = `${this.apiUrl}/logs${queryString}`;

// //   this.http.get(url).subscribe({
// //     next: (data: any) => { 
// //       this.patrolLogs = data; 
// //       loader.dismiss(); 
// //     },
// //     error: async () => { 
// //       loader.dismiss(); 
// //       const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
// //       this.presentToast(errMsg, 'danger'); 
// //     }
// //   });
// // }
// // async loadPatrolLogs(from?: string, to?: string) {
// //   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
// //   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
// //   await loader.present();

// //   const storedRangerId = localStorage.getItem('ranger_id');
// //   const storedCompanyId = localStorage.getItem('company_id');
// //   const userRole = localStorage.getItem('user_role');

// //   let params: string[] = [];
// //   if (from) params.push(`from=${from}`);
// //   if (to) params.push(`to=${to}`);
  
// //   if (userRole === 'RANGER' && storedRangerId) {
// //     params.push(`rangerId=${storedRangerId}`);
// //   }
// //   if (storedCompanyId) {
// //     params.push(`companyId=${storedCompanyId}`); 
// //   }

// //   const queryString = params.length > 0 ? `?${params.join('&')}` : '';
// //   const activeUrl = `${this.apiUrl}/active${queryString}`;
// //   const logsUrl = `${this.apiUrl}/logs${queryString}`;

// //   forkJoin({
// //     active: this.http.get(activeUrl),
// //     history: this.http.get(logsUrl)
// //   }).subscribe({
// //     next: (res: any) => {
// //       // 1. Pending logs ka naming logic
// //       const pendingLogs = (res.active || []).map((p: any) => ({
// //         ...p,
// //         status: 'PENDING',
// //         // Agar method hai toh "FOOT PATROL", nahi toh "ACTIVE PATROL"
// //         patrolName: p.method ? `${p.method.toUpperCase()} PATROL` : 'ACTIVE PATROL',
// //         startTime: p.startTime || new Date().toISOString() 
// //       }));

// //       // 2. History logs (Completed) ka naming logic
// //       const completedLogs = (res.history || []).map((h: any) => ({
// //         ...h,
// //         // Yahan "FOOT - ROUTINE" jaisa format banega
// //         patrolName: h.method && h.type 
// //           ? `${h.method.toUpperCase()} - ${h.type.toUpperCase()}` 
// //           : (h.method ? `${h.method.toUpperCase()} PATROL` : 'PATROL LOG')
// //       }));

// //       // 3. Merge: Pending upar, Completed niche
// //       this.patrolLogs = [...pendingLogs, ...completedLogs];
      
// //       loader.dismiss();
// //       this.cdr.detectChanges();
// //     },
// //     error: async (err) => {
// //       console.error("Combined Fetch Error:", err);
// //       loader.dismiss();
// //       const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
// //       this.presentToast(errMsg, 'danger');
// //     }
// //   });
// // }

// async loadPatrolLogs(from?: string, to?: string) {
//   const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
//   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
//   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
//   await loader.present();

//   const storedRangerId = localStorage.getItem('ranger_id');
//   const storedCompanyId = localStorage.getItem('company_id');
//   const userRole = localStorage.getItem('user_role');

//   let params: string[] = [];
//   if (from) params.push(`from=${from}`);
//   if (to) params.push(`to=${to}`);
// if (userRole === 'RANGER' && userData.id) {
//     params.push(`userId=${userData.id}`); 
//   }
//   if (userRole === 'RANGER' && storedRangerId) params.push(`rangerId=${storedRangerId}`);
//   if (storedCompanyId) params.push(`companyId=${storedCompanyId}`);

//   const queryString = params.length > 0 ? `?${params.join('&')}` : '';
//   const url = `${this.apiUrl}/logs${queryString}`
//   console.log("Filtering for User ID:", userData.id);
  
//   forkJoin({
//     active: this.http.get(`${this.apiUrl}/active${queryString}`),
//     history: this.http.get(`${this.apiUrl}/logs${queryString}`)
//   }).subscribe({
//     next: (res: any) => {
//       console.log("FINAL DATA CHECK:", res);

//       // 1. Map Active/Pending Logs
//       const pendingLogs = (res.active || []).map((p: any) => ({
//         ...p,
//         status: 'PENDING', // Force status so UI shows yellow/pending
//         patrolName: p.method ? `${p.method.toUpperCase()} Patrol` : 'Active Patrol',
//         ranger_name: this.rangerName,
//         // StartTime check karein kyunki list mein date dikhani hoti hai
//         startTime: p.startTime || new Date().toISOString() 
//       }));

//       // 2. Map History Logs
//       const completedLogs = (res.history || []).map((h: any) => ({
//         ...h,
//         // Yahan mapping check kar raha hai h.method aur h.type
//         // patrolName: h.patrol_name || 'Patrol Log'
//         patrolName: (h.method && h.type) 
//           ? `${h.method.toUpperCase()} - ${h.type.toUpperCase()}` 
//           : (h.method ? `${h.method.toUpperCase()} PATROL` : 'COMPLETED LOG')
//       }));

//       this.patrolLogs = [...pendingLogs, ...completedLogs];
      
//       loader.dismiss();
//       this.cdr.detectChanges();
//     },
//     error: async (err) => {
//       console.error("LOAD ERROR:", err);
//       loader.dismiss();
//     }
//   });
// }



// // async savePatrol() {
// //   async savePatrol() {
// //   if (!this.selectedMethod || !this.selectedType) {
// //     const warnMsg = await firstValueFrom(this.translate.get('LIST.SELECT_PLACEHOLDER'));
// //     this.presentToast(warnMsg, 'warning');
// //     this.resetKnob();
// //     return;
// //   }

// //   const storedRangerId = localStorage.getItem('ranger_id'); 
// //   const storedCompanyId = localStorage.getItem('company_id');

// //   if (!storedRangerId) {
// //     this.presentToast('User session not found. Please login again.', 'danger');
// //     this.navCtrl.navigateRoot('/login');
// //     return;
// //   }

// //   this.isSubmitting = true; 
// //   const startMsg = await firstValueFrom(this.translate.get('LIST.STARTING'));
// //   const loader = await this.loadingCtrl.create({ message: startMsg, mode: 'ios' });
// //   await loader.present();

// //   // FIX: Change 'company_id' to 'companyId' to match your NestJS Entity/DTO
// //   const payload = { 
// //     rangerId: parseInt(storedRangerId),
    
// //     // companyId: storedCompanyId ? parseInt(storedCompanyId) : null, 
// //     companyId: storedCompanyId ? parseInt(storedCompanyId) : null,
// //     method: this.selectedMethod,
// //     type: this.selectedType,
// //     latitude: 0, // Should be fetched from Geolocation before this call
// //   longitude: 0,
// //   location_name: 'Patrol Start'
// //   };

// //   this.http.post(`${this.apiUrl}/active`, payload).subscribe({
// //     next: (res: any) => {
// //       loader.dismiss();
// //       // Store the active ID so we can update the route later
// //       localStorage.setItem('active_patrol_id', res.id.toString());
// //       localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
      
// //       this.isModalOpen = false;
// //       this.navCtrl.navigateForward('/patrol-active');
// //     },
// //     error: async (err) => {
// //       loader.dismiss();
// //       this.isSubmitting = false;
// //       this.resetKnob();
// //       const failMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
// //       this.presentToast(failMsg, 'danger');
// //     }
// //   });
// // }

// async savePatrol() {
//   // 1. Validation for UI selection
//   if (!this.selectedMethod || !this.selectedType) {
//     const warnMsg = await firstValueFrom(this.translate.get('LIST.SELECT_PLACEHOLDER'));
//     this.presentToast(warnMsg, 'warning');
//     this.resetKnob();
//     return;
//   }

//   // 2. Retrieve all necessary session data
//   const storedRangerId = localStorage.getItem('ranger_id'); 
//   const storedCompanyId = localStorage.getItem('company_id');
//   // GET RANGER NAME: This ensures the Admin sees "Vidisha" instead of "Ranger"
//   const storedRangerName = localStorage.getItem('ranger_name') || 'Ranger'; 
  

//   if (!storedRangerId) {
//     this.presentToast('User session not found. Please login again.', 'danger');
//     this.navCtrl.navigateRoot('/login');
//     return;
//   }

//   this.isSubmitting = true; 
//   const startMsg = await firstValueFrom(this.translate.get('LIST.STARTING'));
//   const loader = await this.loadingCtrl.create({ message: startMsg, mode: 'ios' });
//   const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
//   await loader.present();

//   let lat = 0;
//   let lng = 0;

//   try {
//     // 3. Attempt to get real GPS coordinates for the Admin map
//     const { Geolocation } = await import('@capacitor/geolocation');
//     const position = await Geolocation.getCurrentPosition({
//       enableHighAccuracy: true,
//       timeout: 5000 // 5 second timeout to prevent getting stuck
//     });
//     lat = position.coords.latitude;
//     lng = position.coords.longitude;
//   } catch (e) {
//     console.warn("GPS failed or timed out, proceeding with 0,0", e);
//   }

//   // 4. Build the Final Payload
//  // 4. Build the Final Payload
// const payload = { 
//   rangerId: parseInt(storedRangerId),
//   companyId: storedCompanyId ? parseInt(storedCompanyId) : null, // Changed from company_id to companyId
//   ranger_name: this.rangerName,
//   method: this.selectedMethod,
//   type: this.selectedType,
//   latitude: lat,
//   longitude: lng,
//   location_name: 'Patrol Start'
// };

//   // 5. Send to Backend
//   this.http.post(`${this.apiUrl}/active`, payload).subscribe({
//     next: (res: any) => {
//       loader.dismiss();
      
//       // Persist session info for the tracking page
//       localStorage.setItem('active_patrol_id', res.id.toString());
//       localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
      
//       this.isModalOpen = false;
//       // Navigate to tracking
//       this.navCtrl.navigateForward('/home/patrol-active');
//     },
//     error: async (err) => {
//       console.error("API Error:", err);
//       loader.dismiss();
//       this.isSubmitting = false;
//       this.resetKnob();
//       const failMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
//       this.presentToast(failMsg, 'danger');
//     }
//   });
// }





//   setFilterOpen(isOpen: boolean) {
//     this.isFilterModalOpen = isOpen;
//   }

// applyFilter() {
//   if (this.filterFrom && this.filterTo && this.filterFrom > this.filterTo) {
//     this.presentToast("'From' date cannot be after 'To' date", 'warning');
//     return;
//   }
//   this.isFilterModalOpen = false;
//   this.loadPatrolLogs(this.filterFrom, this.filterTo);
// }

//   resetFilter() {
//     this.filterFrom = '';
//     this.filterTo = '';
//     this.isFilterModalOpen = false;
//     this.loadPatrolLogs();
//   }


//   private async processDelete(id: number) {
//     this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
//       next: () => {
//         this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
//         this.presentToast('Log deleted', 'success');
//       },
//       error: () => this.presentToast('Delete failed', 'danger')
//     });
//   }

//   getCategoryIcon(category: string): string {
//     const cat = category?.toLowerCase() || '';
//     if (cat.includes('animal')) return 'fas fa-paw';
//     if (cat.includes('water')) return 'fas fa-tint';
//     if (cat.includes('impact')) return 'fas fa-exclamation-triangle';
//     if (cat.includes('death')) return 'fas fa-skull';
//     if (cat.includes('felling')) return 'fas fa-tree';
//     return 'fas fa-eye';
//   }

// setOpen(isOpen: boolean) {
//   this.isModalOpen = isOpen;
//   if (isOpen) {
//     // 1. Try to get 'ranger_username' first, then 'ranger_name' as a backup
//     this.rangerName = localStorage.getItem('ranger_username') || localStorage.getItem('ranger_name') || 'Unknown Ranger';
    
//     // 2. Debugging: Check your console to see what is happening
//     console.log("Fetched Ranger Name from Storage:", this.rangerName);
    
//     setTimeout(() => this.setupSwipeGesture(), 150);
//   }
// }


//   viewDetails(log: any) {
//   if (log.status === 'PENDING') {
//     // Agar status PENDING hai (Active Patrol table se aaya hai)
//     this.navCtrl.navigateForward(['/home/patrol-active'], { // <--- Path check kar lein (/home/ ya direct)
//       queryParams: { 
//         id: log.id,
//         isResuming: true 
//       }
//     });
//   } else {
//     // Agar COMPLETED hai (Logs table se aaya hai)
//     this.navCtrl.navigateForward(['/patrol-details', log.id]);
//   }
// }

//   async deleteLog(id: number, event: Event) {
//     event.stopPropagation();
//     const headerMsg = await firstValueFrom(this.translate.get('COMMON.DELETE_CONFIRM'));
    
//     const alert = await this.alertCtrl.create({
//       header: 'Delete Log',
//       message: headerMsg,
//       buttons: [
//         { text: await firstValueFrom(this.translate.get('COMMON.CANCEL')), role: 'cancel' },
//         { text: 'Delete', role: 'destructive', handler: () => { this.processDelete(id); } }
//       ]
//     });
//     await alert.present();
//   }

//   private resetKnob() {
//     if (this.sliderKnob) {
//       this.domCtrl.write(() => {
//         this.sliderKnob.nativeElement.style.transition = '0.3s ease-out';
//         this.sliderKnob.nativeElement.style.transform = `translateX(0px)`;
//       });
//     }
//     this.isSubmitting = false;
//   }

//   async presentToast(message: string, color: string) {
//     const toast = await this.toastCtrl.create({ message, duration: 2000, color, mode: 'ios' });
//     await toast.present();
//   }

//   goBack() { this.navCtrl.navigateRoot('/home'); }
// }

import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController, GestureController, DomController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, forkJoin } from 'rxjs';
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

<<<<<<< HEAD
  // public patrolLogs: any[] = [];
  
=======
>>>>>>> f88412e6a91e64ba6f9c8298dd5f556581de49fc
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
  public rangerName: string = '';
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
    private translate: TranslateService
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

  // --- DATA LOADING ---
  async loadPatrolLogs(from?: string, to?: string) {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
    const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
    await loader.present();

    const storedRangerId = localStorage.getItem('ranger_id');
    const storedCompanyId = localStorage.getItem('company_id');
    const userRole = localStorage.getItem('user_role');

    let params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (userRole === 'RANGER' && userData.id) params.push(`userId=${userData.id}`); 
    if (userRole === 'RANGER' && storedRangerId) params.push(`rangerId=${storedRangerId}`);
    if (storedCompanyId) params.push(`companyId=${storedCompanyId}`);

<<<<<<< HEAD
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
// async loadPatrolLogs(from?: string, to?: string) {
//   const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
//   const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
//   await loader.present();

//   const storedRangerId = localStorage.getItem('ranger_id');
//   const storedCompanyId = localStorage.getItem('company_id');
//   const userRole = localStorage.getItem('user_role');

//   let params: string[] = [];
//   if (from) params.push(`from=${from}`);
//   if (to) params.push(`to=${to}`);
  
//   if (userRole === 'RANGER' && storedRangerId) {
//     params.push(`rangerId=${storedRangerId}`);
//   }
//   if (storedCompanyId) {
//     params.push(`companyId=${storedCompanyId}`); 
//   }

//   const queryString = params.length > 0 ? `?${params.join('&')}` : '';
//   const activeUrl = `${this.apiUrl}/active${queryString}`;
//   const logsUrl = `${this.apiUrl}/logs${queryString}`;

//   forkJoin({
//     active: this.http.get(activeUrl),
//     history: this.http.get(logsUrl)
//   }).subscribe({
//     next: (res: any) => {
//       // 1. Pending logs ka naming logic
//       const pendingLogs = (res.active || []).map((p: any) => ({
//         ...p,
//         status: 'PENDING',
//         // Agar method hai toh "FOOT PATROL", nahi toh "ACTIVE PATROL"
//         patrolName: p.method ? `${p.method.toUpperCase()} PATROL` : 'ACTIVE PATROL',
//         startTime: p.startTime || new Date().toISOString() 
//       }));

//       // 2. History logs (Completed) ka naming logic
//       const completedLogs = (res.history || []).map((h: any) => ({
//         ...h,
//         // Yahan "FOOT - ROUTINE" jaisa format banega
//         patrolName: h.method && h.type 
//           ? `${h.method.toUpperCase()} - ${h.type.toUpperCase()}` 
//           : (h.method ? `${h.method.toUpperCase()} PATROL` : 'PATROL LOG')
//       }));

//       // 3. Merge: Pending upar, Completed niche
//       this.patrolLogs = [...pendingLogs, ...completedLogs];
      
//       loader.dismiss();
//       this.cdr.detectChanges();
//     },
//     error: async (err) => {
//       console.error("Combined Fetch Error:", err);
//       loader.dismiss();
//       const errMsg = await firstValueFrom(this.translate.get('PATROL.SYNC_ERROR'));
//       this.presentToast(errMsg, 'danger');
//     }
//   });
// }

async loadPatrolLogs(from?: string, to?: string) {
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const userRole = localStorage.getItem('user_role'); // Ye 'User' ya 'Admin' hoga
  const storedCompanyId = localStorage.getItem('company_id');

  const loaderMsg = await firstValueFrom(this.translate.get('DETAILS.LOADING'));
  const loader = await this.loadingCtrl.create({ message: loaderMsg, mode: 'ios' });
  await loader.present();

  let params: string[] = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);

  
  if (userRole === 'Admin' || userRole === 'Super Admin') {
    if (storedCompanyId) params.push(`companyId=${storedCompanyId}`);
    console.log("LOGIC: User is Admin. Sending companyId:", storedCompanyId);
  } else {
    // Ranger/User ke liye hamesha userId bhejenge
    if (userData.id) {
      params.push(`userId=${userData.id}`);
      console.log("LOGIC: User is Ranger/Regular. Sending userId:", userData.id);
    }
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  console.log("FINAL API CALL:", `${this.apiUrl}/logs${queryString}`);

  forkJoin({
    active: this.http.get(`${this.apiUrl}/active${queryString}`),
    history: this.http.get(`${this.apiUrl}/logs${queryString}`)
  }).subscribe({
    next: (res: any) => {
      console.log("DATA RECEIVED:", res);
      
      // ... (baki mapping logic same rahegi)
      const pendingLogs = (res.active || []).map((p: any) => ({
        ...p,
        status: 'PENDING',
        patrolName: p.method ? `${p.method.toUpperCase()} PATROL` : 'ACTIVE PATROL'
      }));

      const completedLogs = (res.history || []).map((h: any) => ({
        ...h,
        status: 'COMPLETED',
        patrolName: (h.method && h.type) ? `${h.method.toUpperCase()} - ${h.type.toUpperCase()}` : 'COMPLETED LOG'
      }));

      this.patrolLogs = [...pendingLogs, ...completedLogs];
      loader.dismiss();
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error("API ERROR:", err);
      loader.dismiss();
    }
  });
}


// async savePatrol() {
//   async savePatrol() {
//   if (!this.selectedMethod || !this.selectedType) {
//     const warnMsg = await firstValueFrom(this.translate.get('LIST.SELECT_PLACEHOLDER'));
//     this.presentToast(warnMsg, 'warning');
//     this.resetKnob();
//     return;
//   }

//   const storedRangerId = localStorage.getItem('ranger_id'); 
//   const storedCompanyId = localStorage.getItem('company_id');

//   if (!storedRangerId) {
//     this.presentToast('User session not found. Please login again.', 'danger');
//     this.navCtrl.navigateRoot('/login');
//     return;
//   }

//   this.isSubmitting = true; 
//   const startMsg = await firstValueFrom(this.translate.get('LIST.STARTING'));
//   const loader = await this.loadingCtrl.create({ message: startMsg, mode: 'ios' });
//   await loader.present();

//   // FIX: Change 'company_id' to 'companyId' to match your NestJS Entity/DTO
//   const payload = { 
//     rangerId: parseInt(storedRangerId),
=======
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
>>>>>>> f88412e6a91e64ba6f9c8298dd5f556581de49fc
    
    forkJoin({
      active: this.http.get(`${this.apiUrl}/active${queryString}`),
      history: this.http.get(`${this.apiUrl}/logs${queryString}`)
    }).subscribe({
      next: (res: any) => {
        const pendingLogs = (res.active || []).map((p: any) => ({
          ...p,
          status: 'PENDING',
          patrolName: p.method ? `${p.method.toUpperCase()} Patrol` : 'Active Patrol',
          startTime: p.startTime || new Date().toISOString() 
        }));

        const completedLogs = (res.history || []).map((h: any) => ({
          ...h,
          patrolName: (h.method && h.type) 
            ? `${h.method.toUpperCase()} - ${h.type.toUpperCase()}` 
            : (h.method ? `${h.method.toUpperCase()} PATROL` : 'COMPLETED LOG')
        }));

        this.patrolLogs = [...pendingLogs, ...completedLogs];
        loader.dismiss();
        this.cdr.detectChanges();
      },
      error: async (err) => {
        console.error("LOAD ERROR:", err);
        loader.dismiss();
      }
    });
  }

  // --- SAVE / START PATROL ---
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
    const loader = await this.loadingCtrl.create({ message: 'Starting Patrol...', mode: 'ios' });
    await loader.present();

    let lat = 0, lng = 0;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (e) { console.warn("GPS failed, using 0,0"); }

    const payload = { 
      rangerId: parseInt(storedRangerId),
      companyId: storedCompanyId ? parseInt(storedCompanyId) : null,
      ranger_name: this.rangerName,
      method: this.selectedMethod,
      type: this.selectedType,
      latitude: lat,
      longitude: lng,
      location_name: 'Patrol Start'
    };

    this.http.post(`${this.apiUrl}/active`, payload).subscribe({
      next: (res: any) => {
        loader.dismiss();
        const activeId = res.id.toString();
        
        // Save locally for backup
        localStorage.setItem('active_patrol_id', activeId);
        localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
        
        this.isModalOpen = false;
        
        // Redundant IDs in queryParams to fix navigation error
        this.navCtrl.navigateForward(['/home/patrol-active'], {
          queryParams: { 
            id: activeId,
            patrolId: activeId
          }
        });
      },
      error: async (err) => {
        loader.dismiss();
        this.isSubmitting = false;
        this.resetKnob();
        this.presentToast('Error starting patrol', 'danger');
      }
    });
  }

  // --- ACTIONS & NAVIGATION ---
  viewDetails(log: any) {
    if (log.status === 'PENDING') {
      const activeId = log.id.toString();
      localStorage.setItem('active_patrol_id', activeId);

      this.navCtrl.navigateForward(['/home/patrol-active'], {
        queryParams: { 
          id: activeId,
          patrolId: activeId,
          isResuming: true 
        }
      });
    } else {
      this.navCtrl.navigateForward(['/patrol-details', log.id]);
    }
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

  private async processDelete(id: number) {
    this.http.delete(`${this.apiUrl}/logs/${id}`).subscribe({
      next: () => {
        this.patrolLogs = this.patrolLogs.filter(log => log.id !== id);
        this.presentToast('Log deleted', 'success');
      },
      error: () => this.presentToast('Delete failed', 'danger')
    });
  }

  // --- UI HELPERS ---
  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.rangerName = localStorage.getItem('ranger_username') || localStorage.getItem('ranger_name') || 'Ranger';
      setTimeout(() => this.setupSwipeGesture(), 150);
    }
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

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('animal')) return 'fas fa-paw';
    if (cat.includes('water')) return 'fas fa-tint';
    if (cat.includes('impact')) return 'fas fa-exclamation-triangle';
    if (cat.includes('death')) return 'fas fa-skull';
    if (cat.includes('felling')) return 'fas fa-tree';
    return 'fas fa-eye';
  }

  setFilterOpen(isOpen: boolean) { this.isFilterModalOpen = isOpen; }
  
  applyFilter() {
    if (this.filterFrom && this.filterTo && this.filterFrom > this.filterTo) {
      this.presentToast("'From' date cannot be after 'To' date", 'warning');
      return;
    }
    this.isFilterModalOpen = false;
    this.loadPatrolLogs(this.filterFrom, this.filterTo);
  }

  resetFilter() {
    this.filterFrom = ''; this.filterTo = '';
    this.isFilterModalOpen = false;
    this.loadPatrolLogs();
  }

  goBack() { this.navCtrl.navigateRoot('/home'); }
}