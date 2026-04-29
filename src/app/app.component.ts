import { Component, Renderer2, QueryList, ViewChildren, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LabelService } from './services/label.service';
// import { DataService } from './data.service';
import { DataService } from './data.service';
import { PhotoViewerService } from './services/photo-viewer.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;

  // ... (rest of members)
  rangerName: string = 'Ranger';
  rangerDivision: string = 'Washim Division 4.2';
  rangerPhone: string = '';
  companyName: string = '';
  userPhoto: string = ''; 
  profileImage: string | null = null;
  userRole: string = '';
  isSuperAdmin: boolean = false; // 🚀 NEW: Identify Super Admin (Role 1)
  isLoadingSidebar: boolean = false; // Added for loader UI
  userDesignation: string = ''; 
  menuFeatures: any = {}; // 🚀 NEW: Store dynamic menu permissions


  showLanguageModal: boolean = false;
  selectedLanguage: string = 'English';
  currentPage: string = 'home'; 
  activeTab: string = 'info';    
  isEditMode: boolean = false;  
  showPassword: boolean = false; 
  showNewPassword: boolean = false;
  currentPassword: string = '';
  rangerPassword: string = '';

  isSubmitting: boolean = false;
  currentTranslateX: number = 0;
  textOpacity: number = 1;
  private startX: number = 0;
  private maxSlide: number = 0; 
  passwordType: string = 'password';
  passwordIcon: string = 'eye-off';

  // Global Photo Viewer State
  showViewer: boolean = false;
  viewerImageUrl: string | null = null;
  viewerZoom: number = 1;

  constructor(
    private translate: TranslateService,
    private renderer: Renderer2,
    private platform: Platform,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef, 
    private toastController: ToastController, 
    public router: Router ,
    private loadingCtrl: LoadingController,
    private labelService: LabelService,
    private dataService: DataService,
    private photoViewer: PhotoViewerService
  ) {
    this.renderer.removeClass(document.body, 'dark');
    this.renderer.addClass(document.body, 'light');
    
    this.initLanguage();
    this.initializeApp();
    this.initGlobalMapFullscreen();
  }

  // Inject a Fullscreen Control into EVERY Leaflet map globally
  initGlobalMapFullscreen() {
    L.Map.addInitHook(function (this: any) {
      const map = this as L.Map;
      
      const FullscreenControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function(m: any) {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom-fullscreen');
          const btn = L.DomUtil.create('a', '', container);
          
          btn.innerHTML = '<i class="fas fa-expand"></i>';
          btn.href = '#';
          btn.title = 'Toggle Fullscreen';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.fontSize = '16px';
          btn.style.color = '#333';
          btn.style.width = '34px';
          btn.style.height = '34px';
          btn.style.backgroundColor = 'white';
          btn.style.textDecoration = 'none';
          
          let isFullscreen = false;
          
          L.DomEvent.on(btn, 'click', function(e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            
            const mapContainer = m.getContainer();
            isFullscreen = !isFullscreen;
            
            if (isFullscreen) {
              mapContainer.classList.add('map-fullscreen-mode');
              btn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
              mapContainer.classList.remove('map-fullscreen-mode');
              btn.innerHTML = '<i class="fas fa-expand"></i>';
            }
            
            setTimeout(() => { m.invalidateSize(); }, 200);
          });
          
          return container;
        }
      });
      
      map.addControl(new FullscreenControl());
    });
  }

  ngOnInit() {
    this.loadUserData();

    // 🔥 SYNC FIX: Listen for label updates and force UI refresh
    this.labelService.labelUpdated$.subscribe(() => {
        this.cdr.detectChanges(); 
    });

    // 🚀 NEW: Listen for Login events to refresh sidebar data immediately
    this.dataService.loginSuccess$.subscribe(() => {
      console.log("🔔 Sidebar Refresh Triggered!");
      this.isLoadingSidebar = true;
      this.loadUserData();
      
      // Artificial delay (1s) to show the professional loader
      setTimeout(() => {
        this.isLoadingSidebar = false;
        this.cdr.detectChanges();
      }, 1000);
    });

    // 🖼️ Global Photo Viewer Subscription
    this.photoViewer.showViewer$.subscribe(show => {
      this.showViewer = show;
      this.viewerZoom = 1;
      this.cdr.detectChanges();
    });
    this.photoViewer.currentImage$.subscribe(img => {
      this.viewerImageUrl = img;
      this.cdr.detectChanges();
    });

    // 🚀 NEW: Check and Sync immediately on App Load if Online
    if (this.dataService.isOnline()) {
      this.dataService.syncAllDrafts();
      this.loadUserData(); // Initial Sync
    }

    // 🔄 AUTOMATIC BACKGROUND SYNC: Check for profile changes every 5 minutes
    setInterval(() => {
      if (this.dataService.isOnline()) {
        console.log("🕒 Background Profile Sync Triggered...");
        this.loadUserData();
      }
    }, 5 * 60 * 1000); 
  }

  // 🔥 NEW: Automatic Sync when Network Restored
  @HostListener('window:online')
  onOnline() {
    console.log("🌐 System back online! Triggering background sync...");
    this.dataService.syncAllDrafts().then(async res => {
      if (res.success && res.count && res.count > 0) {
        console.log(`✅ Background sync completed: ${res.count} items.`);
        const msg = await this.translate.get('LIST.SYNC_COMPLETE').toPromise() || `Successfully synced ${res.count} offline records.`;
        const toast = await this.toastController.create({
          message: msg,
          duration: 3000,
          color: 'success',
          position: 'bottom',
          mode: 'ios'
        });
        toast.present();
      }
    });
  }

  // --- DATA LOADING LOGIC ---
  // loadUserData() {
  //   const name = localStorage.getItem('user_name');
  //   this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
  //   this.rangerPhone = localStorage.getItem('ranger_phone') || ''; 
  //   this.rangerDivision = localStorage.getItem('ranger_division') || 'Washim Division 4.2';
    
  //   const storedImg = localStorage.getItem('ranger_photo');
  //   if (storedImg) {
  //     this.profileImage = storedImg;
  //   }
  //   this.cdr.detectChanges();
  // }
  // 🛠️ Check if a specific menu feature is allowed
  // Maps our internal sidebar keys → all possible server API key names
  // ✅ Sir's EXACT server 'value' keys mapped to our sidebar keys
  private readonly featureAliasMap: { [key: string]: string[] } = {
    'attendance':         ['attendance', 'mark_attendance'],
    'attendance_request': ['attendance_request', 'emergency_attendance', 'emergency-attendance',
                           'attendance_requests', 'attendance_approval'],
    'asset_management':  ['asset_management', 'asset-management', 'assets', 'asset'],
    'forest_events':     ['forest_events', 'forest-events', 'incidence', 'incidents', 'events'],
    'patrol_report':     ['patrol_report', 'patrol-report', 'patrol_list', 'patrol-list',
                           'tour', 'reports', 'report'],
    'daily_updates':     ['daily_updates', 'dailyupdates', 'updates', 'daily_update'],
    'chat':              ['chat', 'communication', 'messaging'],
    'communication':     ['communication', 'chat', 'messaging'],
    'client_visits':     ['client_visits', 'visits', 'visitor', 'visitors', 'field_visit', 'field-visit'],
    'field_visits':      ['field_visits', 'field_visit', 'field-visit', 'visits', 'visitor'],
    'know_your_area':    ['know_your_area', 'boundary_hierarchy', 'boundary-hierarchy',
                           'geofencing', 'geofence', 'geofences'],
    'plantations':       ['plantations', 'plantation_list', 'plantation-list', 'plantation'],
    'location_tracker':  ['location_tracker', 'track', 'tracking', 'live_tracking'],
  };

  isFeatureEnabled(key: string): boolean {
    // If features not yet loaded → hide everything (security default)
    if (!this.menuFeatures || Object.keys(this.menuFeatures).length === 0) {
      return false;
    }

    // 1. Direct key match (server key === sidebar key)
    if (this.menuFeatures[key] === true) return true;

    // 2. Alias match — try all server key variants for this sidebar key
    const aliases = this.featureAliasMap[key] || [];
    return aliases.some(alias => this.menuFeatures[alias] === true);
  }

