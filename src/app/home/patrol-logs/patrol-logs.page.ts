

import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController, GestureController, DomController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { DataService } from '../../data.service';
import { environment } from 'src/environments/environment';

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
  public rangerName: string = '';
  public maxDate: string = new Date().toISOString().split('T')[0];
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
    private translate: TranslateService,
    private dataService: DataService
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
    if (!storedCompanyId) {
      loader.dismiss();
      return;
    }
    
    this.dataService.getPatrolsByCompany(Number(storedCompanyId), from, to).subscribe({
      next: (res: any) => {
        // Assume FMS returns an array of patrols
        const allLogs = Array.isArray(res) ? res : res.data || [];
        
        // Filter by userId if RANGER
        let filteredLogs = allLogs;
        if (userRole === 'RANGER' && userData.id) {
          filteredLogs = allLogs.filter((p: any) => p.user_id == userData.id || p.ranger_id == userData.id);
        }

        this.patrolLogs = filteredLogs.map((p: any) => {
          const isCompleted = p.status === 'COMPLETED' || p.status === 'SUCCESS' || !!p.end_lat || !!p.end_time || !!p.ended_at;
          const mStr = p.method || p.patrol_method || p.method_name || 'PATROL';
          const tStr = p.type || p.patrol_type || p.type_name || 'LOG';

          return {
            ...p,
            status: isCompleted ? 'COMPLETED' : (p.status || 'PENDING'),
            patrolName: mStr.toString().toUpperCase(),
            patrolType: tStr.toString().toUpperCase(),
            startTime: p.created_at || new Date().toISOString() 
          };
        });

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
    
    // 🛡️ PREVENT LEAKAGE: Clear any stale patrol ID before requesting a new one
    localStorage.removeItem('active_patrol_id');
    
    const loader = await this.loadingCtrl.create({ message: 'Starting Patrol...', mode: 'ios' });
    await loader.present();

    let lat = 0, lng = 0;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (e) { console.warn("GPS failed, using 0,0"); }

    // Generate a truly unique sessionId for this session
    const uniqueSessionId = `PATROL_${storedRangerId}_${Date.now()}`;

    // Update payload to match FMS `/patrol/start` POST body requirement
    const payload = { 
      start_lat: String(lat),
      start_lng: String(lng),
      type: this.selectedType,
      method: this.selectedMethod,
      sessionId: uniqueSessionId
    };

    this.dataService.startActivePatrol(payload).subscribe({
      next: (res: any) => {
        loader.dismiss();
        
        // Use server's returned ID if available, else fallback to our unique session ID
        const activeId = (res && res.id) ? res.id.toString() : uniqueSessionId;
        
        localStorage.setItem('active_patrol_id', activeId);
        localStorage.setItem('active_patrol_session_id', uniqueSessionId); // Store the string ID for reporting
        localStorage.setItem('temp_patrol_name', `${this.selectedMethod.toUpperCase()} - ${this.selectedType}`);
        
        this.isModalOpen = false;
        
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
          isResuming: true,
          startTime: log.startTime || log.created_at
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
  async editPatrol(log: any, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Edit Patrol',
      inputs: [
        { name: 'method', type: 'text', placeholder: 'Method (e.g., vehicle)', value: log.method },
        { name: 'type', type: 'text', placeholder: 'Type (e.g., Regular)', value: log.type }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            this.dataService.updatePatrolLog(log.id, data).subscribe({
              next: () => {
                log.method = data.method;
                log.type = data.type;
                log.patrolName = `${data.method.toUpperCase()} - ${data.type.toUpperCase()}`;
                this.presentToast('Updated successfully', 'success');
              },
              error: () => this.presentToast('Update failed', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private async processDelete(id: number) {
    this.dataService.deletePatrolLog(id).subscribe({
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

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}