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
    this.showAllSidebarKeys();
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
    }
  }

  isFeatureEnabled(feature: string): boolean {
    const roleId = localStorage.getItem('user_role');
    const userRoleStr = (this.userRole || '').toLowerCase();
    
    // 🔥 Superadmin and Admin always bypass feature restrictions
    if (roleId === '1' || roleId === '2' || roleId === '7' || userRoleStr === 'superadmin' || userRoleStr === 'admin') {
      return true;
    }

    const permsStr = localStorage.getItem('user_permissions');
    const featuresStr = localStorage.getItem('user_features');
    
    if (!permsStr && !featuresStr) {
      // Fallback: If no permissions or features data is found, show everything for safety
      return true;
    }

    try {
      let perms: any[] = [];
      if (permsStr) perms = JSON.parse(permsStr);
      
      // If no perms found, try parsing the features array from login response
      if (perms.length === 0 && featuresStr) {
        const features = JSON.parse(featuresStr);
        return features.some((f: any) => 
          (f.module_key === feature || f.name?.toLowerCase().includes(feature.toLowerCase()) || String(f).toLowerCase().includes(feature.toLowerCase()))
        );
      }
      
      // 🔥 ALIAS MAPPING: Frontend Key → Sir's Backend Module Names (STRICT)
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
      
      const keyToCheck = feature.toLowerCase();
      const aliases = (aliasMap[keyToCheck] || [keyToCheck]).map((a: string) => a.toLowerCase());
      
      // Check if any permission string contains any of our aliases
      return perms.some((p: any) => {
        const pStr = String(p.module_key || p.name || p).toLowerCase();
        return aliases.some((alias: string) => pStr.includes(alias) || alias.includes(pStr));
      });
    } catch (e) {
      return false;
    }
  }

  showAllSidebarKeys() {
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
    // We don't necessarily want to redirect to login here if it's the app boot, 
    // but for this specific flow we need the role.
    if (!token) return; 
  } else {
    try {
      parsedUser = JSON.parse(userDataStr);
      rawRole = parsedUser?.role_id?.toString() || rawRole;
    } catch (e) {
      console.error("Error parsing user_data:", e);
    }
  }

  // Final fallback to Ranger
  rawRole = rawRole || '4';
  
  if (rawRole == '1' || rawRole == '2') {
    this.userRole = 'admin';
  } else {
    this.userRole = 'ranger';
  }

  // 🔥 Map Role ID to human-readable Designation
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
    // 🛡️ Filter out entity names
    if (d.includes('beat') || d.includes('node') || d.includes('unit')) {
       this.userDesignation = roleMap[rawRole] || 'OFFICER';
    } else {
       this.userDesignation = d.toUpperCase();
    }
  } else {
    this.userDesignation = 'OFFICER';
  }

  // 🔥 INSTANT FALLBACK: Use saved role name from signup/add-user
  const savedRoleName = localStorage.getItem('user_role_name');
  if (savedRoleName && savedRoleName !== 'null' && savedRoleName.trim() !== '' && !savedRoleName.toLowerCase().includes('beat')) {
    this.userDesignation = savedRoleName.toUpperCase();
  }

  console.log("Mapped Role for HTML:", this.userRole, "Designation:", this.userDesignation);
  
  // 🔥 FULL LOCALSTORAGE DUMP — LOGIN KE BAAD
  console.log("%c═══════════════════════════════════════════════", "color: #00ff00; font-weight: bold;");
  console.log("%c💾 [LOGIN] ALL LOCALSTORAGE VALUES:", "color: #00ff00; font-weight: bold; font-size: 14px;");
  console.log("   🔑 api_token:", localStorage.getItem('api_token')?.substring(0, 20) + '...');
  console.log("   👤 user_role:", localStorage.getItem('user_role'));
  console.log("   🏷️ user_role_name:", localStorage.getItem('user_role_name'));
  console.log("   🎭 user_custom_role_id:", localStorage.getItem('user_custom_role_id'));
  console.log("   🔒 user_permissions:", localStorage.getItem('user_permissions'));
  console.log("   🌐 user_features:", localStorage.getItem('user_features')?.substring(0, 100) + '...');
  console.log("   📍 user_entity_id:", localStorage.getItem('user_entity_id'));
  console.log("   🏠 user_site_id:", localStorage.getItem('user_site_id'));
  console.log("   📌 user_site_name:", localStorage.getItem('user_site_name'));
  console.log("   🏢 company_name:", localStorage.getItem('company_name'));
  console.log("%c═══════════════════════════════════════════════", "color: #00ff00; font-weight: bold;");
  
  // 🔥 FETCH DYNAMIC ROLE FROM ASSIGNMENTS API
  const rangerId = localStorage.getItem('ranger_id') || localStorage.getItem('user_id') || (parsedUser ? parsedUser.id : null);
  console.log("🔍 [ASSIGNMENT] Checking rangerId:", rangerId);
  if (rangerId) {
    console.log("📡 [ASSIGNMENT] Calling getUserAssignments for ID:", rangerId);
    this.dataService.getUserAssignments(rangerId).subscribe({
      next: (res: any) => {
        console.log("📥 [ASSIGNMENT] Raw Response:", res);
        const assignments = res?.data || res || [];
        if (Array.isArray(assignments) && assignments.length > 0) {
          const activeAssign = assignments[0];
          console.log("✅ [ASSIGNMENT] Active Assignment Found:", activeAssign);
          
          // 🔥 SYNC PERMISSIONS from Custom Array (V2) or Role Object
          const customPerms = activeAssign.permissions?.custom || activeAssign.role?.permissions;
          if (customPerms) {
            localStorage.setItem('user_permissions', JSON.stringify(customPerms));
            console.log("🔒 [ASSIGNMENT] Permissions synced:", customPerms);
          }

          // 🔥 SAVE ENTITY/SITE from Assignment
          const entityId = activeAssign.entity_id || activeAssign.entity?.id;
          const entityName = activeAssign.entity_name || activeAssign.entity?.name;
          if (entityId) {
            localStorage.setItem('user_entity_id', String(entityId));
            localStorage.setItem('user_site_id', String(entityId));
          }
          if (entityName) {
            localStorage.setItem('user_site_name', entityName);
          }

          // 🔥 DATA EXTRACTION for Sidebar
          const dynamicRole = activeAssign.role?.name || activeAssign.role_name || parsedUser.role_name || parsedUser.designation || '';
          const dynamicRoleId = activeAssign.role_id || activeAssign.role?.id;
          const isLocationName = dynamicRole.toUpperCase().includes('BEAT') || dynamicRole.toUpperCase().includes('RANGE');

          // Safeguard: Never overwrite Superadmin (1) or Admin (2) roles
          const baseRole = localStorage.getItem('user_role') || (parsedUser ? parsedUser.role_id : null);
          const isSuperAdminOrAdmin = baseRole == '1' || baseRole == '2';

          // 🔥 MATCH ROLE BY PERMISSIONS (since assignment returns role:null)
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
                  console.log("🏷️ [MATCH] Role found by permissions:", roleName, "ID:", matchedRole.id);
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
          } else if (activeAssign.entity_name || activeAssign.entity?.name) {
            this.userDesignation = (activeAssign.entity_name || activeAssign.entity?.name).toUpperCase();
          }
          
          // Store Node assignment names for UI display
          if (activeAssign.entity_name) {
            const layerId = String(activeAssign.entity?.layer_id || activeAssign.layer_id || '');
            if (layerId === '1' || activeAssign.entity_name.toLowerCase().includes('range')) {
              this.userRange = activeAssign.entity_name;
            } else {
              this.userBeat = activeAssign.entity_name;
            }
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        if (err.status !== 0) console.warn("Failed to fetch dynamic role", err.status);
      }
    });
  }

  // 🔥 NEW: Fallback to fetch base role permissions if they don't have an explicit node assignment
  const currentRoleId = localStorage.getItem('user_role') || (parsedUser ? parsedUser.role_id : null);
  if (currentRoleId && currentRoleId !== '1' && currentRoleId !== '2') {
    this.dataService.getRoleIdList().subscribe({
      next: (res: any) => {
        const roles = res?.data || res || [];
        const myRole = roles.find((r: any) => String(r.id) === String(currentRoleId));
        
        // If we found the role and they haven't gotten permissions from an assignment yet
        if (myRole && myRole.permissions) {
          const existingPerms = localStorage.getItem('user_permissions');
          if (!existingPerms || existingPerms === '[]') {
            console.log(`🛡️ Falling back to base role permissions for Role ID: ${currentRoleId}`);
            localStorage.setItem('user_permissions', JSON.stringify(myRole.permissions));
            this.cdr.detectChanges(); // Refresh sidebar immediately
          }
        }
      }
    });
  }
  
  // Try implicit keys first, then fallback to user_data object
  this.rangerName = localStorage.getItem('ranger_username') || '';
  this.rangerPhone = localStorage.getItem('ranger_phone') || '';
  
  if (parsedUser) {
    // Load from localStorage cache immediately (instant display)
    this.companyName = localStorage.getItem('company_name') 
      || parsedUser.company_name 
      || (parsedUser.company ? parsedUser.company.name : '') 
      || parsedUser.client_name || '';
    
    // 🔥 FIX: Load photo immediately from cache with multiple fallbacks for new users
    this.userPhoto = localStorage.getItem('user_photo') 
      || localStorage.getItem(`cached_photo_id_${parsedUser.id}`)
      || localStorage.getItem(`cached_photo_${this.rangerPhone}`)
      || '';
    
    // 🔥 ALWAYS fetch latest DB data to sync with local storage (Phone/Password change sync)
    if (parsedUser.id && parsedUser.company_id) {
      console.log("🟢 Step 3: Fetching latest profile data silently from backend (/getUserDetails)...");
      this.dataService.getUserDetails(parsedUser.id, parsedUser.company_id).subscribe({
        next: (res: any) => {
          if (res.status === 'success' || res.status === 'SUCCESS' || res.data) {
            const data = res.data || res;
            console.log("DEBUG: Raw Profile Data from API:", data);
            // Sync all vital details from DB to LocalStorage
            parsedUser.name = data.name || parsedUser.name;
            parsedUser.phone = data.contact || data.mobile || data.phone || parsedUser.phone;
            
            // Company name — try multiple keys from user details response
            const freshCompany = data.company_name 
              || (data.company ? data.company.name : '') 
              || data.client_name 
              || parsedUser.company_name 
              || (parsedUser.company ? parsedUser.company.name : '') 
              || parsedUser.client_name
              || localStorage.getItem('company_name') || '';
            parsedUser.company_name = freshCompany;
            
            if (freshCompany) {
              this.companyName = freshCompany;
              localStorage.setItem('company_name', freshCompany);
            } else if (parsedUser.company_id) {
              // Company name not found anywhere — fetch from separate API
              this.dataService.getCompanyDetails(parsedUser.company_id).subscribe({
                next: (cRes: any) => {
                  // getChatUsers returns list of users — extract company name from first user
                  const users = cRes?.data || cRes?.users || (Array.isArray(cRes) ? cRes : []);
                  let cName = '';
                  
                  if (Array.isArray(users) && users.length > 0) {
                    const firstUser = users[0];
                    cName = firstUser.company_name 
                      || (firstUser.company ? firstUser.company.name : '')
                      || firstUser.client_name || '';
                  }
                  
                  // Fallback to top-level fields if array extract failed
                  if (!cName) {
                    cName = cRes?.company_name || cRes?.name || '';
                  }

                  if (cName) {
                    this.companyName = cName;
                    localStorage.setItem('company_name', cName);
                    this.cdr.detectChanges();
                  } else {
                    this.companyName = localStorage.getItem('company_name') || `Company #${parsedUser.company_id}`;
                  }
                },
                error: () => {
                  this.companyName = localStorage.getItem('company_name') || `Company #${parsedUser.company_id}`;
                }
              });
            }

            // 🔥 SYNC SITE_ID if missing
            if (!parsedUser.site_id && data.site_id) {
              parsedUser.site_id = data.site_id;
              localStorage.setItem('user_data', JSON.stringify(parsedUser));
            }

            // 🔥 PRIORITIZE ROLE NAME from Assignment or Role Object
            if (!(this as any).hasDynamicRole) {
              let freshRole = data.role?.name || data.role_name || data.designation || parsedUser.role_name || '';
              const rId = Number(data.role_id || parsedUser.role_id);
              
              // 🛡️ ROLE PROTECTION: If designation is just a beat/node name, fallback to standard role name
              if (rId === 3 && (!freshRole || freshRole.toLowerCase().includes('beat') || freshRole.toLowerCase().includes('unit'))) {
                freshRole = 'FOREST GUARD';
              } else if (rId === 4) {
                freshRole = 'SUPERVISOR';
              } else if (rId === 2 || rId === 7) {
                freshRole = 'ADMIN';
              } else if (rId === 1) {
                freshRole = 'SUPER ADMIN';
              }

              if (freshRole) {
                this.userDesignation = freshRole.toUpperCase();
                parsedUser.role_name = freshRole;
              }
            }
            
            // 🖼️ SYNC PROFILE PHOTO — only overwrite if API returns a REAL photo
            const rawPhoto = data.profile_pic || data.photo || data.image || data.profile_image || data.avatar || data.profilePic || data.user_photo;
            const faceId = data.personIdFaceRecog || 'NOT GENERATED';

            // 🔥 SYNC PERMISSIONS if backend returns them
            if (data.permissions) {
              const perms = Array.isArray(data.permissions) ? data.permissions : JSON.parse(data.permissions || '[]');
              localStorage.setItem('user_permissions', JSON.stringify(perms));
              console.log("🔒 [SYNC] Permissions updated from DB:", perms);
            }

            if (rawPhoto && rawPhoto !== 'null' && rawPhoto !== 'undefined' && String(rawPhoto).length > 5) {
              console.log("✅ [DATABASE CHECK] Profile Pic exists in DB:", rawPhoto);
              console.log("🆔 [DATABASE CHECK] Face ID Status:", faceId);
              const resolvedUrl = this.getPhotoUrl(rawPhoto);
              this.userPhoto = resolvedUrl;
              localStorage.setItem('user_photo', resolvedUrl);
            } else {
              console.warn("❌ [DATABASE CHECK] Profile Pic is NULL in database!");
              console.log("🆔 [DATABASE CHECK] Face ID Status:", faceId);
            }
            
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          // Silent failure for timeouts or network errors
          if (err.status !== 0) console.error("Profile sync failed. Error Code:", err.status);
          
          // On error, try to show company from stored data
          if (!this.companyName && parsedUser) {
            this.companyName = parsedUser.company_name 
              || (parsedUser.company ? parsedUser.company.name : '') 
              || parsedUser.client_name 
              || `Company #${parsedUser.company_id}`;
            this.cdr.detectChanges();
          }
        }
      });
    } else if (parsedUser.company_id) {
      // No getUserDetails call possible, use what we have
      this.companyName = parsedUser.company_name 
        || (parsedUser.company ? parsedUser.company.name : '') 
        || parsedUser.client_name 
        || `Company #${parsedUser.company_id}`;
    }
  }
  
  if (!this.rangerName || !this.rangerPhone) {
    if (parsedUser) {
      this.rangerName = this.rangerName || parsedUser.name || 'User';
      this.rangerPhone = this.rangerPhone || parsedUser.phone || parsedUser.contact || '';
    }
  }

  // Final fallback
  this.rangerName = this.rangerName || 'User';

  // Load photo from localStorage FIRST (stable source)
  const storedPhoto = localStorage.getItem('user_photo') || '';
  this.userPhoto = storedPhoto;

  this.rangerDivision = localStorage.getItem('ranger_division') || 'Washim Division 4.2';

  // Database se aane wala value 
  const dbDivision = localStorage.getItem('ranger_division');
  if (dbDivision && dbDivision !== 'undefined') {
    this.rangerDivision = dbDivision;
  } else {
    this.rangerDivision = this.userRole === '2' ? 'COMPANY ADMIN' : 'RANGER UNIT';
  }

  this.cdr.detectChanges();
}
  initializeApp() {
    document.body.classList.toggle('dark', false);

    // 🚀 NEW: Persistent Auto-Login Check
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
    if (event.touches && event.touches.length > 0) {
      this.startX = event.touches[0].clientX - this.currentTranslateX;
    }
  }

  onDragMove(event: any) {
    if (this.isSubmitting || !this.isEditMode || !event.touches || event.touches.length === 0) return;

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
    await this.menu.close(); // Pehle menu close karein taki background dikhe
    this.toggleLogoutConfirm(true);
  }

  toggleLogoutConfirm(show: boolean) {
    this.showLogoutConfirm = show;
    this.cdr.detectChanges();
  }

  async performLogout() {
    console.log("🟠 User confirmed manual logout...");
    this.showLogoutConfirm = false;
    await this.menu.close();
    const lang = localStorage.getItem('app_language_code');
    
    console.log("🟠 Clearing all sensitive data from localStorage...");
    localStorage.clear();
    
    if (lang) {
      console.log("🟠 Preserving user language preference:", lang);
      localStorage.setItem('app_language_code', lang);
    }
    
    console.log("🟠 Memory wiped successfully. Redirecting to /login...");
    this.navCtrl.navigateRoot('/login');
    this.cdr.detectChanges();
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

  getPhotoUrl(photoPath: any): string {
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') return '';
    
    let url = '';
    if (typeof photoPath === 'string') {
      url = photoPath.trim();
      if (url.startsWith('[') || url.startsWith('"{')) {
        try {
          const parsed = JSON.parse(url.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            url = parsed[0].photo || parsed[0].url || parsed[0].path || parsed[0] || '';
          } else if (typeof parsed === 'object' && parsed !== null) {
            url = parsed.photo || parsed.url || parsed.path || '';
          }
        } catch (e) {
          console.warn('Failed to parse photo JSON:', url);
        }
      }
    } else if (typeof photoPath === 'object' && photoPath !== null) {
      url = photoPath.photo || photoPath.url || photoPath.path || '';
    }

    if (!url || typeof url !== 'string' || url.length < 5) return '';

    if (url.includes('fms.pugarch.in/profilepics/') && !url.includes('/public/')) {
        url = url.replace('fms.pugarch.in/profilepics/', 'fms.pugarch.in/public/profilepics/');
    }

    if (url.startsWith('http')) return url;
    if (url.startsWith('data:')) return url;
    
    const cleaned = url.replace(/^\/+/, '');
    if (cleaned.includes('fms.pugarch.in')) {
      return `https://${cleaned.replace('https://', '').replace('http://', '')}`;
    }
    if (cleaned.includes('/')) {
      return `https://fms.pugarch.in/public/${cleaned}`;
    }
    return `https://fms.pugarch.in/public/profilepics/${cleaned}`;
  }
}