loadUserData() {
  let rawRole = localStorage.getItem('user_role');
  const data = localStorage.getItem('user_data');
  let parsedUser: any = null;
  
  if (data) {
    try {
      parsedUser = JSON.parse(data);
    } catch (e) {
      console.error("Error parsing user_data:", e);
    }
  }

  // Fallback role detection
  if (!rawRole && parsedUser) {
    rawRole = parsedUser.role_id?.toString();
  }

  // Final fallback to Ranger
  rawRole = rawRole || '4';
  const roleNum = Number(rawRole);
  
  this.isSuperAdmin = (roleNum === 1);
  // ✅ FIX: Only roles 1 (SuperAdmin) and 2 (Admin) get admin access — role 3 is Guard/Ranger
  this.userRole = (roleNum === 1 || roleNum === 2) ? 'admin' : 'ranger';
  // Load cached designation (will be overwritten by live server data below)
  this.userDesignation = localStorage.getItem('user_designation') || '';

  // 1. Initial Load from Cache
  this.rangerName = localStorage.getItem('ranger_username') || (parsedUser ? parsedUser.name : 'User');
  this.rangerPhone = localStorage.getItem('ranger_phone') || (parsedUser ? (parsedUser.phone || parsedUser.contact) : '');
  this.companyName = parsedUser?.company_name || parsedUser?.client_name || '';
  
  const savedFeatures = localStorage.getItem('menu_features');
  if (savedFeatures) {
    try { this.menuFeatures = JSON.parse(savedFeatures); } catch(e) {}
  }

  // 2. 🚀 LIVE SYNC: Fetch latest from server if online
  if (this.dataService.isOnline() && parsedUser?.id && parsedUser?.company_id) {
    this.dataService.getUserDetails(parsedUser.id, parsedUser.company_id).subscribe({
      next: (res: any) => {
        if (res && (res.status === 'success' || res.status === 'SUCCESS' || res.data)) {
          const fresh = res.data || res;
          
          console.log("📥 [RAW SERVER DATA]:", fresh); 

          // Update properties
          this.rangerName = fresh.name || fresh.username || fresh.ranger_name || this.rangerName;
          this.rangerPhone = fresh.contact || fresh.phone || fresh.mobile || this.rangerPhone;
          this.companyName = fresh.company_name || fresh.client_name || (fresh.company ? fresh.company.name : '') || this.companyName;
          
          // 🚀 ALWAYS update role and designation from server data (not just inside features block)
          const freshRole = fresh.role_id || fresh.role || fresh.roleId || roleNum;
          const updatedRoleNum = Number(freshRole);
          
          this.isSuperAdmin = (updatedRoleNum === 1);
          // ✅ FIX: role_id 3 does NOT mean admin — use server designation as source of truth
          // Only role 1 (SuperAdmin) and role 2 (Admin) get admin access
          this.userRole = (updatedRoleNum === 1 || updatedRoleNum === 2) ? 'admin' : 'ranger';
          localStorage.setItem('user_role', updatedRoleNum.toString());

          // ✅ FIX: ALWAYS use server designation — never guess from role number
          // Server mein 'designation' field hoga: 'Forest Guard', 'Ranger', 'Super Admin' etc.
          if (fresh.designation && fresh.designation !== 'null' && fresh.designation.trim() !== '') {
            this.userDesignation = fresh.designation.trim().toUpperCase();
          } else if (fresh.role_name && fresh.role_name !== 'null' && fresh.role_name.trim() !== '') {
            this.userDesignation = fresh.role_name.trim().toUpperCase();
          } else {
            // Fallback based on role_id
            if (updatedRoleNum === 1) this.userDesignation = 'SUPER ADMIN';
            else if (updatedRoleNum === 2) this.userDesignation = 'ADMIN';
            else this.userDesignation = 'FOREST GUARD'; // role 3, 4, or anything else
          }

          console.log(`🔍 [USER SYNC] Server Role ID: ${updatedRoleNum} | userRole: ${this.userRole.toUpperCase()} | Designation: ${this.userDesignation}`);

          // Update localStorage for consistency
          localStorage.setItem('ranger_username', this.rangerName);
          localStorage.setItem('ranger_phone', this.rangerPhone);
          localStorage.setItem('user_designation', this.userDesignation);
          
          if (parsedUser) {
            parsedUser.name = this.rangerName;
            parsedUser.contact = this.rangerPhone;
            parsedUser.company_name = this.companyName;
            parsedUser.role_id = updatedRoleNum;
            localStorage.setItem('user_data', JSON.stringify(parsedUser));
          }

          if (fresh.profile_pic) {
            localStorage.setItem('user_photo', fresh.profile_pic);
            this.userPhoto = fresh.profile_pic;
          }

          // 🛠️ FEATURE PERMISSIONS: Parse dynamic menu options using Sir's is_checked field
          if (fresh.features && Array.isArray(fresh.features)) {
            
            // 🔍 Log raw structure to understand Sir's API format
            console.log("🔍 [RAW FEATURES STRUCTURE - first item]:", JSON.stringify(fresh.features[0]));
            console.log("🔍 [RAW FEATURES COUNT]:", fresh.features.length);

            const featMap: any = {};

            // Check if features array is role-wise (each item has role_id)
            const isRoleWise = fresh.features.some((f: any) => f.role_id !== undefined || f.roleId !== undefined);

            let featuresToProcess = fresh.features;

            if (isRoleWise) {
              // ✅ Sir's API: features are per role — filter to ONLY current user's role
              const currentRoleId = updatedRoleNum;
              featuresToProcess = fresh.features.filter((f: any) => {
                const fRole = Number(f.role_id || f.roleId);
                return fRole === currentRoleId;
              });
              console.log(`🎯 [ROLE-WISE FEATURES] Filtered for role_id ${currentRoleId}: ${featuresToProcess.length} features`);
            } else {
              // Features are already user-specific (no role_id needed)
              console.log("📋 [USER-SPECIFIC FEATURES] Using all features directly");
            }

            featuresToProcess.forEach((f: any) => {
              // ✅ Sir's API exact format: {name:"Attendance", value:"attendance", checked:true, icon:"calendar", type:"module"}
              // 'value' is the machine key, 'name' is just the display label
              const rawKey = f.value || f.key || f.slug || f.feature_name || f.module || '';
              
              // 🔍 Log EACH feature so we can see exact names from Sir's API
              console.log(`  📌 Feature: value="${f.value}" | name="${f.name}" | checked=${f.checked} | is_checked=${f.is_checked}`);
              
              if (rawKey) {
                const key = rawKey.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
                // ✅ Sir's PRIMARY field: 'checked' (boolean) — confirmed from raw response
                // Fallback to is_checked, status, enabled for other API variants
                const isEnabled = (f.checked === true  || f.checked == 1  ||
                                   f.is_checked === true || f.is_checked == 1 ||
                                   f.status == 1 || f.enabled == 1 || f.is_enabled == 1);
                // ✅ BUG FIX: Don't let false overwrite true
                // Sir's API has duplicate value="emergency-attendance": first=true, second=false
                // We keep true if ANY occurrence is true
                featMap[key] = featMap[key] === true ? true : isEnabled;
              }
            });

            
            console.log("🛠️ [FEATURES PERMISSIONS - FINAL]:", featMap); 
            
            this.menuFeatures = featMap;
            localStorage.setItem('menu_features', JSON.stringify(featMap));

          } else {
            console.warn("⚠️ No features found in API response for Role:", updatedRoleNum);
          }

          // 📢 Notify all components (Dashboards) to refresh
          this.dataService.userProfileUpdated$.next(fresh);
          
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.warn("Profile Sync Silent Error:", err)
    });
  }

  this.userPhoto = localStorage.getItem('user_photo') || ''; 
  this.rangerDivision = localStorage.getItem('ranger_division') || (this.userRole === 'admin' ? 'ADMIN UNIT' : 'RANGER UNIT');

  this.cdr.detectChanges();
}
  initializeApp() {
    document.body.classList.toggle('dark', false);

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, async () => {
        if (await this.menu.isOpen()) {
          await this.menu.close();
          return;
        }

        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) {
          await actionSheet.dismiss();
          return;
        }

        const modal = await this.modalCtrl.getTop();
        if (modal) {
          await modal.dismiss();
          return;
        }

        if (this.currentPage === 'settings') {
          this.currentPage = 'home';
          this.cdr.detectChanges();
          return;
        }

        let canPop = false;
        this.routerOutlets.forEach((outlet: IonRouterOutlet) => {
          if (outlet && outlet.canGoBack()) {
            outlet.pop();
            canPop = true;
          }
        });

        if (!canPop) {
          (navigator as any)['app'].exitApp();
        }
      });
    });
  }

  // 1. Pehle ye function add karein
