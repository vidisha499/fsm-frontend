import { Component, Renderer2, QueryList, ViewChildren, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController, ToastController, LoadingController, AlertController } from '@ionic/angular';
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
  userRange: string = '';
  userBeat: string = '';
  userPhoto: string = ''; 
  profileImage: string | null = null;
  userRole: string = '';
  userDesignation: string = '';
  isLoadingSidebar: boolean = false; // Added for loader UI


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
  showLogoutConfirm: boolean = false;

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
    private photoViewer: PhotoViewerService,
    private alertController: AlertController
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

    const aliasMap: any = {
      'patrol': ['Patrolling'],
      'attendance': ['Attendance'],
      'patrol_report': ['Forest Reports'],
      'attendance_request': ['Attendance'],
      'asset_management': ['Assets'],
      'forest_events': ['Forest Events', 'Incidence'],
      'know_your_area': ['Know Your Area'],
      'plantations': ['Plantation'],
      'chat': ['Chat'],
      'daily_updates': ['Daily Updates'],
      'client_visits': ['Visits']
    };
    console.log("%c🔑 [SIR'S KEYS] STRICT SIDEBAR MAPPINGS:", "color: #0088ff; font-weight: bold; font-size: 14px;");
    console.table(aliasMap);
  }

  isFeatureEnabled(feature: string): boolean {
    return this.dataService.isFeatureEnabled(feature);
  }

  setLanguage(lang: string) {
    this.selectedLanguage = lang;
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
loadUserData() {
  console.log("🚀 APP START: Loading User Data Logic...");
  console.log("🟢 Step 1: Checking localStorage for existing token/session...");
  let rawRole = localStorage.getItem('user_role');
  const userDataStr = localStorage.getItem('user_data');
  const token = localStorage.getItem('api_token');

  if (userDataStr) {
    const parsed = JSON.parse(userDataStr);
    if (parsed.features) {
      localStorage.setItem('user_features', JSON.stringify(parsed.features));
      console.log("🛠️ [APP] Features found for this user:", parsed.features);
    }
  }

  const perms = localStorage.getItem('user_permissions');
  if (perms) {
    console.log("🔒 [APP] Active Permissions from LocalStorage:", JSON.parse(perms));
  }
  
  if (token) {
    console.log("🟢 Step 2: Active session found! Using token for background sync.");
  }

  let parsedUser: any = null;
  
  if (!userDataStr || userDataStr === 'undefined' || userDataStr === 'null') {
    console.warn("⚠️ No valid user_data found in localStorage. Proceeding as Guest.");
    if (!token) return; 
  } else {
    try {
      parsedUser = JSON.parse(userDataStr);
      rawRole = parsedUser?.role_id?.toString() || rawRole;
    } catch (e) {
      console.error("Error parsing user_data:", e);
    }
  }

  rawRole = rawRole || '4';
  
  if (rawRole == '1' || rawRole == '2') {
    this.userRole = 'admin';
  } else {
    this.userRole = 'ranger';
  }

  const roleMap: { [key: string]: string } = {
    '1': 'SUPER ADMIN',
    '2': 'ADMIN',
    '3': 'FOREST GUARD',
    '4': 'SUPERVISOR',
    '7': 'ADMIN'
  };

  if (roleMap[rawRole]) {
    this.userDesignation = roleMap[rawRole];
  } else if (parsedUser && (parsedUser.role_name || parsedUser.designation)) {
    const d = (parsedUser.role_name || parsedUser.designation).toLowerCase();
    if (d.includes('beat') || d.includes('node') || d.includes('unit')) {
       this.userDesignation = roleMap[rawRole] || 'OFFICER';
    } else {
       this.userDesignation = d.toUpperCase();
    }
  } else {
    this.userDesignation = 'OFFICER';
  }

  const savedRoleName = localStorage.getItem('user_role_name');
  if (savedRoleName && savedRoleName !== 'null' && savedRoleName.trim() !== '' && !savedRoleName.toLowerCase().includes('beat')) {
    this.userDesignation = savedRoleName.toUpperCase();
  }

  const rangerId = localStorage.getItem('ranger_id') || localStorage.getItem('user_id') || (parsedUser ? parsedUser.id : null);
  if (rangerId) {
    this.dataService.getUserAssignments(rangerId).subscribe({
      next: (res: any) => {
        const assignments = res?.data || res || [];
        if (Array.isArray(assignments) && assignments.length > 0) {
          const activeAssign = assignments[0];
          const customPerms = activeAssign.permissions?.custom || activeAssign.role?.permissions;
          if (customPerms) {
            localStorage.setItem('user_permissions', JSON.stringify(customPerms));
            this.dataService.permissionsUpdated$.next();
          }

          const entityId = activeAssign.entity_id || activeAssign.entity?.id;
          const entityName = activeAssign.entity_name || activeAssign.entity?.name;
          if (entityId) {
            localStorage.setItem('user_entity_id', String(entityId));
            localStorage.setItem('user_site_id', String(entityId));
          }
          if (entityName) {
            localStorage.setItem('user_site_name', entityName);
          }

          const dynamicRole = activeAssign.role?.name || activeAssign.role_name || parsedUser.role_name || parsedUser.designation || '';
          const dynamicRoleId = activeAssign.role_id || activeAssign.role?.id;
          const isLocationName = dynamicRole.toUpperCase().includes('BEAT') || dynamicRole.toUpperCase().includes('RANGE');

          const baseRole = localStorage.getItem('user_role') || (parsedUser ? parsedUser.role_id : null);
          const isSuperAdminOrAdmin = baseRole == '1' || baseRole == '2';

          if ((!dynamicRole || isLocationName) && !isSuperAdminOrAdmin) {
            const userPerms = customPerms || [];
            this.dataService.getRoleIdList().subscribe((roles: any) => {
              const rList = Array.isArray(roles) ? roles : [];
              if (userPerms.length > 0) {
                const matchedRole = rList.find((r: any) => {
                  const rPerms = r.permissions || [];
                  return rPerms.length === userPerms.length &&
                         rPerms.every((p: string) => userPerms.includes(p));
                });
                if (matchedRole) {
                  const roleName = matchedRole.displayName || matchedRole.name;
                  this.userDesignation = roleName.toUpperCase();
                  (this as any).hasDynamicRole = true;
                  localStorage.setItem('user_role_name', roleName);
                  localStorage.setItem('user_custom_role_id', String(matchedRole.id));
                  this.cdr.detectChanges();
                }
              }
            });
          }

          if (dynamicRole && !isLocationName) {
            (this as any).hasDynamicRole = true;
            if (!isSuperAdminOrAdmin) {
              this.userDesignation = dynamicRole.toUpperCase();
              if (dynamicRoleId) {
                localStorage.setItem('user_role', String(dynamicRoleId));
                this.userRole = 'ranger';
                if (parsedUser) {
                  parsedUser.role_id = dynamicRoleId;
                  parsedUser.role_name = dynamicRole;
                  localStorage.setItem('user_data', JSON.stringify(parsedUser));
                }
              }
            }
          }
          this.cdr.detectChanges();
        }
      }
    });
  }

  const currentRoleId = localStorage.getItem('user_role') || (parsedUser ? parsedUser.role_id : null);
  if (currentRoleId && currentRoleId !== '1' && currentRoleId !== '2') {
    this.dataService.getRoleIdList().subscribe({
      next: (res: any) => {
        const roles = res?.data || res || [];
        const myRole = roles.find((r: any) => String(r.id) === String(currentRoleId));
        if (myRole && myRole.permissions) {
          const existingPerms = localStorage.getItem('user_permissions');
          if (!existingPerms || existingPerms === '[]') {
            localStorage.setItem('user_permissions', JSON.stringify(myRole.permissions));
            this.cdr.detectChanges();
          }
        }
      }
    });
  }
  
  this.rangerName = localStorage.getItem('ranger_username') || '';
  this.rangerPhone = localStorage.getItem('ranger_phone') || '';
  
  if (parsedUser) {
    this.companyName = localStorage.getItem('company_name') || parsedUser.company_name || '';
    this.userPhoto = localStorage.getItem('user_photo') || '';
    
    if (parsedUser.id && parsedUser.company_id) {
      this.dataService.getUserDetails(parsedUser.id, parsedUser.company_id).subscribe({
        next: (res: any) => {
          const data = res.data || res;
          this.companyName = data.company_name || this.companyName;
          localStorage.setItem('company_name', this.companyName);

          if (!(this as any).hasDynamicRole) {
            const rId = Number(data.role_id || parsedUser.role_id);
            let freshRole = data.role?.name || data.role_name || data.designation || '';
            if (rId === 1) freshRole = 'SUPER ADMIN';
            else if (rId === 2 || rId === 7) freshRole = 'ADMIN';
            if (freshRole) this.userDesignation = freshRole.toUpperCase();
          }
          
          const rawPhoto = data.profile_pic || data.photo || data.image || data.profile_image || data.avatar || data.profilePic || data.user_photo;
          if (rawPhoto && rawPhoto.length > 5) {
            this.userPhoto = this.getPhotoUrl(rawPhoto);
            localStorage.setItem('user_photo', this.userPhoto);
          }
          this.cdr.detectChanges();
        }
      });
    }
  }
  
  this.rangerName = this.rangerName || parsedUser?.name || 'User';
  this.rangerDivision = localStorage.getItem('ranger_division') || 'RANGER UNIT';
  this.cdr.detectChanges();
}

  initializeApp() {
    document.body.classList.toggle('dark', false);
    const token = localStorage.getItem('api_token');
    const role = localStorage.getItem('user_role');
    if (token) {
      if (role === '1' || role === '2') {
        this.navCtrl.navigateRoot('/admin');
      } else {
        this.navCtrl.navigateRoot('/home');
      }
    }

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, async () => {
        if (await this.menu.isOpen()) { await this.menu.close(); return; }
        if (this.currentPage === 'settings') { this.currentPage = 'home'; this.cdr.detectChanges(); return; }
        let canPop = false;
        this.routerOutlets.forEach((outlet: IonRouterOutlet) => { if (outlet && outlet.canGoBack()) { outlet.pop(); canPop = true; } });
        if (!canPop) { (navigator as any)['app'].exitApp(); }
      });
    });
  }

