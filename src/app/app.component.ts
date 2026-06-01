import { Component, Renderer2, QueryList, ViewChildren, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, IonRouterOutlet, ActionSheetController, ModalController, MenuController, NavController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LabelService } from './services/label.service';
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
  isLoadingSidebar: boolean = false;

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

  showViewer: boolean = false;
  viewerImageUrl: string | null = null;
  viewerZoom: number = 1;

  isSyncingPermissions: boolean = false;

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
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.width = '34px';
          btn.style.height = '34px';
          btn.style.backgroundColor = 'white';
          
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
    this.labelService.labelUpdated$.subscribe(() => { this.cdr.detectChanges(); });
    
    // 🚀 Listen for Permission Changes to update Sidebar menu items
    this.dataService.permissionsUpdated$.subscribe(() => {
      if (this.isSyncingPermissions) return;
      console.log("🔄 Sidebar Sync: Permissions Updated!");
      this.loadUserData();
      this.cdr.detectChanges();
    });

    this.dataService.loginSuccess$.subscribe(() => {
      this.isLoadingSidebar = true;
      this.loadUserData();
      
      // Artificial delay (1.5s) to show the professional loader
      setTimeout(() => {
        this.isLoadingSidebar = false;
        this.cdr.detectChanges();
      }, 1500);
    });
    this.photoViewer.showViewer$.subscribe(show => { this.showViewer = show; this.viewerZoom = 1; this.cdr.detectChanges(); });
    this.photoViewer.currentImage$.subscribe(img => { this.viewerImageUrl = img; this.cdr.detectChanges(); });
    if (this.dataService.isOnline()) { this.dataService.syncAllDrafts(); }
  }

  isFeatureEnabled(feature: string): boolean { return this.dataService.isFeatureEnabled(feature); }

  hasExplicitOrgPermission(): boolean {
    const permsStr = localStorage.getItem('user_permissions');
    if (!permsStr) return false;
    try {
      let perms = JSON.parse(permsStr);
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { perms = []; }
      }
      if (!Array.isArray(perms)) return false;
      return perms.some((p: any) => {
        const pStr = String(p.module_key || p.name || p.module || p || '').toLowerCase();
        return pStr.includes('org') || pStr.includes('organization') || pStr.includes('role') || pStr.includes('hierarchy');
      });
    } catch (e) {
      return false;
    }
  }

  hasExplicitUserPermission(): boolean {
    const permsStr = localStorage.getItem('user_permissions');
    if (!permsStr) return false;
    try {
      let perms = JSON.parse(permsStr);
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { perms = []; }
      }
      if (!Array.isArray(perms)) return false;
      return perms.some((p: any) => {
        const pStr = String(p.module_key || p.name || p.module || p || '').toLowerCase();
        return pStr.includes('user') || pStr.includes('member') || pStr.includes('staff');
      });
    } catch (e) {
      return false;
    }
  }

  hasExplicitTaskPermission(): boolean {
    const permsStr = localStorage.getItem('user_permissions');
    if (!permsStr) return false;
    try {
      let perms = JSON.parse(permsStr);
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { perms = []; }
      }
      if (!Array.isArray(perms)) return false;
      return perms.some((p: any) => {
        const pStr = String(p.module_key || p.name || p.module || p || '').toLowerCase();
        return pStr.includes('task');
      });
    } catch (e) {
      return false;
    }
  }

  showAllSidebarKeys() {
    const aliasMap: any = {
      'patrol': ['Patrolling'],
      'attendance': ['Attendance'],
      'patrol_report': ['Forest Events'],
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

  // 🔥 NEW: Automatic Sync when Network Restored
  @HostListener('window:online')
  onOnline() {
    this.dataService.syncAllDrafts().then(async res => {
      if (res.success && res.count > 0) {
        const toast = await this.toastController.create({
          message: `Synced ${res.count} records.`,
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      }
    });
  }

  loadUserData() {
    if (this.isSyncingPermissions) return; // 🛡️ Prevent recursive loops
    this.isSyncingPermissions = true;

    const userDataStr = localStorage.getItem('user_data');
    const token = localStorage.getItem('api_token');
    if (!token) {
      this.isSyncingPermissions = false;
      return;
    }

    let parsedUser: any = null;
    try {
      parsedUser = JSON.parse(userDataStr || '{}');
      console.log("%c📥 [DEBUG] FULL USER DATA OBJECT:", "color: #ff00ff; font-weight: bold;", parsedUser);
    } catch (e) {
      console.error("Error parsing user_data", e);
    }

    console.log("%c💾 [DEBUG] LOCALSTORAGE DUMP:", "color: #00ffff; font-weight: bold;");
    console.log("   🔑 user_role:", localStorage.getItem('user_role'));
    console.log("   🏷️ user_role_name:", localStorage.getItem('user_role_name'));
    console.log("   🎭 user_custom_role_id:", localStorage.getItem('user_custom_role_id'));

    let rawRole = localStorage.getItem('user_role') || parsedUser?.role_id?.toString() || '4';
    this.userRole = (rawRole == '1' || rawRole == '2' || rawRole == '7') ? 'admin' : 'ranger';

    // 🔥 PRIORITIZE: Real role name from user data or assignment
    const dynamicRole = parsedUser?.role_name || parsedUser?.designation || localStorage.getItem('user_role_name');
    console.log("🔍 [DEBUG] Extracted dynamicRole candidate:", dynamicRole);
    
    const roleMap: any = { '1': 'SUPER ADMIN', '2': 'FORESTER', '3': 'FOREST GUARD', '4': 'FORESTER', '7': 'ADMIN' };
    
    if (dynamicRole && dynamicRole !== 'null' && dynamicRole.trim() !== '' && !dynamicRole.toLowerCase().includes('beat')) {
      console.log("✅ [DEBUG] Using Dynamic Role:", dynamicRole.toUpperCase());
      this.userDesignation = dynamicRole.toUpperCase();
    } else {
      console.warn("⚠️ [DEBUG] Dynamic Role invalid, falling back to roleMap or default.");
      this.userDesignation = roleMap[rawRole] || 'OFFICER';
    }
    console.log("🏁 [DEBUG] Final userDesignation set to:", this.userDesignation);

    this.rangerName = localStorage.getItem('ranger_username') || parsedUser?.name || 'User';
    this.rangerPhone = localStorage.getItem('ranger_phone') || parsedUser?.phone || '';
    this.companyName = localStorage.getItem('company_name') || parsedUser?.company_name || '';
    this.userPhoto = localStorage.getItem('user_photo') || '';

    // 🔒 [LOG] Show current active permissions
    const activePerms = localStorage.getItem('user_permissions');
    try {
      const parsedPerms = JSON.parse(activePerms || '[]');
      console.log("%c🔐 [DEBUG] ACTIVE USER PERMISSIONS:", "color: #f59e0b; font-weight: bold; font-size: 12px;", parsedPerms);
    } catch(e) { console.warn("⚠️ [DEBUG] Permissions corrupted in localStorage"); }

    const rangerId = localStorage.getItem('ranger_id') || localStorage.getItem('user_id') || parsedUser?.id;
    console.log("🔍 [DEBUG] Checking assignments for Ranger ID:", rangerId);
    if (rangerId) {
      this.dataService.getUserAssignments(rangerId).subscribe({
        next: (res: any) => {
          const assignments = res?.data || res || [];
          // 🔥 Run multi-assignment V2 sync & parsing
          this.dataService.parseAssignmentHierarchy(assignments);
          
          if (assignments.length > 0) {
            const active = assignments[0];
            const cRid = active.custom_role_id || active.role_id || (active.role ? active.role.id : null);
            const rName = active.role_name || active.role?.name;

            if (cRid && String(cRid) !== '10' && String(cRid) !== localStorage.getItem('user_custom_role_id')) {
              console.log("🏷️ [DEBUG] Found New Custom Role ID:", cRid);
              localStorage.setItem('user_custom_role_id', String(cRid));
              this.syncFromRoleList(cRid);
            }

            if (rName && rName !== 'null' && !rName.toLowerCase().includes('beat') && rName !== localStorage.getItem('user_role_name')) {
              console.log("🎭 [DEBUG] Found New Custom Role Name:", rName);
              this.userDesignation = rName.toUpperCase();
              localStorage.setItem('user_role_name', rName);
            }
          }
          this.isSyncingPermissions = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSyncingPermissions = false;
          console.error("❌ [DEBUG] Assignment API Error:", err);
        }
      });
    } else {
      this.isSyncingPermissions = false;
    }

    if (parsedUser?.id && parsedUser?.company_id) {
      this.dataService.getUserDetails(parsedUser.id, parsedUser.company_id).subscribe({
        next: (res: any) => {
          const data = res.data || res;
          if (data) {
            // 🖼️ Sync Photo
            const rawPhoto = data.profile_pic || data.photo;
            if (rawPhoto) {
              this.userPhoto = this.getPhotoUrl(rawPhoto);
              localStorage.setItem('user_photo', this.userPhoto);
            }

            // 🏷️ Sync Designation if not already set by assignment
            const freshRoleName = data.role_name || data.role?.name || data.designation;
            if (freshRoleName && freshRoleName !== 'null' && !freshRoleName.toLowerCase().includes('beat')) {
               if (this.userDesignation === 'OFFICER' || !localStorage.getItem('user_role_name')) {
                  this.userDesignation = freshRoleName.toUpperCase();
               }
            }

            // 🔒 Sync Permissions
            let rawPerms = data.permissions;
            let hasCustomPerms = false;
            
            if (rawPerms) {
               if (typeof rawPerms === 'string') {
                 try { rawPerms = JSON.parse(rawPerms); } catch(e) { rawPerms = []; }
               }
               if (Array.isArray(rawPerms) && rawPerms.length > 0) {
                 hasCustomPerms = true;
                 const currentPerms = localStorage.getItem('user_permissions');
                 const newPermsStr = JSON.stringify(rawPerms);
                 if (currentPerms !== newPermsStr) {
                    localStorage.setItem('user_permissions', newPermsStr);
                    console.log("🔒 [SIDEBAR SYNC] Permissions Changed! Triggering UI Update.");
                    this.dataService.permissionsUpdated$.next();
                 }
               }
            }
            
            // 🛡️ Fallback: If no custom permissions, sync from base role
            if (!hasCustomPerms && data.role_id && !localStorage.getItem('user_custom_role_id')) {
                console.log(`⚠️ User has no explicit permissions, fetching from base role_id: ${data.role_id}`);
                this.syncFromRoleList(data.role_id);
            }
            this.cdr.detectChanges();
          }
        }
      });
    }
    this.cdr.detectChanges();
  }

  syncFromRoleList(rId: any) {
    const companyId = localStorage.getItem('company_id');
    this.dataService.listV2Roles(companyId).subscribe({
      next: (res: any) => {
        const roles = res?.data || res || [];
        const myRole = roles.find((r: any) => String(r.id || r.role_id) === String(rId));
        if (myRole && myRole.permissions) {
          let perms = myRole.permissions;
          
          // 🔥 CRITICAL: Agar perms string hain toh parse karein, double-stringify se bachein
          if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { perms = []; }
          }
          
          if (Array.isArray(perms)) {
            localStorage.setItem('user_permissions', JSON.stringify(perms));
            console.log("🔄 [FALLBACK SYNC] Parsed & Saved Permissions Array:", perms.length);
            this.dataService.permissionsUpdated$.next();
            this.cdr.detectChanges();
          }
        }
      }
    });
  }

  initializeApp() {
    const token = localStorage.getItem('api_token');
    const role = localStorage.getItem('user_role');
    const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';

    if (token) {
      if (role === '1' || role === '2' || role === '7' || isRestrictedAdmin) {
        this.navCtrl.navigateRoot('/admin');
      } else {
        this.navCtrl.navigateRoot('/home');
      }
    }

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, async () => {
        if (await this.menu.isOpen()) { await this.menu.close(); return; }
        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) { await actionSheet.dismiss(); return; }
        const modal = await this.modalCtrl.getTop();
        if (modal) { await modal.dismiss(); return; }
        if (this.currentPage === 'settings') { this.currentPage = 'home'; this.cdr.detectChanges(); return; }
        (navigator as any)['app'].exitApp();
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
    const colors: any = { 'A': '#f87171', 'B': '#fb923c', 'S': '#10b981' };
    return colors[firstLetter] || '#10b981';
  }

  async goToPage(path: string) {
    this.menu.close();
    if (path === 'settings') { this.currentPage = 'settings'; this.loadUserData(); }
    else if (path === 'home') {
      this.currentPage = 'home';
      const roleId = localStorage.getItem('user_role');
      const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';
      if (roleId === '1' || roleId === '2' || roleId === '7' || isRestrictedAdmin) this.navCtrl.navigateRoot('/admin');
      else this.navCtrl.navigateRoot('/home');
    } else {
      this.currentPage = 'home';
      this.navCtrl.navigateForward(`/${path}`).catch(err => console.error(err));
    }
    this.cdr.detectChanges();
  }

  closeSettings() {
    this.currentPage = 'home';
    this.cdr.detectChanges();
  }

  toggleEdit() { this.isEditMode = !this.isEditMode; this.cdr.detectChanges(); }

  changeProfilePicture() {
    console.log("Opening camera logic...");
    // Future: Add Capacitor Camera logic here
  }

  onDragStart(event: any) {
    if (this.isSubmitting || !this.isEditMode) return;
    const container = document.querySelector('.slider-track');
    if (container) this.maxSlide = container.clientWidth - 64;
    if (event.touches?.length > 0) this.startX = event.touches[0].clientX - this.currentTranslateX;
  }

  onDragMove(event: any) {
    if (this.isSubmitting || !this.isEditMode || !event.touches?.length) return;
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
      this.submitData();
    } else {
      this.currentTranslateX = 0;
      this.textOpacity = 1;
    }
    this.cdr.detectChanges();
  }

  async submitData() {
    this.isSubmitting = true;
    setTimeout(async () => {
      localStorage.setItem('ranger_username', this.rangerName);
      localStorage.setItem('ranger_phone', this.rangerPhone);
      this.isSubmitting = false;
      this.isEditMode = false;
      const toast = await this.toastController.create({ message: 'Profile Updated!', duration: 2000, color: 'success' });
      toast.present();
      this.cdr.detectChanges();
    }, 2000);
  }

  async toggleLanguageModal(show: boolean) {
    if (show) { await this.menu.close(); setTimeout(() => { this.showLanguageModal = true; this.cdr.detectChanges(); }, 100); }
    else { this.showLanguageModal = false; this.cdr.detectChanges(); }
  }

  confirmLanguage() {
    let langCode = 'en';
    if (this.selectedLanguage === 'Hindi') langCode = 'hi';
    else if (this.selectedLanguage === 'Marathi') langCode = 'mr';
    
    this.translate.use(langCode);
    localStorage.setItem('app_language_code', langCode);
    this.toggleLanguageModal(false);
  }

  initLanguage() {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    this.translate.use(savedLang);
  }

  async logout() { await this.menu.close(); this.showLogoutConfirm = true; this.cdr.detectChanges(); }

  toggleLogoutConfirm(show: boolean) { this.showLogoutConfirm = show; this.cdr.detectChanges(); }

  async performLogout() {
    this.showLogoutConfirm = false;
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

  closeViewer() { this.photoViewer.close(); }
  downloadViewerImage() { if (this.viewerImageUrl) this.photoViewer.download(this.viewerImageUrl); }
  toggleViewerZoom(event: any) {
    event.stopPropagation();
    this.viewerZoom = this.viewerZoom >= 3 ? 1 : this.viewerZoom + 0.5;
    this.cdr.detectChanges();
  }

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null') return '';
    let url = typeof photoPath === 'string' ? photoPath.trim() : photoPath.url || photoPath.path || '';
    if (!url || url.length < 5) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `https://fms.pugarch.in/public/${url.replace(/^\/+/, '')}`;
  }
}