getFirstLetter(name: string): string {
  if (!name) return 'U';
  return name.trim().charAt(0).toUpperCase();
}

// 2. Ye function random/fixed color return karega
getAvatarColor(name: string): string {
  if (!name) return '#10b981'; // Default Green

  const firstLetter = name.trim().charAt(0).toUpperCase();
  
  // Har letter ke liye ek premium color code
  const colors: { [key: string]: string } = {
    'A': '#f87171', 'B': '#fb923c', 'C': '#fbbf24', 'D': '#facc15',
    'E': '#6366f1', 'F': '#4ade80', 'G': '#34d399', 'H': '#2dd4bf',
    'I': '#22d3ee', 'J': '#38bdf8', 'K': '#60a5fa', 'L': '#818cf8',
    'M': '#a3e635', 'N': '#c084fc', 'O': '#e879f9', 'P': '#f472b6',
    'Q': '#fb7185', 'R': '#475569', 'S': '#10b981', 'T': '#0ea5e9',
    'U': '#6366f1', 'V': '#8b5cf6', 'W': '#ec4899', 'X': '#f43f5e',
    'Y': '#14b8a6', 'Z': '#f59e0b'
  };

  return colors[firstLetter] || '#10b981'; // Agar list mein na ho toh default Green
}

  // --- NAVIGATION METHODS ---
  // async goToPage(path: string) {
  //   await this.menu.close();
    
  //   if (path === 'settings') {
  //     this.currentPage = 'settings'; 
  //     this.loadUserData(); // Settings khulte hi data refresh
  //   } else {
  //     this.currentPage = 'home';
  //     if (path === 'home') {
  //       this.navCtrl.navigateRoot('/home');
  //     } else {
  //       this.navCtrl.navigateForward(`/${path}`).catch(err => {
  //         console.log("Navigation error:", path);
  //       });
  //     }
  //   }
  //   this.cdr.detectChanges();
  // }

