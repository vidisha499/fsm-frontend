import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: false
})
export class ReportsPage implements OnInit {
  isModalOpen = false;
  activeReport = '';
  selectedClient = 'all'; 
  startDate: string = new Date().toISOString();
  endDate: string = new Date().toISOString();
  maxDate: string = new Date().toISOString();
  userRole: string = ''; 
  isPatrolOpen: boolean = false;
  activePatrolCategory: string | null = null;
  isAttendanceOpen: boolean = false;
  isIncidenceOpen: boolean = false;
  isTourOpen: boolean = false;
  isVisitorOpen: boolean = false;
  isAdminOpen: boolean = false;
  isGenerating = false;
  
  // Dynamic V2 Hierarchy State
  layers: any[] = [];
  hierarchySelections: any[] = []; // Stores selected entity for each layer
  layerEntities: { [key: number]: any[] } = {}; // Stores entities for each layer_id
  
  // Hierarchical Filters
  selectedRange = 'all';
  selectedBeat = 'all';
  selectedEmployee = 'all';
  selectedSupervisor = 'all';

  allRanges: string[] = [];
  allBeats: any[] = [];
  allEmployees: any[] = [];
  allSupervisors: any[] = [];
  allAdmins: any[] = [];
  
  selectedAdmin = 'all';
  
  displayBeats: any[] = [];
  displayEmployees: any[] = [];
  
  sites: any[] = [];
  
  // Patrol Specific Filters (Dynamic)
  patrolType = 'all';
  patrolMethod = 'all';
  logType = 'all';
  
  patrolMethods: any[] = [];
  patrolTypes: any[] = [];
  logCategories: any[] = [];
  
  // Attendance Specific
  attendanceStatus = 'all';
  
  // Performance Specific
  performanceCategory = 'all';
  performanceMetric = 'all';

  reportEndpointMap: { [key: string]: string } = {
    // Attendance
    'Employee Attendance': 'userAttendanceReport',
    'Employee Attendance with Site/Beat': 'siteWiseGuardReport',
    'On-site/beat Attendance': 'siteWiseGuardReport',
    'Working Summary': 'userAttendanceReport',
    'Forgot to Exit': 'forgotExitReport',
    'Absent Report': 'absentAttendanceReport',
    'Performance Report': 'userPerformanceReport',
    'Emergency Attendance': 'emergencyAttendanceReport',
    'Supervisor Attendance': 'userAttendanceReport',
    
    // Tour
    'Daily Tour Report': 'dailyTourReport',
    'User Tour Report': 'userTourReport',
    'Tour Summary Report': 'tourSummaryReport',
    'Tour Diary': 'tourDiaryReport',
    'Advance Tour Diary': 'tourDiaryAdvanceReport',

    // Visitor
    'Visitor Daily Report': 'visitorDailyReport',
    'Visitor Summary Report': 'visitorSummaryReport',

    // Incidence
    'incidence_report': 'singleDayIncidenceReport',
    'incidence_summary': 'incidenceSummaryReport',
    'Patrol Report': 'reports/patrol',
    'Field Visit Report': 'reports/field-visit',

    // Admin/Guard
    'Company Performance': 'companyWiseGuardReport',
    'Site Performance': 'siteWiseGuardReport',
    'Supervisor Performance': 'supervisorWiseGuardReport',
    'Jal Shakti Report': 'getJalShaktiReport',
    
    // Patrol Sub-options
    'Self': 'reports/patrol',
    'Supervisor': 'reports/patrol',
    'Admin': 'reports/patrol',
    'Patrol List': 'reports/patrol'
  };

  attendanceOptions = [
    'Employee Attendance',
    'Employee Attendance with Site/Beat',
    'On-site/beat Attendance',
    'Working Summary',
    'Forgot to Exit',
    'Supervisor Attendance'
  ];

  patrolOptions = [
    'Self',
    'Supervisor',
    'Admin',
    'Patrol List'
  ];

  selfOptions = [
    'Daily Patrol',
    'Monthly Summary',
    'Performance'
  ];