getFirstLetter(name: string): string {
  if (!name) return 'U';
  return name.trim().charAt(0).toUpperCase();
}

getAvatarColor(name: string): string {
  if (!name) return '#10b981';
  const firstLetter = name.trim().charAt(0).toUpperCase();
  const colors: { [key: string]: string } = {
    'A': '#f87171', 'B': '#fb923c', 'C': '#fbbf24', 'D': '#facc15',
    'E': '#6366f1', 'F': '#4ade80', 'G': '#34d399', 'H': '#2dd4bf',
    'I': '#22d3ee', 'J': '#38bdf8', 'K': '#60a5fa', 'L': '#818cf8',
    'M': '#a3e635', 'N': '#c084fc', 'O': '#e879f9', 'P': '#f472b6',
    'Q': '#fb7185', 'R': '#475569', 'S': '#10b981', 'T': '#0ea5e9',
    'U': '#6366f1', 'V': '#8b5cf6', 'W': '#ec4899', 'X': '#f43f5e',
    'Y': '#14b8a6', 'Z': '#f59e0b'
  };
  return colors[firstLetter] || '#10b981';
}

async goToPage(path: string) {
  await this.menu.close();
  if (path === 'settings') {
    this.currentPage = 'settings'; 
    this.loadUserData(); 
  } else if (path === 'home') {
    this.currentPage = 'home';
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') { this.navCtrl.navigateRoot('/admin'); } 
    else { this.navCtrl.navigateRoot('/home'); }
  } else {
    this.currentPage = 'home';
    this.navCtrl.navigateForward(`/${path}`).catch(err => console.error("Nav error:", path, err));
  }
  this.cdr.detectChanges();
}

  toggleEdit() { this.isEditMode = !this.isEditMode; this.cdr.detectChanges(); }
  changeProfilePicture() { console.log("Opening camera..."); }

  onDragStart(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;
    const container = document.querySelector('.slider-track');
    if (container) { this.maxSlide = container.clientWidth - 64; }
    if (event.touches && event.touches.length > 0) { this.startX = event.touches[0].clientX - this.currentTranslateX; }
  }

  onDragMove(event: any) {
    if (this.isSubmitting || !this.isEditMode || !event.touches || event.touches.length === 0) return;
    let diff = event.touches[0].clientX - this.startX;
    if (diff < 0) diff = 0;
    if (diff > this.maxSlide) diff = this.maxSlide;
    this.currentTranslateX = diff;
    this.textOpacity = 1 - (diff / this.maxSlide);
    this.cdr.detectChanges();
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
    setTimeout(async () => {
      localStorage.setItem('ranger_username', this.rangerName);
      localStorage.setItem('ranger_phone', this.rangerPhone);
      this.isSubmitting = false;
      this.currentTranslateX = 0;
      this.textOpacity = 1;
      this.isEditMode = false;
      const toast = await this.toastController.create({ message: 'Profile Protocol Updated!', duration: 2000, color: 'success', mode: 'ios', position: 'top' });
      await toast.present();
      this.cdr.detectChanges();
    }, 2000);
  }

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

  async logout() { await this.menu.close(); this.toggleLogoutConfirm(true); }
  toggleLogoutConfirm(show: boolean) { this.showLogoutConfirm = show; this.cdr.detectChanges(); }
  async performLogout() {
    this.showLogoutConfirm = false;
    await this.menu.close();
    const lang = localStorage.getItem('app_language_code');
    localStorage.clear();
    if (lang) { localStorage.setItem('app_language_code', lang); }
    this.navCtrl.navigateRoot('/login');
    this.cdr.detectChanges();
  }

  togglePasswordVisibility() {
    this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
    this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
    this.cdr.detectChanges();
  }

  closeViewer() { this.photoViewer.close(); }
  downloadViewerImage() { if (this.viewerImageUrl) { this.photoViewer.download(this.viewerImageUrl); } }
  toggleViewerZoom(event: any) {
    event.stopPropagation();
    if (this.viewerZoom >= 3) { this.viewerZoom = 1; } else { this.viewerZoom += 0.5; }
    this.cdr.detectChanges();
  }

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') return '';
    let url = '';
    if (typeof photoPath === 'string') {
      url = photoPath.trim();
      if (url.startsWith('[') || url.startsWith('"{')) {
        try {
          const parsed = JSON.parse(url.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
          if (Array.isArray(parsed) && parsed.length > 0) { url = parsed[0].photo || parsed[0].url || parsed[0].path || parsed[0] || ''; } 
          else if (typeof parsed === 'object' && parsed !== null) { url = parsed.photo || parsed.url || parsed.path || ''; }
        } catch (e) { console.warn('Failed to parse photo JSON:', url); }
      }
    } else if (typeof photoPath === 'object' && photoPath !== null) { url = photoPath.photo || photoPath.url || photoPath.path || ''; }
    if (!url || typeof url !== 'string' || url.length < 5) return '';
    if (url.includes('fms.pugarch.in/profilepics/') && !url.includes('/public/')) { url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/'); }
    if (url.startsWith('http')) return url;
    if (url.startsWith('data:')) return url;
    const cleaned = url.replace(/^\/+/, '');
    if (cleaned.includes('fms.pugarch.in')) { return `https://${cleaned.replace('https://', '').replace('http://', '')}`; }
    if (cleaned.includes('/')) { return `https://fms.pugarch.in/public/${cleaned}`; }
    return `https://fms.pugarch.in/public/profilepics/${cleaned}`;
  }
}