//   async goToPage(path: string) {
//   await this.menu.close();

  
  
//   if (path === 'settings') {
//     this.currentPage = 'settings'; 
//     this.loadUserData(); 
//   } else {
//     this.currentPage = 'home';
//     if (path === 'home') {
//       // Direct the user to the Super Admin route instead of generic home
//       this.navCtrl.navigateRoot('/home/admin'); 
//     } else {
//       // For other pages like 'attendance', 'updates', etc.
//       this.navCtrl.navigateForward(`/${path}`).catch(err => {
//         console.log("Navigation error for path:", path);
//       });
//     }
//   }
//   this.cdr.detectChanges();
// }

async goToPage(path: string) {
  await this.menu.close();

  // 1. Agar Settings hai toh sirf view toggle karo
  if (path === 'settings') {
    this.currentPage = 'settings'; 
    this.loadUserData(); 
  } 
  // 2. Agar Home hai toh Role check karke correct dashboard par bhejo
  else if (path === 'home') {
    this.currentPage = 'home';
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  } 
  // 3. Baaki saare pages (Attendance Requests, Updates, etc.) ke liye
  else {
    this.currentPage = 'home'; // Isse settings view band ho jayega aur router-outlet dikhega
    
    this.navCtrl.navigateForward(`/${path}`).catch(err => {
      console.error("Navigation error for path:", path, err);
      // Agar page nahi mil raha toh check karein routing module
    });
  }

  this.cdr.detectChanges();
}


  // --- SETTINGS METHODS ---
  toggleEdit() {
    this.isEditMode = !this.isEditMode;
    this.cdr.detectChanges();
  }

  changeProfilePicture() {
    console.log("Opening camera/gallery logic...");
    // Add Capacitor Camera logic here
  }

  // --- SLIDER DRAG LOGIC ---
  onDragStart(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;

    const container = document.querySelector('.slider-track');
    if (container) {
      this.maxSlide = container.clientWidth - 64; 
    }
    this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;

    let diff = event.touches[0].clientX - this.startX;

    if (diff < 0) diff = 0;
    if (diff > this.maxSlide) diff = this.maxSlide;

    this.currentTranslateX = diff;
    this.textOpacity = 1 - (diff / this.maxSlide);
    this.cdr.detectChanges(); // Update slider handle position
  }

  async onDragEnd() {
    if (this.isSubmitting || !this.isEditMode) return;

    if (this.currentTranslateX >= this.maxSlide * 0.8) {
      this.currentTranslateX = this.maxSlide;
      this.textOpacity = 0;
      this.submitData(); 
    } else {
      this.currentTranslateX = 0;
      this.textOpacity = 1;
    }
    this.cdr.detectChanges();
  }

  async submitData() {
    this.isSubmitting = true;
    this.cdr.detectChanges();

    // Simulate API Update
    setTimeout(async () => {
      // Data local storage mein save karein
      localStorage.setItem('ranger_username', this.rangerName);
      localStorage.setItem('ranger_phone', this.rangerPhone);

      // Notify other components
      this.dataService.userProfileUpdated$.next({
        name: this.rangerName,
        contact: this.rangerPhone
      });
      
      this.isSubmitting = false;
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.isEditMode = false;

      const toast = await this.toastController.create({
        message: 'Profile Protocol Updated!',
        duration: 2000,
        color: 'success',
        mode: 'ios',
        position: 'top'
      });
      await toast.present();

      this.cdr.detectChanges();
    }, 2000);
  }

  // --- LANGUAGE & AUTH ---
  async toggleLanguageModal(show: boolean) {
    if (show) {
      await this.menu.close(); 
      setTimeout(() => { this.showLanguageModal = true; this.cdr.detectChanges(); }, 100); 
    } else {
      this.showLanguageModal = false;
      this.cdr.detectChanges();
    }
  }

  confirmLanguage() {
    const langCode = this.selectedLanguage === 'Hindi' ? 'hi' : (this.selectedLanguage === 'Marathi' ? 'mr' : 'en');
    this.translate.use(langCode);
    localStorage.setItem('app_language_code', langCode);
    this.toggleLanguageModal(false);
  }

  initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
    this.selectedLanguage = savedLang === 'hi' ? 'Hindi' : (savedLang === 'mr' ? 'Marathi' : 'English');
  }

  async logout() {
    await this.menu.close();
    const lang = localStorage.getItem('app_language_code');
    localStorage.clear();
    if (lang) localStorage.setItem('app_language_code', lang);
    this.navCtrl.navigateRoot('/login');
  }

  togglePasswordVisibility() {
  this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
  this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
  this.cdr.detectChanges();
}

  // --- GLOBAL VIEWER ACTIONS ---
  closeViewer() {
    this.photoViewer.close();
  }

  downloadViewerImage() {
    if (this.viewerImageUrl) {
      this.photoViewer.download(this.viewerImageUrl);
    }
  }

  toggleViewerZoom(event: any) {
    event.stopPropagation();
    if (this.viewerZoom >= 3) {
      this.viewerZoom = 1;
    } else {
      this.viewerZoom += 0.5;
    }
    this.cdr.detectChanges();
  }

}