  constructor(
    private navCtrl: NavController, 
    private router: Router, 
    private dataService: DataService,
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Robust Company ID retrieval like Admin Page
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    let companyId = userData ? (userData.company_id || userData.companyId) : localStorage.getItem('company_id');
    
    // Fallback if still not found
    if (!companyId) companyId = '1';
    
    // Persist if found from user_data
    localStorage.setItem('company_id', companyId.toString());

    let rawRole = localStorage.getItem('user_role');
    if (!rawRole && userData) {
      rawRole = userData.role_id ? userData.role_id.toString() : null;
    }
    rawRole = rawRole || '4';
    
    if (rawRole === '1' || rawRole === '2') {
      this.userRole = 'admin';
    } else {
      this.userRole = 'ranger';
    }

    this.resetFilters();
    this.loadHierarchy();
    this.fetchUsers();
    this.fetchPatrolMetadata();
  }

  loadHierarchy() {
    const companyId = localStorage.getItem('company_id') || '1';
    console.log('📡 [Reports] Syncing V2 Hierarchy layers for Company:', companyId);

    this.dataService.listV2Layers().subscribe({
      next: (layerRes: any) => {
        const rawLayers = layerRes?.data || layerRes || [];
        
        if (rawLayers.length > 0) {
          this.layers = rawLayers
            .sort((a: any, b: any) => (Number(a.rank || a.id)) - (Number(b.rank || b.id)))
            .map((l: any) => ({
              id: Number(l.id),
              name: l.name || l.layer_name || l.label
            }));

          console.log("🎯 [Reports] V2 Layers Parsed:", this.layers);

          // Initialize hierarchy selections array
          this.hierarchySelections = new Array(this.layers.length).fill(null);

          // Load initial entities for the first layer
          if (this.layers.length > 0) {
            const firstLayer = this.layers[0];
            this.dataService.listV2Entities(firstLayer.id, null).subscribe({
              next: (entRes: any) => {
                const nodes = entRes?.data || entRes || [];
                this.layerEntities[firstLayer.id] = Array.isArray(nodes) ? nodes : [];
                this.cdr.detectChanges();
              }
            });
          }
        } else {
          console.warn("⚠️ [Reports] No V2 Layers returned. Falling back to old hierarchy.");
          this.loadOldHierarchy();
        }
      },
      error: (err) => {
        console.error("❌ [Reports] listV2Layers API failed. Falling back to old hierarchy:", err);
        this.loadOldHierarchy();
      }
    });
  }

