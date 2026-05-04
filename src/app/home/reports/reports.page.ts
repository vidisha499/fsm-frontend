import { Component, OnInit } from '@angular/core';
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
    private loadingCtrl: LoadingController
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
    console.log('📡 [Reports] Fetching Sites for Company:', companyId);
    
    this.dataService.getSitesList(companyId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        this.sites = Array.isArray(data) ? data : [];
        console.log('📥 [Reports] Sites Fetched:', this.sites.length);
        
        if (this.sites.length > 0) {
          console.log('📥 [Reports] Sample Site:', this.sites[0]);
        }

        const rangeSet = new Set<string>();
        const beatArray: any[] = [];
        
        this.sites.forEach((s: any) => {
          // Alignment with Sir's production keys
          const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
          const bName = s.site_name || s.name || s.beat_name || s.beat || s.site;
          const bId = s.id || s.site_id || s.beat_id;
          
          if (rName) rangeSet.add(rName);
          if (bName) {
            beatArray.push({
              id: bId,
              name: bName,
              parentName: rName
            });
          }
        });

        this.allRanges = Array.from(rangeSet).sort();
        this.allBeats = beatArray;
        this.displayBeats = [...this.allBeats];
        
        console.log('✅ [Reports] Hierarchy Ready:', this.allRanges.length, 'Ranges,', this.allBeats.length, 'Beats');
      },
      error: (err) => console.error('❌ [Reports] Error fetching sites:', err)
    });
  }

  fetchUsers() {
    const rawData = localStorage.getItem('user_data');
    const userData = rawData ? JSON.parse(rawData) : null;
    let companyId = userData ? (userData.company_id || userData.companyId) : localStorage.getItem('company_id');
    if (!companyId) companyId = '1';

    console.log('📡 [Reports] Fetching Users via getUsers for Company:', companyId);
    
    // Switching to getAssignableUsers as it is confirmed to work without CORS errors
    this.dataService.getAssignableUsers({ company_id: companyId }).subscribe({
      next: (res: any) => {
        const users = (res?.data || res?.users || (Array.isArray(res) ? res : [])).map((u: any) => ({
          ...u,
          id: u.user_id || u.id,
          name: u.user_name || u.name || u.full_name || 'User'
        }));
        
        console.log('📥 [Reports] Total Users Fetched (via Assignable):', users.length);
        
        // Detailed Role Analysis for Debugging
        const roleCounts: { [key: string]: number } = {};
        users.forEach((u: any) => {
          const rid = (u.role_id || u.roleId || 'unknown').toString();
          roleCounts[rid] = (roleCounts[rid] || 0) + 1;
        });
        console.log('📊 [Reports] Role Distribution:', roleCounts);

        // 🔍 FULL USER DUMP - Print every user's name + role for debugging
        console.log('🔍 [Reports] ===== FULL USER ROLE DUMP FROM SIR DB =====');
        users.forEach((u: any, i: number) => {
          console.log(`👤 [${i}] Name: "${u.name}" | role_id: "${u.role_id}" | roleId: "${u.roleId}" | role_name: "${u.role_name || u.roleName || 'N/A'}" | code_name: "${u.code_name || 'N/A'}"`);
        });
        console.log('🔍 [Reports] ===== END DUMP =====');

        if (users.length > 0) {
          console.log('📥 [Reports] Sample User Structure:', JSON.stringify(users[0]));
        }

        // ✅ CORRECT MAPPING FROM SIR's DATABASE:
        // Role 1 = Superadmin (excluded from dropdowns)
        // Role 2 = Forester (Supervisor level)
        // Role 3 = Forest Guard (Employee level)
        // Role 7 = Range Officer (Admin level)

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
        
        // 3. GUARDS / EMPLOYEES: Role 3 (Forest Guards)
        this.allEmployees = users.filter((u: any) => {
          const rid = (u.role_id || u.roleId || '').toString();
          return rid === '3';
        });
        
        console.log('📥 [Reports] Admins (Role 7 - Range Officers):', this.allAdmins.length);
        console.log('📥 [Reports] Supervisors (Role 2 - Foresters):', this.allSupervisors.length);
        console.log('📥 [Reports] Guards (Role 3 - Forest Guards):', this.allEmployees.length);
        
        this.displayEmployees = [...this.allEmployees];
      },
      error: (err) => console.error('❌ [Reports] Error fetching users:', err)
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
      
      const fallbackRange = this.allRanges[0] || '';
      formData.append('range', (this.selectedRange && this.selectedRange !== 'all') ? this.selectedRange : fallbackRange);

      const fallbackBeat = this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
      const targetBeat = (this.selectedBeat && this.selectedBeat !== 'all') ? this.selectedBeat : fallbackBeat;
      formData.append('site_id', String(targetBeat));
      formData.append('beat', String(targetBeat));
      formData.append('beat_id', String(targetBeat));
    } else if (this.activeReport.includes('Admin') && this.activeReport !== 'Admin Monthly Summary' && this.activeReport !== 'Admin Performance') {
      const aid = (this.selectedAdmin && this.selectedAdmin !== 'all') ? this.selectedAdmin : rangerId;
      formData.append('id', String(aid));
      formData.append('user_id', String(aid));
      formData.append('ranger_id', String(aid));
      formData.append('admin_id', String(aid));
      
      const fallbackRange = this.allRanges[0] || '';
      formData.append('range', (this.selectedRange && this.selectedRange !== 'all') ? this.selectedRange : fallbackRange);

      if (this.selectedBeat && this.selectedBeat !== 'all') {
        formData.append('beat', String(this.selectedBeat));
        formData.append('site_id', String(this.selectedBeat));
        formData.append('beat_id', String(this.selectedBeat));
      } else {
        const fallbackBeat = this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
        if (fallbackBeat) {
          formData.append('beat', String(fallbackBeat));
          formData.append('site_id', String(fallbackBeat));
          formData.append('beat_id', String(fallbackBeat));
        }
      }
    } else {
      // General case for other reports (Incidence handled above)
      // For Patrol reports, we handle this inside the patrol block below to avoid duplicates
      if (!this.activeReport.includes('Patrol') && !this.activeReport.includes('Self') && !this.activeReport.includes('Supervisor') && !this.activeReport.includes('Admin')) {
        const uid = (this.selectedEmployee && this.selectedEmployee !== 'all') ? this.selectedEmployee : rangerId;
        formData.append('id', String(uid));
        formData.append('user_id', String(uid));
        formData.append('ranger_id', String(uid));
      }
      
      const fallbackRange = this.allRanges[0] || '';
      formData.append('range', (this.selectedRange && this.selectedRange !== 'all') ? this.selectedRange : fallbackRange);

      if (this.selectedBeat && this.selectedBeat !== 'all') {
        formData.append('beat', String(this.selectedBeat));
        formData.append('site_id', String(this.selectedBeat));
        formData.append('beat_id', String(this.selectedBeat));
      } else {
        const fallbackBeat = this.displayBeats[0]?.id || this.allBeats[0]?.id || '';
        if (fallbackBeat) {
          formData.append('beat', String(fallbackBeat));
          formData.append('site_id', String(fallbackBeat));
          formData.append('beat_id', String(fallbackBeat));
        }
      }
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