  loadOldHierarchy() {
    const companyId = localStorage.getItem('company_id') || '1';
    const rangeSet = new Set<string>();
    const beatArray: any[] = [];

    this.dataService.getSitesList(companyId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        this.sites = Array.isArray(data) ? data : [];
        this.sites.forEach((s: any) => {
          const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
          const bName = s.site_name || s.name || s.beat_name || s.beat || s.site;
          const bId = s.id || s.site_id || s.beat_id;
          
          if (rName) rangeSet.add(rName);
          if (bName) beatArray.push({ id: bId, name: bName, parentName: rName });
        });

        this.finalizeReportsHierarchy(rangeSet, beatArray);
      },
      error: (err) => {
        console.error('❌ [Reports] Error fetching sites fallback:', err);
        this.finalizeReportsHierarchy(rangeSet, beatArray);
      }
    });
  }

  onLayerChange(layerIndex: number) {
    const selectedEntityId = this.hierarchySelections[layerIndex];
    console.log(`🔄 [Reports] Layer ${layerIndex} changed to:`, selectedEntityId);
    
    // 1. Clear all subsequent selections
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // 2. Load next layer entities from V2 API
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      
      this.dataService.listV2Entities(nextLayer.id, selectedEntityId).subscribe({
        next: (res: any) => {
          const nodes = res?.data || res || [];
          this.layerEntities[nextLayer.id] = Array.isArray(nodes) ? nodes : [];
          console.log(`🎯 [Reports] Populated ${this.layerEntities[nextLayer.id].length} entities for Layer ID ${nextLayer.id}`);
          
          this.filterEmployeesByDeepestSelection();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("❌ [Reports] Failed to load entities:", err);
          this.filterEmployeesByDeepestSelection();
        }
      });
    } else {
      this.filterEmployeesByDeepestSelection();
    }
  }

  shouldShowLayer(layerIndex: number): boolean {
    if (layerIndex === 0) return true;
    return !!this.hierarchySelections[layerIndex - 1];
  }

  filterEmployeesByDeepestSelection() {
    let deepestEntityId: any = null;
    let deepestEntityName = '';
    
    for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
        deepestEntityId = this.hierarchySelections[i];
        const layerId = this.layers[i].id;
        const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(deepestEntityId));
        if (ent) deepestEntityName = (ent.name || '').trim().toLowerCase();
        break;
      }
    }

    console.log("🔍 [Reports] Filtering employees for deepest entity ID:", deepestEntityId, "Name:", deepestEntityName);
    this.selectedEmployee = 'all';

    if (!deepestEntityId) {
      this.displayEmployees = [...this.allEmployees];
      this.cdr.detectChanges();
      return;
    }

    const fallbackFilter = () => {
      this.displayEmployees = this.allEmployees.filter((e: any) => {
        // Match by ID
        const eSiteId = String(e.site_id || e.siteId || e.beat_id || e.entity_id || '');
        if (eSiteId === String(deepestEntityId)) return true;
        
        // Match by Name (since legacy/Sir's backend often returns names in getAssignableUsers)
        if (deepestEntityName && deepestEntityName !== 'null') {
           const eString = JSON.stringify(e).toLowerCase();
           if (eString.includes(deepestEntityName)) return true;
        }
        return false;
      });
      console.log(`⚠️ [Reports] Fallback local filter matched ${this.displayEmployees.length} employees`);
      this.cdr.detectChanges();
    };

    import('rxjs').then(({ forkJoin, of }) => {
      import('rxjs/operators').then(({ catchError }) => {
        forkJoin({
          legacyGuards: this.dataService.getGuardsInSite(deepestEntityId).pipe(catchError(() => of({ data: [] }))),
          v2Guards: this.dataService.getNodeAssignments(deepestEntityId).pipe(catchError(() => of({ data: [] })))
        }).subscribe({
          next: ({ legacyGuards, v2Guards }: any) => {
            const lGuards = legacyGuards?.data || legacyGuards?.guards || (Array.isArray(legacyGuards) ? legacyGuards : []);
            const vGuards = v2Guards?.data || v2Guards?.users || v2Guards?.assignments || (Array.isArray(v2Guards) ? v2Guards : []);
            
            const combined = [...lGuards, ...vGuards];
            
            // Extract the user data properly from assignment wrapper if it exists (e.g. g.user)
            const processedGuards = combined.map((g: any) => {
                const userObj = g.user || g; // v2Guards might wrap in { user: {id, name} }
                return {
                    ...userObj,
                    id: userObj.user_id || userObj.id || userObj.guard_id,
                    name: userObj.user_name || userObj.name || userObj.full_name || 'Guard'
                };
            });
            
            // Deduplicate by ID
            const uniqueGuards: any[] = [];
            const ids = new Set();
            for (const g of processedGuards) {
               if (g.id && !ids.has(String(g.id))) {
                  ids.add(String(g.id));
                  uniqueGuards.push(g);
               }
            }

            console.log(`📥 [Reports] Combined Guards fetched for selected entity ${deepestEntityId}:`, uniqueGuards.length);
            
            if (uniqueGuards.length > 0) {
              this.displayEmployees = uniqueGuards;
              this.cdr.detectChanges();
            } else {
              fallbackFilter();
            }
          },
          error: (err) => {
            console.error('❌ [Reports] Guard Fetch Failure:', err);
            fallbackFilter();
          }
        });
      });
    });
  }

  private mergeOrgEntitiesForReports(rangeSet: Set<string>, beatArray: any[]) {
    // Keep as a fallback no-op method just in case
  }

  private finalizeReportsHierarchy(rangeSet: Set<string>, beatArray: any[]) {
    this.allRanges = Array.from(rangeSet).sort();
    this.allBeats = beatArray;
    this.displayBeats = [...this.allBeats];
    console.log('✅ [Reports] Hierarchy Ready:', this.allRanges.length, 'Ranges,', this.allBeats.length, 'Beats');
  }

  fetchUsers() {
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    let companyId = userData ? (userData.company_id || userData.companyId) : localStorage.getItem('company_id');
    if (!companyId) companyId = '1';

    console.log('📡 [Reports] Fetching Users via getAssignableUsers and listV2Users for Company:', companyId);
    
    // Fetch both legacy users and V2 users concurrently
    import('rxjs').then(({ forkJoin, of }) => {
      import('rxjs/operators').then(({ catchError }) => {
        forkJoin({
          legacy: this.dataService.getAssignableUsers({ company_id: companyId }).pipe(catchError(() => of({ data: [] }))),
          v2: this.dataService.listV2Users(companyId).pipe(catchError(() => of({ data: [] })))
        }).subscribe({
          next: ({ legacy, v2 }: any) => {
            const legacyUsers = legacy?.data || legacy?.users || (Array.isArray(legacy) ? legacy : []);
            const v2Users = v2?.data || v2?.users || (Array.isArray(v2) ? v2 : []);
            
            // Merge users natively, favoring V2 data which contains correct entity_id assignments
            const userMap = new Map();
            legacyUsers.forEach((u: any) => {
              userMap.set(String(u.user_id || u.id), u);
            });
            v2Users.forEach((u: any) => {
              const existing = userMap.get(String(u.user_id || u.id)) || {};
              userMap.set(String(u.user_id || u.id), { ...existing, ...u });
            });
            
            const users = Array.from(userMap.values()).map((u: any) => ({
              ...u,
              id: u.user_id || u.id,
              name: u.user_name || u.name || u.full_name || 'User'
            }));

            console.log('📥 [Reports] Total Users Fetched (Merged):', users.length);
            
            // Detailed Role Analysis for Debugging
            const roleCounts: { [key: string]: number } = {};
            users.forEach((u: any) => {
              const rid = (u.role_id || u.roleId || 'unknown').toString();
              roleCounts[rid] = (roleCounts[rid] || 0) + 1;
            });
            console.log('📊 [Reports] Role Distribution:', roleCounts);

            // 1. ADMINS: Role 7 (Range Officers)
            this.allAdmins = users.filter((u: any) => {
              const rid = (u.role_id || u.roleId || '').toString();
              return rid === '7';
            });

            // 2. SUPERVISORS: Role 2 (Foresters)
            this.allSupervisors = users.filter((u: any) => {
              const rid = (u.role_id || u.roleId || '').toString();
              return rid === '2';
            });
            
            // 3. GUARDS / EMPLOYEES: Include Role 3 and any dynamic roles (Exclude 1, 2, 7)
            this.allEmployees = users.filter((u: any) => {
              const rid = (u.role_id || u.roleId || '').toString();
              return rid !== '1' && rid !== '2' && rid !== '7';
            });
            
            console.log('📥 [Reports] Admins (Role 7 - Range Officers):', this.allAdmins.length);
            console.log('📥 [Reports] Supervisors (Role 2 - Foresters):', this.allSupervisors.length);
            console.log('📥 [Reports] Guards (Role 3 - Forest Guards):', this.allEmployees.length);
            
            this.displayEmployees = [...this.allEmployees];
          },
          error: (err) => console.error('❌ [Reports] Error fetching users:', err)
        });
      });
    });
  }

  onRangeChange() {
    console.log('🔄 [Reports] Range Changed:', this.selectedRange);
    this.selectedBeat = 'all';
    this.selectedEmployee = 'all';
    
    if (this.selectedRange === 'all') {
      this.displayBeats = [...this.allBeats];
    } else {
      this.displayBeats = this.allBeats.filter(b => b.parentName === this.selectedRange);
    }
    
    console.log('🔄 [Reports] Displaying Beats:', this.displayBeats.length);
    this.onBeatChange();
  }

  onBeatChange() {
    console.log('🔄 [Reports] Beat Selection Triggered. Selected ID:', this.selectedBeat);
    this.selectedEmployee = 'all';
    
    // Find the beat object to get its name for comparison
    const beatObj = this.allBeats.find(b => b.id == this.selectedBeat);
    const bName = beatObj ? (beatObj.name || '').trim().toLowerCase() : '';
    const rName = this.selectedRange !== 'all' ? this.selectedRange.trim().toLowerCase() : '';

    if (this.selectedBeat === 'all') {
      if (this.selectedRange === 'all') {
        this.displayEmployees = [...this.allEmployees];
      } else {
        // Filter by range name
        this.displayEmployees = this.allEmployees.filter(e => {
          const eRange = (e.range_name || e.range || e.division || '').trim().toLowerCase();
          return eRange === rName;
        });
      }
    } else {
      console.log('🔄 [Reports] Fetching Guards for Site ID:', this.selectedBeat);
      
      this.dataService.getGuardsInSite(this.selectedBeat).subscribe({
        next: (res: any) => {
          const guards = res?.data || res?.guards || (Array.isArray(res) ? res : []);
          console.log('📥 [Reports] Guards Fetched for Site:', guards.length);
          
          if (guards.length > 0) {
            console.log('📥 [Reports] Sample Guard Object:', JSON.stringify(guards[0]));
            this.displayEmployees = guards.map((g: any) => ({
              ...g,
              id: g.user_id || g.id || g.guard_id,
              name: g.user_name || g.name || g.full_name || 'Guard'
            }));
          } else {
            // Fallback: If site-specific API returns nothing, search in allEmployees
            this.displayEmployees = this.allEmployees.filter(e => {
              const eSiteId = e.site_id || e.siteId || e.beat_id;
              return eSiteId == this.selectedBeat;
            });
            console.warn('⚠️ [Reports] API getGuardsInSite returned 0. Fallback Filter Count:', this.displayEmployees.length);
          }
        },
        error: (err) => {
          console.error('❌ [Reports] getGuardsInSite Failure:', err);
          this.displayEmployees = [];
        }
      });
    }
    
    console.log('🔄 [Reports] Displaying Employees Count:', this.displayEmployees.length);
    if (this.displayEmployees.length === 0 && this.allEmployees.length > 0) {
      console.warn('⚠️ [Reports] No employees matched. First 3 employees raw data:', 
        this.allEmployees.slice(0, 3).map(e => ({ 
          name: e.name, 
          site_id: e.site_id, 
          beat_name: e.beat_name,
          range: e.range_name 
        }))
      );
    }
  }

  fetchPatrolMetadata() {
    // Using static lists from your screenshots to avoid 404 errors
    this.patrolMethods = ['All', 'Routine', 'Special', 'Beat Inspection', 'Joint', 'Other'];
    this.patrolTypes = ['All', 'On Foot', 'By Vehicle', 'By Drone'];
    this.logCategories = []; // 🛡️ Strict: No defaults, only Sir's API data
 
    const companyId = localStorage.getItem('company_id');
    this.dataService.getForestReportConfigs(companyId).subscribe({
      next: (res: any) => {
        console.log('🔍 [Strict Sync] FULL CONFIGS RESPONSE:', res);
        
        // Sir's Laravel API often nests data in res.data or res.data.data
        let configs = [];
        if (res?.data?.data && Array.isArray(res.data.data)) {
          configs = res.data.data;
        } else if (res?.data && Array.isArray(res.data)) {
          configs = res.data;
        } else if (Array.isArray(res)) {
          configs = res;
        } else if (res?.log_types) {
          configs = res.log_types;
        }
        
        if (configs.length > 0) {
          // Extract report_type or title (these are the Log Types Sir refers to)
          const types = configs.map((c: any) => c.report_type || c.title || c.name || c);
          this.logCategories = [...new Set(types)].filter(t => t && typeof t === 'string');
          console.log('📥 [Strict Sync] Log Types Parsed:', this.logCategories);
        } else {
          console.warn('⚠️ [Strict Sync] No configs found in response.');
        }
      },
      error: (err) => console.error('❌ [Strict Sync] reportConfig API failed:', err)
    });
  }

  onOptionSelect(option: string) {
    this.openFilterModal(option);
  }

  toggleSection(section: string) {
    if (section === 'attendance') {
      this.isAttendanceOpen = !this.isAttendanceOpen;
      this.isPatrolOpen = false;
      this.activePatrolCategory = null;
    } else if (section === 'patrol') {
      this.isPatrolOpen = !this.isPatrolOpen;
      this.isAttendanceOpen = false;
      this.activePatrolCategory = null;
    } else {
      this.isAttendanceOpen = false;
      this.isPatrolOpen = false;
      this.activePatrolCategory = null;
    }
  }

  onPatrolCategorySelect(category: string) {
    console.log('👆 [Reports] Category Selected:', category);
    this.onOptionSelect(category);
  }

  goBackToPatrol() {
    this.activePatrolCategory = null;
  }

  resetFilters() {
    this.selectedRange = 'all';
    this.selectedBeat = 'all';
    this.selectedEmployee = 'all';
    this.selectedSupervisor = 'all';
    this.selectedClient = 'all';
    this.displayBeats = [...this.allBeats];
    this.displayEmployees = [...this.allEmployees];
    this.startDate = new Date().toISOString();
    this.endDate = new Date().toISOString();

    // Reset V2 dynamic hierarchy selections
    if (this.layers && this.layers.length > 0) {
      this.hierarchySelections = new Array(this.layers.length).fill(null);
      // Clear dependent sub-layers but retain the first layer's entities
      for (let i = 1; i < this.layers.length; i++) {
        if (this.layers[i] && this.layers[i].id) {
          this.layerEntities[this.layers[i].id] = [];
        }
      }
    }
  }

  openFilterModal(type: string) {
    this.activeReport = type; 
    this.isModalOpen = true;
  }

  generateReport(format: 'pdf' | 'excel') {
    let endpoint = this.reportEndpointMap[this.activeReport] || 'reports/forest-patrol';
    const companyId = this.dataService.getUserCompanyId() || localStorage.getItem('company_id') || '';
    const rangerId = this.dataService.getRangerId() || localStorage.getItem('ranger_id') || '';
    const token = localStorage.getItem('api_token') || '';
    
    const from = this.startDate ? this.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const to = this.endDate ? this.endDate.split('T')[0] : new Date().toISOString().split('T')[0];
 
    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    formData.append('companyId', String(companyId));
    formData.append('companyID', String(companyId)); // Sir's API variation
    formData.append('startDate', from);
    formData.append('endDate', to);
    formData.append('from', from);
    formData.append('to', to);
    formData.append('date_from', from);
    formData.append('date_to', to);
    formData.append('from_date', from);
    formData.append('to_date', to);
    formData.append('format', format);

    // Resolve dynamic V2 hierarchy values for report payload
    let deepestEntityId: any = null;
    let selectedRangeName = '';
    let selectedBeatName = '';
    let selectedBeatId: any = null;

    if (this.layers && this.layers.length > 0) {
      for (let i = 0; i < this.layers.length; i++) {
        const selection = this.hierarchySelections[i];
        if (selection && selection !== 'null') {
          deepestEntityId = selection;
          const layerName = (this.layers[i].name || '').toLowerCase();
          const layerId = this.layers[i].id;
          const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(selection));
          if (ent) {
            if (layerName.includes('range')) {
              selectedRangeName = ent.name;
            } else if (layerName.includes('beat')) {
              selectedBeatName = ent.name;
              selectedBeatId = ent.id;
            }
          }
        }
      }
      
      // Fallbacks if layers are set but specific Range/Beat layers are named differently (e.g. circles, divisions, sections)
      if (deepestEntityId) {
        // Find deepest non-null entity and use it as beat
        for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
          if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
            const layerId = this.layers[i].id;
            const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(this.hierarchySelections[i]));
            if (ent) {
              if (!selectedBeatName) {
                selectedBeatName = ent.name;
                selectedBeatId = ent.id;
              }
              // Parent of deepest becomes range
              if (i > 0 && this.hierarchySelections[i-1]) {
                const pLayerId = this.layers[i-1].id;
                const pEnt = this.layerEntities[pLayerId]?.find(p => String(p.id) === String(this.hierarchySelections[i-1]));
                if (pEnt && !selectedRangeName) {
                  selectedRangeName = pEnt.name;
                }
              }
            }
            break;
          }
        }
      }
    }

    // Fallback to legacy/old hierarchy selections if V2 is empty
    const resolvedRange = selectedRangeName || (this.selectedRange && this.selectedRange !== 'all' ? this.selectedRange : '');
    const resolvedBeatId = selectedBeatId || (this.selectedBeat && this.selectedBeat !== 'all' ? this.selectedBeat : '');
    const resolvedBeatName = selectedBeatName || '';

    if (this.activeReport === 'Supervisor Attendance') {
      const isAll = this.selectedSupervisor === 'all';
      // Switch to list report for "All", keep individual report for specific user
      endpoint = isAll ? 'supervisorWiseGuardReport' : 'userAttendanceReport';

      let sid = isAll ? 'all' : (this.selectedSupervisor || '');
      if (!sid && this.allSupervisors.length > 0) {
        sid = this.allSupervisors[0].id || this.allSupervisors[0].user_id;
      }
      if (!sid) sid = rangerId;
      
      formData.append('supervisor_id', String(sid));
      formData.append('id', String(sid));
      formData.append('user_id', String(sid));
      formData.append('ranger_id', String(sid));
      
      formData.append('range', resolvedRange || this.allRanges[0] || 'General Range');

      const targetBeat = resolvedBeatId || this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
      formData.append('site_id', String(targetBeat));
      formData.append('beat', String(targetBeat));
      formData.append('beat_id', String(targetBeat));
      if (resolvedBeatName) formData.append('beat_name', resolvedBeatName);
      if (deepestEntityId) formData.append('entity_id', String(deepestEntityId));
    } else if (this.activeReport.includes('Admin') && this.activeReport !== 'Admin Monthly Summary' && this.activeReport !== 'Admin Performance') {
      const aid = (this.selectedAdmin && this.selectedAdmin !== 'all') ? this.selectedAdmin : rangerId;
      formData.append('id', String(aid));
      formData.append('user_id', String(aid));
      formData.append('ranger_id', String(aid));
      formData.append('admin_id', String(aid));
      
      formData.append('range', resolvedRange || this.allRanges[0] || 'General Range');

      const targetBeat = resolvedBeatId || this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
      if (targetBeat) {
        formData.append('beat', String(targetBeat));
        formData.append('site_id', String(targetBeat));
        formData.append('beat_id', String(targetBeat));
      }
      if (resolvedBeatName) formData.append('beat_name', resolvedBeatName);
      if (deepestEntityId) formData.append('entity_id', String(deepestEntityId));
    } else {
      // General case for other reports (Incidence handled above)
      // For Patrol reports, we handle this inside the patrol block below to avoid duplicates
      if (!this.activeReport.includes('Patrol') && !this.activeReport.includes('Self') && !this.activeReport.includes('Supervisor') && !this.activeReport.includes('Admin')) {
        const uid = (this.selectedEmployee && this.selectedEmployee !== 'all') ? this.selectedEmployee : rangerId;
        formData.append('id', String(uid));
        formData.append('user_id', String(uid));
        formData.append('ranger_id', String(uid));
      }
      
      formData.append('range', resolvedRange || this.allRanges[0] || 'General Range');

      const targetBeat = resolvedBeatId || this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
      if (targetBeat) {
        formData.append('beat', String(targetBeat));
        formData.append('site_id', String(targetBeat));
        formData.append('beat_id', String(targetBeat));
      }
      if (resolvedBeatName) formData.append('beat_name', resolvedBeatName);
      if (deepestEntityId) formData.append('entity_id', String(deepestEntityId));
    }

    if (this.activeReport.includes('Patrol') || this.activeReport.includes('Self') || this.activeReport.includes('Supervisor') || this.activeReport.includes('Admin')) {
      const tValue = format === 'excel' ? 'xlsx' : format;
      formData.append('type', tValue);
      formData.append('format', tValue);
      formData.append('report_type', 'patrol'); 
      
      // Date variations (Backend might use any of these)
      formData.append('start_date', from);
      formData.append('end_date', to);
      formData.append('date_start', from);
      formData.append('date_end', to);

      // Correctly map to the right variable based on the report category
      let targetUser = '';
      if (this.activeReport.includes('Supervisor')) {
        targetUser = (this.selectedSupervisor && this.selectedSupervisor !== 'all') ? this.selectedSupervisor : '';
      } else if (this.activeReport.includes('Admin')) {
        targetUser = (this.selectedAdmin && this.selectedAdmin !== 'all') ? this.selectedAdmin : '';
      } else if (this.activeReport.includes('Self')) {
        targetUser = rangerId; // Default to self for "Self" reports
      } else {
        targetUser = (this.selectedEmployee && this.selectedEmployee !== 'all') ? this.selectedEmployee : '';
      }

      if (targetUser) {
        formData.append('user_id', String(targetUser));
        formData.append('ranger_id', String(targetUser));
        formData.append('admin_id', String(targetUser));
        formData.append('id', String(targetUser));
      }
      
      const pType = this.patrolType && this.patrolType !== 'all' ? this.patrolType : '';
      if (pType) {
        formData.append('patrol_type', pType);
        formData.append('patrolType', pType);
      }
      
      const pMethod = this.patrolMethod && this.patrolMethod !== 'all' ? this.patrolMethod : '';
      if (pMethod) {
        formData.append('method', pMethod);
        formData.append('patrol_method', pMethod);
      }
      
      if (this.logType && this.logType !== 'all') {
        formData.append('log_type', this.logType);
        formData.append('type_log', this.logType);
        formData.append('category', this.logType);
      }
    }

    if (this.activeReport.includes('Attendance') || this.activeReport.includes('Employee')) {
      if (this.attendanceStatus && this.attendanceStatus !== 'all') formData.append('status', this.attendanceStatus);
    }

    console.log(`🚀 Generating Report: ${this.activeReport} via ${endpoint}`);
    console.log("🚀 URL:", `${this.dataService.getApiUrl()}/${endpoint}`);
    
    // 🔍 DEBUG: Print EVERY key in FormData before sending
    console.log('📦 [FormData Dump] ===== FULL PAYLOAD =====');
    formData.forEach((value, key) => {
      console.log(`📦 ${key} = ${value}`);
    });
    console.log('📦 [FormData Dump] ===== END =====');
    
    this.isGenerating = true;
    this.dataService.downloadReport(endpoint, formData).subscribe({
      next: async (response: any) => {
        this.isGenerating = false;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const resObj = JSON.parse(reader.result as string);
              if (resObj.status === 'SUCCESS' && resObj.fileurl) {
                window.open(resObj.fileurl, '_blank');
                this.isModalOpen = false;
                const successAlert = await this.alertController.create({
                  header: 'Successful',
                  subHeader: 'Report Generated',
                  message: 'Your report has been downloaded successfully.',
                  buttons: ['OK'],
                  mode: 'ios',
                  cssClass: 'premium-alert'
                });
                await successAlert.present();
              } else {
                alert(resObj.message || 'Report generate nahi ho saka.');
              }
            } catch (e) {
              alert('Server response error.');
            }
          };
          reader.readAsText(response.body);
          return;
        }

        const blob = new Blob([response.body], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.isModalOpen = false;
        const successAlert = await this.alertController.create({
          header: 'Successful',
          subHeader: 'Report Downloaded',
          message: 'Your report has been downloaded successfully.',
          buttons: ['OK'],
          mode: 'ios',
          cssClass: 'premium-alert'
        });
        await successAlert.present();
      },
      error: (err) => {
        this.isGenerating = false;
        // 🔍 DEBUG: Show full 422 error response
        console.error('❌ [Report Error] Status:', err.status);
        console.error('❌ [Report Error] Full Response:', err.error);
        
        // Error body is a Blob because responseType is 'blob' - need to read it
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errBody = JSON.parse(reader.result as string);
              console.error('❌ [Report Error] PARSED BODY:', errBody);
              const validationErrors = errBody.errors ? JSON.stringify(errBody.errors, null, 2) : 'No specific field errors';
              
              // Informative Alert for Sir
              const errorSummary = `🚨 REPORT FAIL (FOR BACKEND TEAM)\n\n` +
                                   `URL: ${endpoint}\n` +
                                   `Status: ${err.status}\n` +
                                   `Message: ${errBody.message || 'Validation Failed'}\n` +
                                   `Details: ${validationErrors}\n\n` +
                                   `Please share this screenshot with the Backend Developer.`;
              
              alert(errorSummary);
              
              console.log('%c SUMMARY FOR BACKEND TEAM ', 'background: #ff0000; color: #fff; font-weight: bold;');
              console.log('Endpoint:', endpoint);
              console.log('Error Response:', errBody);
            } catch(e) {
              console.error('❌ [Report Error] Raw text:', reader.result);
              alert(`API Error: ${reader.result}`);
            }
          };
          reader.readAsText(err.error);
        } else {
          console.error('❌ [Report Error] Message:', err.error?.message);
          alert(`API Error: ${err.error?.message || err.message || 'Unknown error'}`);
        }
      }
    });
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