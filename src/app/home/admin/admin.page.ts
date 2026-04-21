import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router'; // 1. Added Router
import { NavController, MenuController, LoadingController } from '@ionic/angular';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DataService } from 'src/app/data.service';
import { AdminDataService } from 'src/app/services/admin-data';
import { HierarchyService } from 'src/app/services/hierarchy.service';
import { forkJoin } from 'rxjs';
import * as L from 'leaflet';
Chart.register(...registerables);

interface ForestAlert {
  id?: number;
  type?: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'clear';
  category: string;
  beat_name?: string;
  created_at: string;
  assigned_ranger?: string;
  latitude?: number; // <--- Ensure these exist
  longitude?: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AdminPage implements OnInit, AfterViewInit {
  public activePinsDisplay: any[] = [];
  // --- Constants ---
  readonly COLORS = {
    p: '#0d9488',
    rose: '#f43f5e',
    amber: '#f59e0b',
    orange: '#f97316',
    blue: '#3b82f6',
    ind: '#6366f1',
    slate: '#64748b',
    slateLight: '#94a3b8',
  };

  // --- Chart Configurations ---
  readonly CD: any = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,.9)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 11, family: 'Poppins', weight: '600' },
        bodyFont: { size: 10, family: 'Poppins' },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { display: false }, y: { display: false } },
  };

  readonly CDAX: any = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#64748b',
          font: { size: 9, family: 'Poppins' },
          boxWidth: 8,
          padding: 10,
          usePointStyle: true,
        },
      },
      tooltip: this.CD.plugins.tooltip,
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        ticks: { color: '#94a3b8', font: { size: 9, family: 'Poppins' } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        display: true,
        ticks: {
          color: '#94a3b8',
          font: { size: 9, family: 'Poppins' },
          maxTicksLimit: 5,
        },
        grid: { color: 'rgba(241,245,249,.8)' },
        border: { display: false },
      },
    },
  };

  // --- UI State ---
  chartInstance: any;
  myCompanyId!: number;
  // YE NEECHE WAALI LINES ADD KARO
  criminalCount: number = 0;
  eventsCount: number = 0;
  selectedTimeframe: string = 'today';

  trends: any = { events: [0, 0, 0, 0, 0] };
  trendChart: any = null;
  sightingChart: any;
  sightingSnapshotCount: number = 0;
  realNurseryCount: number = 0;
  realPlantationCount: number = 0;
  realOfficeCount: number = 0;
  realEcoCount: number = 0;
  totalAssetsCount: number = 0;
  operationalRate: string = '0%';
  critCount: number = 0;
  warnCount: number = 0;
  infoCount: number = 0;
  momStatus: string = '0% MoM';
  isGoodTrend: boolean = true;
  // trendChart: any;
  rangers: any[] = [];
  private dataSubscription: any;
  allRangers: number = 0;
  private isFetching: boolean = false;
  public onDutyCount: number = 0;
  public onLeaveCount: number = 0;
  public inactiveCount: number = 0;
  public incidentsCount: number = 0;
  public fireAlertsCount: number = 0;
  criminalActivityCount: number = 0;
  criminalTrendData: number[] = [];
  eventsTrendData: number[] = [];
  fireTrendData: number[] = [];
  assetsTrendData: number[] = [];
  onDutyTrendData: number[] = [];
  criminalActivityCount15: number = 0;
  sightingsCount15: number = 0;
  fireAlertsCount15: number = 0;
  currentTime: string = '';
  activeTab: string = 'home';
  activeSegment: string = 'overview';
  activeDateFilter: string = 'today';

  // Caching Trend Data to prevent it from disappearing
  private lastTrendLabels: string[] = [];
  private lastTrendValues: number[] = [];
  isFilterCollapsed: boolean = true;
  isRefreshing: boolean = false;
  isSpinning: boolean = false;
  selectedRange: string = 'all';
  selectedBeat: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';
  isLayerVisible: boolean = true;
  attendanceChart: any;
  // --- Map & Layer State ---
  public allIncidents: any[] = [];
  public map: L.Map | null | any = null;
  private markerGroup = L.layerGroup(); // To manage dynamic markers
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  isCompsActive: boolean = false;
  isLayerPanelOpen: boolean = false;
  activeLayerCount: number = 4;
  public activeAlertFilter: string = 'all';
  private dataInterval: any;
  filteredRangers: any[] = [];
  showCompartments: boolean = false;
  attendancePercent: number = 0;
  public selectedRanger: any = null;
  public alertsData: any[] = [];
  public filteredAlerts: any[] = [];
  alerts: ForestAlert[] = [];
  public sightingsCount: number = 0;
  attChart: any;
  public allActivePatrols: any[] = [];
  private patrolInterval: any; // Attendance chart ke liye
  private sightingsLayer = L.layerGroup();
  public allSightings: any[] = [];
  // trendChart: any;

  layerStates: { [key: string]: boolean } = {
    illegal_felling: true,
    animal_poaching: true, // poaching se animal_poaching kiya
    illegal_mining: true,
    animal_sighting: true,
    water_status: true,
    fire_alerts: true,
    sos: true,
    timber_storage: true, // Naya add kiya
    timber_transport: true, // Naya add kiya
    encroachment: true,
  };

  readonly LAYERS_DATA: any = {
    criminal: {
      label: 'Criminal Activity',
      emoji: '🌲',
      items: [
        {
          id: 'illegal_felling', // Matches "Illegal Felling" from DB
          label: 'Illegal Felling',
          emoji: '🪓',
          color: '#ef4444',
          bg: '#fff1f2',
        },
        {
          id: 'animal_poaching', // Matches "Poaching" from DB
          label: 'Animal Poaching',
          emoji: '🐾',
          color: '#b91c1c',
          bg: '#fef2f2',
        },
        {
          id: 'illegal_mining', // Matches "Illegal Mining" from DB
          label: 'Illegal Mining',
          emoji: '⛏️',
          color: '#475569',
          bg: '#f8fafc',
        },
        {
          id: 'timber_storage',
          label: 'Timber Storage',
          emoji: '🪵',
          color: '#92400e',
          bg: '#fef3c7',
        },
        {
          id: 'timber_transport',
          label: 'Timber Transport',
          emoji: '🚛',
          color: '#1e293b',
          bg: '#f1f5f9',
        },
        {
          id: 'encroachment',
          label: 'Encroachment',
          emoji: '🏠',
          color: '#7c3aed',
          bg: '#f5f3ff',
        },
      ],
    },
    events: {
      label: 'Monitoring',
      emoji: '🐾',
      items: [
        {
          id: 'animal_sighting', // Updated for consistency
          label: 'Animal Sighting',
          emoji: '🦌',
          color: '#059669',
          bg: '#ecfdf5',
        },
        {
          id: 'water_status',
          label: 'Water Status',
          emoji: '💧',
          color: '#2563eb',
          bg: '#eff6ff',
        },
      ],
    },
    fire: {
      label: 'Fire Incidents',
      emoji: '🔥',
      items: [
        {
          id: 'fire_alerts', // Matches fire_alerts from forest_reports
          label: 'Fire Alerts',
          emoji: '🔥',
          color: '#ea580c',
          bg: '#fff7ed',
        },
      ],
    },
    assets: {
      label: 'Personnel & Tools',
      emoji: '🛡️',
      items: [
        // {
        //   id: 'patrols',
        //   label: 'Active Patrols',
        //   emoji: '👮',
        //   color: '#0d9488',
        //   bg: '#f0fdfa',
        // },
        {
          id: 'sos',
          label: 'SOS Units',
          emoji: '🚨',
          color: '#f43f5e',
          bg: '#fff1f2',
        },
      ],
    },
  };

  // --- Map Pin Coordinates (Relative %) ---

  get activePins() {
    return this.activePinsDisplay;
  }

  get activeLegendItems() {
    const active: any[] = [];

    if (!this.LAYERS_DATA || !this.layerStates) return active;

    Object.values(this.LAYERS_DATA).forEach((cat: any) => {
      if (cat.items && Array.isArray(cat.items)) {
        cat.items.forEach((layer: any) => {
          // If the toggle for this layer ID is true, add it to the legend
          if (this.layerStates[layer.id]) {
            active.push(layer);
          }
        });
      }
    });

    return active;
  }

  // Add this method to handle the "All On" button logic
  layerAllOn() {
    Object.keys(this.layerStates).forEach((key) => {
      this.layerStates[key] = true;
    });
    this.updateVisiblePins();
  }

  // Add this to handle the "All Off" button logic
  layerAllOff() {
    Object.keys(this.layerStates).forEach((key) => {
      this.layerStates[key] = false;
    });
    this.updateVisiblePins();
  }

  // Ensure the allLayersOn property is available for the template
  get allLayersOn(): boolean {
    return Object.values(this.layerStates).every((val) => val === true);
  }

  // --- Data ---
  beatCoverage: any[] = [];

  private _charts: { [key: string]: Chart } = {};

  // 2. Injected Router into Constructor
  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dataService: DataService,
    private navCtrl: NavController,
    private adminService: AdminDataService,
    private hierarchyService: HierarchyService,
    private eRef: ElementRef,
    private zone: NgZone,
    private loadingCtrl: LoadingController,
  ) {}

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (this.isLayerPanelOpen) {
      if (!this.eRef.nativeElement.contains(event.target)) {
        this.isLayerPanelOpen = false;
        this.cdr.detectChanges(); // Ensure UI updates immediately
      }
    }
  }

  openMenu() {
    this.menuCtrl.open('start');
  }

  ngOnInit() {
    this.selectedTimeframe = 'today';

    const rawData = localStorage.getItem('user_data');
  const userData = rawData ? JSON.parse(rawData) : null;
  
  // Sahi key 'company_id' use karo jaisa tere storage mein hai
  this.myCompanyId = userData ? Number(userData.company_id || userData.companyId) : 0;
  
  console.log("✅ Admin Page Loaded for Company ID:", this.myCompanyId);

    const savedId = localStorage.getItem('companyId'); 
  this.myCompanyId = savedId ? Number(savedId) : 0;
    this.loadActivePatrols();

    // Har 30 seconds mein update karein (Live Tracking feel ke liye)
    this.patrolInterval = setInterval(() => {
      this.loadActivePatrols();
    }, 30000);

    this.startDataPoll();

    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }

    this.loadData();
    // Replaced loadAllKPIs with unified loadData

    // Naya fresh interval lagao based on settings
    const savedSync = localStorage.getItem('admin_sync_interval');
    const intervalMs = savedSync ? parseInt(savedSync) * 60000 : 30000; // Default 30s if not set, else minutes to ms

    this.dataInterval = setInterval(() => {
      if (this.activeTab === 'home') {
        this.loadData();
      }
    }, intervalMs);

    this.loadTrendData();
    this.loadBeatCoverage();
    this.updateTime();
    setTimeout(() => {
      this.initHomeCharts();
    }, 1000);
  }

  loadBeatCoverage() {
    const rawData = localStorage.getItem('user_data');
    const companyId = rawData ? JSON.parse(rawData).company_id : 1;

    this.hierarchyService.getCoverageStats(companyId).subscribe({
      next: (stats: any[]) => {
        if (stats && stats.length > 0) {
          this.beatCoverage = stats;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error loading beat coverage:', err),
    });
  }

  onRangeChange(newRange: string) {
    this.selectedRange = newRange; // 'today', 'week', ya 'month'

    // Dono KPIs ko dobara fetch karein
    this.fetchKPI('crimes', newRange);
    this.fetchKPI('events', newRange);
  }

  

  fetchKPI(category: string, range: string) {
  const rawData = localStorage.getItem('user_data');
  const cId = rawData ? JSON.parse(rawData).company_id : this.myCompanyId;

  this.dataService.getForestKPIs(cId, range, category).subscribe({
    next: (res: any) => {
      // ⚡ Backend se res.count aa raha hai
      const count = res && res.count !== undefined ? res.count : 0;
      
      if (category === 'crimes' ) {
        this.criminalCount = count;
      } else {
        this.eventsCount = count;
      }
      this.cdr.detectChanges(); // UI refresh
    },
    error: (err) => console.error("KPI Error:", err)
  });
}


  // admin.page.ts
segmentChanged(event: any) {
  const val = event.detail.value;
  this.selectedTimeframe = val;
  this.activeDateFilter = val;

  console.log('🕒 Fetching for:', val);

  // 1. Pehle Cards update karo
  this.fetchKPI('crimes', val);
  this.fetchKPI('events', val);

  // 2. Thoda gap dekar charts aur data load karo
  setTimeout(() => {
    this.loadData();
    this.loadTrendData();
  }, 300); 
}

  ngOnDestroy() {
    // 1. Interval band karo (Ye tere paas hai)
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }

    // 2. Saare Charts ko poori tarah khatam karo
    // Agar tune charts ko this._charts mein save kiya hai toh:
    if (this._charts) {
      Object.keys(this._charts).forEach((id) => {
        if (this._charts[id]) {
          this._charts[id].destroy();
        }
      });
      this._charts = {};
    }

    // 3. Map ko destroy karo (Sabse zyada RAM yehi khata hai)
    if (this.map) {
      this.map.off(); // Saare click events hatao
      this.map.remove(); // Map ko DOM se delete karo
      this.map = null;
    }

    if (this.patrolInterval) {
      clearInterval(this.patrolInterval);
    }

    console.log('Admin Page Destroyed: Memory Cleared!');
  }

  startDataPoll() {
    this.loadData();

    this.dataInterval = setTimeout(() => {
      if (this.activeTab === 'home') {
        this.startDataPoll();
      }
    }, 30000);
  }

  ngAfterViewInit() {
    this.initHomeCharts();
  }

  ionViewDidEnter() {
    // Call it here so it runs every time the page is viewed
    // this.loadSightingAnalytics();
  }

  onSegmentChange(event: any) {
    this.activeSegment = event.detail.value;

    if (this.activeSegment === 'map') {
      setTimeout(() => {
        this.initLeafletMap();
      }, 100);
    }
  }

  ionViewWillEnter() {
    this.loadData();
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['openSegment']) {
      // 1. Switch the main bottom tab to Home
      this.activeTab = 'home';
      // 2. Switch the segment to Officers
      this.activeSegment = navigation.extras.state['openSegment'];
    }
  }

  private initLeafletMap() {
    // 1. Completely destroy old instance
    if (this.map) {
      try {
        this.map.off();
        this.map.remove();
      } catch (e) {
        console.warn('Map removal error:', e);
      }
      this.map = null;
    }

    // 2. Verify Container exists
    const mapContainer = document.getElementById('leafletMap');
    if (!mapContainer) {
      console.warn("Map element 'leafletMap' not found in DOM");
      return;
    }

    // 3. Clear Leaflet Internal ID to prevent "Already Initialized" error
    if ((mapContainer as any)._leaflet_id) {
      (mapContainer as any)._leaflet_id = null;
    }

    try {
      // 4. Fresh Initialize
      this.map = L.map('leafletMap', {
        center: [19.9298, 79.1325],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(this.map);

      // Create the group that will hold our incident markers
      this.markerGroup = L.layerGroup().addTo(this.map);

      // 5. Delay slightly to ensure DOM is ready, then draw
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.updateMapMarkers();
        }
      }, 300);
    } catch (err) {
      console.error('Map Init Fatal Error:', err);
    }
  }

  // private updateMapMarkers() {
  //   if (!this.map || !this.markerGroup) return;
  //   this.markerGroup.clearLayers();

  //   this.activePinsDisplay.forEach(pin => {
  //     const markerColor = pin.color;
  //     const markerEmoji = pin.emoji;
  //     const labelText = pin.label; // Isme ab "Illegal Felling" aayega

  //     const customIcon = L.divIcon({
  //       className: 'custom-pin-container',
  //       html: `
  //         <div class="mpin-wrapper">
  //           <div class="mpin-ring" style="background: ${markerColor}33; border: 1px solid ${markerColor}66;"></div>
  //           <div class="mpin-bubble" style="background: ${markerColor}">
  //             ${markerEmoji}
  //           </div>
  //           <div class="mpin-label">${labelText}</div>
  //         </div>`,
  //       iconSize: [50, 60],
  //       iconAnchor: [25, 25]
  //     });

  //     L.marker([pin.lat, pin.lng], { icon: customIcon })
  //       .addTo(this.markerGroup)
  //       .bindPopup(`
  //         <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
  //           <strong style="color: ${markerColor}">${labelText}</strong><br>
  //           <p style="margin:5px 0;">${pin.report_data?.Description || pin.description || 'No details'}</p>
  //         </div>
  //       `);
  //   });
  // }
private updateMapMarkers() {
    if (!this.map || !this.markerGroup) return;
    this.markerGroup.clearLayers();

    this.activePinsDisplay.forEach((pin) => {
        // Double check layer toggle
        if (this.layerStates && this.layerStates[pin.layerId] === false) return;

        const markerColor = pin.color;
        const markerEmoji = pin.emoji;
        const labelText = pin.label;

        const customIcon = L.divIcon({
            className: 'custom-pin-container',
            html: `
            <div class="mpin-wrapper">
              <div class="mpin-ring" style="background: ${markerColor}33; border: 1px solid ${markerColor}66;"></div>
              <div class="mpin-bubble" style="background: ${markerColor}">
                ${markerEmoji}
              </div>
              <div class="mpin-label">${labelText}</div>
            </div>`,
            iconSize: [50, 60],
            iconAnchor: [25, 25],
        });

        L.marker([pin.lat, pin.lng], { icon: customIcon })
            .addTo(this.markerGroup)
            .bindPopup(`
            <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
              <strong style="color: ${markerColor}">${labelText}</strong><br>
              <p style="margin: 5px 0;">${pin.report_data?.Description || pin.description || 'No additional details'}</p>
              <small style="color: #666;">${new Date(pin.created_at || pin.date || Date.now()).toLocaleString()}</small>
            </div>
          `);
    });
}

changeTimeframe(newTimeframe: string) {
  this.selectedTimeframe = newTimeframe; // 🔥 Ye update hona zaroori hai
  this.activeDateFilter = newTimeframe;
  
  // Chart destroy karo taaki "Canvas already in use" error na aaye
  if (this.trendChart) {
    this.trendChart.destroy();
  }

  this.loadData();
}

  loadData() {
    console.log('DEBUG: DataService Object ->', this.dataService);
    if (this.isFetching) return;

    const storageData = localStorage.getItem('user_data');
    if (!storageData) return;

    const user = JSON.parse(storageData);
    const myCompanyId = Number(user.company_id || user.companyId);
    this.myCompanyId = myCompanyId; 

    if (!myCompanyId || isNaN(myCompanyId)) {
      console.error('CRITICAL: Company ID missing or invalid!', myCompanyId);
      return;
    }

    const dates = this.getFilterDates();
    this.isFetching = true;

    // 🔥 PREPARE LOCAL TIME STRINGS (To fix Zero Counts issue)
    const nowL = new Date();
    const lYear = nowL.getFullYear();
    const lMonth = String(nowL.getMonth() + 1).padStart(2, '0');
    const lDay = String(nowL.getDate()).padStart(2, '0');
    
    const todayYMD = `${lYear}-${lMonth}-${lDay}`;
    const todayDMY = `${lDay}-${lMonth}-${lYear}`;
    console.log(`🕒 Dashboard Sync using Local Date: ${todayYMD} / ${todayDMY}`);

    // FETCHING ALL DATA SOURCES
    this.dataService.getDashboardStats(myCompanyId, dates.from, dates.to).subscribe({
      next: (apiResponse: any) => {
        console.log("📊 Unified Admin Dashboard Response:", apiResponse);
        const res = apiResponse.data ? apiResponse.data : apiResponse;

        // --- 1. UNIFIED STATS MAPPING ---
        const stats = res.stats?.data || res.stats || {};
        
        // Initial values from API summary (will be refined by manual database sync)
        this.criminalActivityCount = Number(stats.criminal_count || stats.criminalEvents || 0);
        this.sightingsCount = Number(stats.monitoring_count || stats.monitoringEvents || 0);
        this.fireAlertsCount = Number(stats.fire_count || stats.fireEvents || 0);
        this.incidentsCount = Number(stats.total_incidents || stats.total_events || 0);

        // --- DYNAMIC DATABASE FETCH (FORCE SYNC - Fixed for Local Time) ---
        forkJoin({
          reports: this.dataService.getForestReports(),
          assets: this.dataService.getAssets(myCompanyId)
        }).subscribe({
          next: ({ reports, assets }: { reports: any, assets: any }) => {
            const list = Array.isArray(reports) ? reports : (reports.data || []);
            const assetList = Array.isArray(assets) ? assets : (assets.data || []);
            
            // --- A. PROCESS ASSETS ---
            if (assetList.length > 0) {
              console.log("📊 Asset Sync: Found", assetList.length, "Total Assets");
              this.totalAssetsCount = assetList.length;
              
              // Category Reset
              this.realNurseryCount = 0;
              this.realPlantationCount = 0;
              this.realOfficeCount = 0;
              this.realEcoCount = 0;
              let goodCount = 0;

              assetList.forEach((a: any) => {
                const cat = (a.category || '').toLowerCase();
                const status = (a.status || '').toLowerCase();

                if (cat.includes('nursery')) this.realNurseryCount++;
                else if (cat.includes('plantation')) this.realPlantationCount++;
                else if (cat.includes('office')) this.realOfficeCount++;
                else if (cat.includes('eco')) this.realEcoCount++;

                if (status === 'good' || status === 'operational') goodCount++;
              });

              this.operationalRate = assetList.length > 0 
                ? Math.round((goodCount / assetList.length) * 100) + '%' 
                : '100%';
            }

            // --- B. PROCESS REPORTS ---
            if (list.length > 0) {
                console.log("📊 Direct Database Sync: Found", list.length, "Total Records");
                
                const counts = { criminal: 0, monitoring: 0, fire: 0 };
                const trendMap: { [cat: string]: { [date: string]: number } } = { crim: {}, events: {}, fire: {} };
                const rangeMap: { [name: string]: number } = {};

                list.forEach((r: any) => {
                   const cat = (r.category || '').toLowerCase();
                   const rDate = r.date || ''; 
                   const rCreatedAt = r.created_at || r.date_time || '';
                   const range = r.range_name || r.range || r.region || 'General';

                   // Robust Today Check using local time strings
                   const isToday = (rCreatedAt && (rCreatedAt.includes(todayYMD) || rCreatedAt.includes(todayDMY))) || 
                                   (rDate && (rDate.includes(todayYMD) || rDate.includes(todayDMY)));

                   // Timeframe Checks for Week/Month
                   const rFullDate = rCreatedAt || rDate;
                   const rTimestamp = rFullDate ? new Date(rFullDate).getTime() : 0;
                   const nowTS = nowL.getTime();
                   const oneDay = 24 * 60 * 60 * 1000;
                   const isThisWeek = rTimestamp > (nowTS - (7 * oneDay));
                   const isThisMonth = rTimestamp > (nowTS - (30 * oneDay));

                   // Record for trend mapping (Last 30 Days logic)
                   let dateYMD = '';
                   if (rCreatedAt && rCreatedAt.includes('-')) {
                     const parts = rCreatedAt.split(' ')[0].split('-');
                     dateYMD = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                   } else if (rDate && rDate.includes('-')) {
                     const parts = rDate.split(' ')[0].split('-');
                     dateYMD = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                   }
                   
                   // Categorization
                   let catKey = '';
                   if (cat.includes('crim')) catKey = 'crim';
                   else if (cat.includes('fire')) catKey = 'fire';
                   else if (cat.includes('events') || cat.includes('sight') || cat.includes('monit')) catKey = 'events';

                   if (catKey && dateYMD) {
                     trendMap[catKey][dateYMD] = (trendMap[catKey][dateYMD] || 0) + 1;
                   }

                   // KPI COUNTS: Filter by timeframe (Today uses local strings)
                   let isPass = true;
                   if (this.activeDateFilter === 'today') isPass = isToday;
                   else if (this.activeDateFilter === 'week') isPass = isThisWeek;
                   else if (this.activeDateFilter === 'month') isPass = isThisMonth;

                   if (isPass && catKey) {
                      if (catKey === 'crim') counts.criminal++;
                      else if (catKey === 'fire') counts.fire++;
                      else if (catKey === 'events') counts.monitoring++;
                   }

                   rangeMap[range] = (rangeMap[range] || 0) + 1;
                });

                // Update charts and counters
                const last30 = Array.from({length: 30}, (_, i) => {
                   const d = new Date();
                   d.setDate(d.getDate() - (29 - i));
                   return d.toISOString().split('T')[0];
                });

                const getTrendArr = (k: string) => last30.map(d => trendMap[k][d] || 0);
                this.criminalTrendData = getTrendArr('crim');
                this.eventsTrendData = getTrendArr('events');
                this.fireTrendData = getTrendArr('fire');

                // --- 📅 CALCULATE 15-DAY TOTALS FOR SNAPSHOT ---
                // Slice the last 15 days from the 30-day trend arrays and sum them up
                this.criminalActivityCount15 = this.criminalTrendData.slice(-15).reduce((a, b) => a + b, 0);
                this.sightingsCount15 = this.eventsTrendData.slice(-15).reduce((a, b) => a + b, 0);
                this.fireAlertsCount15 = this.fireTrendData.slice(-15).reduce((a, b) => a + b, 0);

                const totalReports = list.length || 1;
                const targetRanges = ['R2 Test', 'R1 Kankher Test', 'General'];
                
                // Add any other ranges that might have data but aren't in target
                Object.keys(rangeMap).forEach(r => {
                  if (!targetRanges.includes(r)) targetRanges.push(r);
                });

                this.beatCoverage = targetRanges.map(name => ({
                   label: name,
                   val: Math.round(((rangeMap[name] || 0) / totalReports) * 100),
                   color: '#3b82f6'
                })).slice(0, 3); // Maintain focus on the top 3 as requested

                // --- FINAL KPI SYNCHRONIZATION (Sir's API Driven) ---
                const apiCriminal = Number(stats.criminal_count || stats.criminalEvents || 0);
                const apiEvents = Number(stats.monitoring_count || stats.monitoringEvents || 0);
                const apiFire = Number(stats.fire_count || stats.fireEvents || 0);
                const apiAssets = Number(stats.total_assets || 0);

                // Use API value as priority, fallback to manual sync counts if API is zero
                this.criminalCount = apiCriminal || counts.criminal;
                this.eventsCount = apiEvents || counts.monitoring;
                this.fireAlertsCount = apiFire || counts.fire;
                this.totalAssetsCount = apiAssets || this.totalAssetsCount;

                // Sync Bottom Snapshot variables
                this.criminalActivityCount = this.criminalCount;
                this.sightingsCount = this.eventsCount;

                // Total Summary
                this.incidentsCount = this.criminalCount + this.eventsCount + this.fireAlertsCount;

                console.log(`%c📊 Final Dashboard Sync: Criminal=${this.criminalCount}, Events=${this.eventsCount}, Fire=${this.fireAlertsCount}, Assets=${this.totalAssetsCount}`, 'color: #10b981; font-weight: bold;');

                // --- 📍 MAP MARKER PROCESSING ---
                let processedPins: any[] = [];
                if (list.length > 0) {
                  processedPins = list
                    .filter((f: any) => {
                      const latRaw = f.latitude || f.lat;
                      const latValid = latRaw && !isNaN(parseFloat(latRaw)) && parseFloat(latRaw) !== 0;
                      
                      const fDate = f.created_at || f.date || f.date_time || '';
                      
                      let isPass = true;
                      if (this.activeDateFilter === 'today') {
                         isPass = fDate && (fDate.includes(todayYMD) || fDate.includes(todayDMY));
                      } else if (this.activeDateFilter === 'week') {
                         const rTimestamp = fDate ? new Date(fDate).getTime() : 0;
                         const nowTS = new Date().getTime();
                         isPass = rTimestamp > (nowTS - (7 * 24 * 60 * 60 * 1000));
                      } else if (this.activeDateFilter === 'month') {
                         const rTimestamp = fDate ? new Date(fDate).getTime() : 0;
                         const nowTS = new Date().getTime();
                         isPass = rTimestamp > (nowTS - (30 * 24 * 60 * 60 * 1000));
                      }

                      return latValid && isPass;
                    })
                    .map((f: any) => {
                      const cat = (f.category || '').toLowerCase();
                      const rType = (f.report_type || f.event_type || '').toLowerCase();
                      const fullType = `${cat} ${rType}`.toLowerCase();
                      let layerId = 'general_incident';
                      if (fullType.includes('poach')) layerId = 'animal_poaching';
                      else if (fullType.includes('encroach')) layerId = 'encroachment';
                      else if (fullType.includes('mining')) layerId = 'illegal_mining';
                      else if (fullType.includes('fell')) layerId = 'illegal_felling';
                      else if (fullType.includes('sight')) layerId = 'animal_sighting';
                      else if (fullType.includes('water')) layerId = 'water_status';
                      else if (fullType.includes('fire')) layerId = 'fire_alerts';
                      return {
                        ...f,
                        latitude: parseFloat(f.latitude || f.lat),
                        longitude: parseFloat(f.longitude || f.lng),
                        layerId: layerId,
                        displayLabel: f.report_type || f.category || 'Forest Report'
                      };
                    });
                }
                this.allIncidents = processedPins;
                console.log(`📍 Map Pins for Today: ${processedPins.length}`);
                
                // 🔄 SYNC DASHBOARD COUNTS WITH MAP PINS
                // Recalculate KPI counts from the actual filtered records to ensure consistency with the Map
                this.criminalActivityCount = processedPins.filter(p => 
                  ['illegal_felling', 'illegal_mining', 'animal_poaching', 'fire_alerts', 'sos', 'encroachment', 'timber'].includes(p.layerId)
                ).length;
                
                this.sightingsCount = processedPins.filter(p => 
                  ['animal_sighting', 'sighting', 'monitoring'].includes(p.layerId)
                ).length;

                this.fireAlertsCount = processedPins.filter(p => p.layerId === 'fire_alerts').length;
                this.incidentsCount = processedPins.length; // Total today

                this.updateVisiblePins();
                
                this.loadTrendData();
                this.initHomeCharts();
                this.cdr.detectChanges();

                // --- 🚨 ALERTS & SOS PROCESSING (Enhanced with Forest Reports) ---
                const rawAlerts = apiResponse.data?.alerts || apiResponse.alerts || apiResponse.sos || [];
                
                // Transform the forest reports (Today's only) into Alerts format
                const syncAlerts = (this.allIncidents || []).map(inc => {
                  const theme = this.getAlertTheme(inc.layerId || inc.category || inc.type);
                  
                  // Resolve Name from IDs if direct name missing
                  const uId = inc.user_id || inc.ranger_id || inc.staff_id || inc.added_by || inc.created_by;
                  let uName = inc.user_name || inc.ranger_name;
                  
                  if (!uName && uId && this.rangers) {
                    const found = this.rangers.find(r => (r.id || r.user_id) == uId);
                    if (found) uName = found.name || found.full_name;
                  }

                  return {
                    ...inc,
                    displayTitle: (inc.displayLabel || inc.report_type || inc.category || 'Incident').toLowerCase(),
                    displayDesc: `${uName || 'Officer'} at ${inc.beat_name || inc.range_name || 'Field Area'}`,
                    displayTime: this.formatTime(inc.created_at || inc.date || new Date().toISOString()),
                    severity: this.getSeverityFromLayer(inc.layerId),
                    ...theme // Adds icon, color, bg, label from getAlertTheme
                  };
                });

                // Combine system alerts with synced forest reports
                this.alertsData = [...rawAlerts, ...syncAlerts];
                
                // Remove duplicates if any (based on unique ID)
                
                const seen = new Set();
                this.alertsData = this.alertsData.filter(a => {
                   const uniqueKey = a.id || (a.latitude + '_' + a.longitude + '_' + a.created_at);
                   if (seen.has(uniqueKey)) return false;
                   seen.add(uniqueKey);
                   return true;
                });

                if (this.alertsData.length > 0) {
                  this.critCount = this.alertsData.filter((a: any) => a.severity === 'critical').length;
                  this.warnCount = this.alertsData.filter((a: any) => a.severity === 'warning').length;
                  this.infoCount = this.alertsData.filter((a: any) => a.severity === 'info').length;
                } else {
                  this.critCount = 0;
                  this.warnCount = 0;
                  this.infoCount = 0;
                }

                this.updateFilteredAlerts();
            }
          },
          error: (err) => console.error("❌ Direct Sync Failure:", err)
        });


        // --- 👥 PERSONNEL FROM UNIFIED API ---
        const allUsers = res.users?.data || res.users || res.staff || [];
        if (Array.isArray(allUsers) && allUsers.length > 0) {
          this.rangers = allUsers.filter((u: any) => Number(u.role_id || u.roleId) === 4);
          this.filteredRangers = [...this.rangers];
          this.allRangers = this.rangers.length;
        }

        // Personnel Stats (Sir's Unified API fallback)
        this.onDutyCount = Number(stats.on_duty_count || stats.on_duty || 0);
        this.onLeaveCount = Number(stats.on_leave_count || stats.on_leave || 0);
        this.inactiveCount = Number(stats.inactive_count || stats.inactive || 0);

        if (res.officerStatus && res.officerStatus.history) {
           this.initAttChart(res.officerStatus.history); 
        }
        
        // --- 📊 ATTENDANCE RECOVERY SYNC (Fixed for Local Time) ---
        this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).subscribe({
          next: (userRes: any) => {
             const staffList = userRes.data || userRes.users || (Array.isArray(userRes) ? userRes : []);
             
                    // 🔥 NEW: Unified Attendance Sync (Logs + Pending Requests + OnSite)
                    forkJoin({
                       logs: this.dataService.getAttendanceLogsByRanger(this.myCompanyId.toString()),
                       requests: this.dataService.getAttendanceRequests(this.myCompanyId.toString()),
                       onsite: this.dataService.getGuardsOnSite()
                    }).subscribe({
                       next: (res: any) => {
                          console.log("DEBUG: Syncing Attendance for Company ID:", this.myCompanyId);
                          console.log("DEBUG: Raw Attendance Response:", res);
                          
                          const getArr = (obj: any) => {
                             if (Array.isArray(obj)) return obj;
                             if (!obj) return [];
                             // Search for any array property in the object
                             const firstArray = Object.values(obj).find(v => Array.isArray(v)) as any[];
                             if (firstArray) return firstArray;
                             
                             return obj.data || obj.attendance || obj.requests || obj.requests_list || obj.items || obj.logs || (Array.isArray(obj.result) ? obj.result : []);
                          };

                          const logsArray = getArr(res.logs);
                          const reqArray = getArr(res.requests);
                          const onsiteArray = getArr(res.onsite);
                          
                          console.log("🔍 Syncing Attendance:", { 
                            logs: logsArray.length, 
                            requests: reqArray.length, 
                            onsite: onsiteArray.length 
                          });

                          const activeIds = new Set<string>();
                          const todayISO = new Date().toISOString().split('T')[0]; // "2026-04-21"
                          
                          const processRecord = (record: any) => {
                             const rDate = (record.timestamp || record.entryDateTime || record.created_at || '').toString();
                             if (!rDate) return false;

                             const isToday = rDate.includes(todayYMD) || 
                                            rDate.includes(todayDMY) || 
                                            rDate.includes(todayISO) ||
                                            rDate.toLowerCase().includes('today');

                             if (isToday) {
                                const uId = record.user_id || record.staff_id || record.ranger_id || record.added_by || record.created_by || record.id || record.userId;
                                if (uId) activeIds.add(uId.toString());
                                return true;
                             }
                             return false;
                          };

                          logsArray.forEach(processRecord);
                          reqArray.forEach(processRecord);
                          onsiteArray.forEach(processRecord);

                          // 🔥 Aggressive Count Recovery
                          const filteredCount = activeIds.size;
                          const pendingCount = reqArray.length;
                          const onsiteCount = onsiteArray.length;
                          const apiCount = Number(stats.on_duty_count || stats.on_duty || 0);

                          this.onDutyCount = Math.max(filteredCount, apiCount, onsiteCount);
                          this.allRangers = staffList.length || Number(stats.total_staff || stats.total_users || this.allRangers || 0);
                          this.inactiveCount = Math.max(0, this.allRangers - this.onDutyCount);

                          if (staffList.length > 0) {
                             this.rangers = staffList.map((u: any) => {
                                const sId = (u.id || u.user_id || u.staff_id || u.ranger_id || '').toString();
                                const isWorking = sId ? activeIds.has(sId) : false;
                                return {
                                    id: sId,
                                    name: u.name || u.full_name || 'Staff',
                                    status: isWorking ? 1 : (pendingCount > 0 && filteredCount === 0 ? 1 : 0), // Fallback status
                                    role_id: 4,
                                    range_name: u.range_name || u.beat_name || 'Forest Division'
                                };
                             });
                             
                             this.rangers.sort((a,b) => b.status - a.status);
                             this.filteredRangers = [...this.rangers];
                          }

                          // ⚡ GENERATE ATTENDANCE ALERTS (From both sources)
                          const attAlerts = [
                             ...logsArray.filter((l: any) => processRecord(l)).map((log: any) => ({
                                ...log,
                                type: 'attendance',
                                is_request: false
                             })),
                             ...reqArray.filter((r: any) => processRecord(r)).map((req: any) => ({
                                ...req,
                                type: 'request',
                                is_request: true
                             }))
                          ].map((log: any) => {
                             const uId = log.user_id || log.staff_id || log.ranger_id || log.added_by || log.created_by;
                             const uName = this.resolveUserName(uId, log.ranger || log.user_name || 'Officer');
                                const isExit = (log.entryType || log.type || '').toUpperCase() === 'EXIT';
                                const isRequest = log.is_request;
                                
                                return {
                                    ...log,
                                    displayTitle: `${isRequest ? '[PENDING] ' : ''}attendance ${isExit ? 'out' : 'in'}`,
                                    displayDesc: `${uName} at ${log.location_name || log.geofence || 'Forest Area'}`,
                                    displayTime: this.formatTime(log.timestamp || log.created_at || log.entryDateTime),
                                    severity: isRequest ? 'warning' : 'info',
                                    theme: this.getAlertTheme(isRequest ? 'WARN' : 'ATTENDANCE'),
                                    layerId: 'attendance'
                                };
                             });

                      this.alertsData = [...(this.alertsData || []), ...attAlerts];
                      this.updateFilteredAlerts();
                      this.cdr.detectChanges();

                      // ⚡ FETCH PATROL ALERTS
                      this.dataService.getPatrolsByCompany(this.myCompanyId, todayYMD, todayYMD).subscribe({
                         next: (pRes: any) => {
                            const pList = pRes.data || pRes.patrols || (Array.isArray(pRes) ? pRes : []);
                            const pAlerts = pList.map((p: any) => {
                               const uName = p.user_name || p.ranger_name || this.resolveUserName(p.user_id || p.ranger_id);
                               return {
                                  ...p,
                                  displayTitle: `patrol ${p.status === 'completed' ? 'ended' : 'started'}`,
                                  displayDesc: `${uName} at ${p.range_name || 'Beat Area'}`,
                                  displayTime: this.formatTime(p.created_at || p.start_time || p.updated_at),
                                  severity: 'info',
                                  theme: this.getAlertTheme('PATROL'),
                                  layerId: 'patrol'
                               };
                            });
                            
                            this.alertsData = [...(this.alertsData || []), ...pAlerts];
                            
                            // FINAL PASS: Resolve names for all alerts if they still say "Officer"
                            if (this.alertsData) {
                               this.alertsData = this.alertsData.map(a => {
                                  if (a.displayTitle && a.displayTitle.includes('Officer')) {
                                     const uId = a.user_id || a.ranger_id || a.staff_id || a.added_by || a.created_by;
                                     const uName = this.resolveUserName(uId);
                                     if (uName !== 'Officer') {
                                        a.displayTitle = a.displayTitle.replace('Officer', uName);
                                     }
                                  }
                                  return a;
                               });
                            }

                            // DEDUPLICATION & SORTING
                            const seen = new Set();
                            this.alertsData = this.alertsData.filter((a: any) => {
                               const key = (a.id || '') + (a.displayTitle || '') + (a.displayTime || '');
                               if (seen.has(key)) return false;
                               seen.add(key);
                               return true;
                            });

                            // Update Final Counts
                            this.critCount = this.alertsData.filter((a: any) => a.severity === 'critical').length;
                            this.warnCount = this.alertsData.filter((a: any) => a.severity === 'warning').length;
                            this.infoCount = this.alertsData.filter((a: any) => a.severity === 'info').length;
                            
                            this.updateFilteredAlerts();
                            this.cdr.detectChanges();
                         }
                      });
                   }
                });
          },
          error: (err) => console.error("❌ Assignable Users API Failure:", err)
        });

        this.isFetching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Dashboard Load Error:", err);
        this.isFetching = false;
        this.cdr.detectChanges();
      }
    });
  }

  trackByAlert(index: number, alert: any) {
    // Agar alert ki unique ID hai toh wo return karo, warna index
    return alert.id || index;
  }

  
  get dynamicFootStats() {
    const activeStats: any[] = [];
    if (!this.LAYERS_DATA || !this.layerStates || !this.activePinsDisplay)
      return activeStats;

    // Pins are already filtered to Today in loadData(), so just count by layer
    Object.values(this.LAYERS_DATA).forEach((category: any) => {
      category.items.forEach((item: any) => {
        if (this.layerStates[item.id]) {
          const count = this.activePinsDisplay.filter((p: any) => p.layerId === item.id).length;

          activeStats.push({
            label: item.label,
            count: count,
            color: item.color,
            emoji: item.emoji,
          });
        }
      });
    });
    return activeStats;
  }

  setAlertFilter(filter: string) {
    this.activeAlertFilter = filter; // Updates 'all', 'crit', 'warn', or 'info'
    this.updateFilteredAlerts(); // Filters the data
    this.cdr.detectChanges(); // Forces UI to show changes
  }

  updateFilteredAlerts() {
    if (!this.alertsData) return;

    if (this.activeAlertFilter === 'all') {
      this.filteredAlerts = [...this.alertsData];
    } else {
      // Map the short filter keys ('crit', 'warn') to the full severity strings
      const severityMap: { [key: string]: string } = {
        crit: 'critical',
        warn: 'warning',
        info: 'info',
      };

      const target = severityMap[this.activeAlertFilter];
      this.filteredAlerts = this.alertsData.filter(
        (a) => a.severity === target,
      );
    }
  }

  getAlertTheme(type: string) {
    const t = String(type).toUpperCase();

    const themes: any = {
      // --- 🚨 CRITICAL GROUP ---
      FIRE: { bg: '#fff1f0', color: '#ff4d4f', icon: 'flame', label: 'CRITICAL' },
      SOS: { bg: '#fff1f2', color: '#e63946', icon: 'nuclear', label: 'CRITICAL' },
      CRIMINAL: { bg: '#f1f5f9', color: '#3768b7', icon: 'shield-half', label: 'CRITICAL' },
      MINING: { bg: '#f1f5f9', color: '#334155', icon: 'hammer', label: 'CRITICAL' },
      FELLING: { bg: '#fef2f2', color: '#b91c1c', icon: 'leaf', label: 'CRITICAL' },
      POACHING: { bg: '#fff1f2', color: '#be123c', icon: 'skull', label: 'CRITICAL' },
      ENCROACHMENT: { bg: '#f5f3ff', color: '#7c3aed', icon: 'home', label: 'CRITICAL' },
      TIMBER: { bg: '#fffbeb', color: '#92400e', icon: 'construct', label: 'CRITICAL' },

      // --- ⚠️ WARNING GROUP ---
      SIGHTING: { bg: '#f0f9ff', color: '#fa8c16', icon: 'paw', label: 'WARNING' },
      MONITORING: { bg: '#f0f9ff', color: '#0369a1', icon: 'eye', label: 'WARNING' },
      WARN: { bg: '#fffbeb', color: '#f39c12', icon: 'warning', label: 'WARNING' },

      // --- ℹ️ INFO GROUP ---
      ATTENDANCE: { bg: '#f5f3ff', color: '#8b5cf6', icon: 'finger-print', label: 'INFO' },
      PATROL: { bg: '#eff6ff', color: '#3b82f6', icon: 'shield-checkmark', label: 'INFO' },
      WATER: { bg: '#eff6ff', color: '#2563eb', icon: 'water', label: 'INFO' },
      INFO: { bg: '#f8fafc', color: '#64748b', icon: 'notifications', label: 'INFO' },
    };

    // Use includes for more flexible matching
    const matchedKey = Object.keys(themes).find(key => t.includes(key));
    return matchedKey ? themes[matchedKey] : themes['INFO'];
  }

  getAlertIcon(category: string): string {
    if (!category) return 'information-circle';
    const cat = category.toLowerCase();

    const map: { [key: string]: string } = {
      fire: 'flame',
      timber: 'leaf',
      fell: 'leaf',
      animal: 'paw',
      sighting: 'eye',
      poaching: 'skull',
      mining: 'hammer',
      encroach: 'home',
      water: 'water',
      patrol: 'shield-check',
      start: 'play-circle',
      end: 'stop-circle',
      sos: 'alert-circle',
    };

    // Agar category map mein milti hai toh wo return karo, nahi toh default info icon
    return map[cat] || 'information-circle';
  }

  private getSeverityFromLayer(layerId: string): 'critical' | 'warning' | 'info' {
    const crit = ['illegal_felling', 'animal_poaching', 'illegal_mining', 'fire_alerts', 'sos', 'encroachment', 'timber'];
    const warn = ['animal_sighting', 'sighting', 'monitoring'];
    
    const id = (layerId || '').toLowerCase();
    if (crit.some(k => id.includes(k))) return 'critical';
    if (warn.some(k => id.includes(k))) return 'warning';
    return 'info';
  }

  private resolveUserName(id: any, fallback: string = 'Officer'): string {
    if (!id) return fallback;
    // Check in staffList/rangers
    const found = (this.rangers || []).find(r => (r.id || r.user_id) == id);
    return found ? (found.name || found.full_name) : fallback;
  }

  getCount(sev: string): number {
    // Add (a: ForestAlert) here
    return this.alerts.filter((a: ForestAlert) => a.severity === sev).length;
  }

  formatTime(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    
    // Format: 4/20/26, 2:19 PM
    const options: any = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    // Some browsers use commas differently, so we ensure the format matches the image
    const formatted = date.toLocaleString('en-US', options);
    return formatted.replace(/ /g, ' ').replace(',', ''); 
  }

  loadActivePatrols() {
    // 1. LocalStorage se user/ranger data nikaalein
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    // 2. Company ID prioritize karein (User object se ya fir storage se)
    const companyId =
      userData.companyId ||
      userData.company_id ||
      localStorage.getItem('company_id');

    if (!companyId) {
      console.error('Company ID not found in storage');
      return;
    }

    // 3. API Call with dynamic ID
    this.dataService.getActivePatrols(Number(companyId)).subscribe({
      next: (res: any) => {
        this.allActivePatrols = res;
        this.updateVisiblePins();
      },
      error: (err) => {
        console.error('Error fetching active patrols:', err);
      },
    });
  }

updateVisiblePins() {
    console.log('%c📍 updateVisiblePins logic started...', 'color: yellow; font-weight: bold');
    const newPins: any[] = [];

    // ONLY use allIncidents (jisme humne pehle hi filter laga diya hai)
    const combinedData = [...(this.allIncidents || [])];

    combinedData.forEach((item: any) => {
        let layerId = item.layerId;

        if (layerId && this.layerStates && this.layerStates[layerId] === true) {
            let style: any = null;

            // Search styles in LAYERS_DATA
            Object.values(this.LAYERS_DATA).forEach((cat: any) => {
                const found = cat.items.find((i: any) => i.id === layerId);
                if (found) style = found;
            });

            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);

            if (!isNaN(lat) && !isNaN(lng) && style) {
                newPins.push({
                    ...item,
                    lat: lat,
                    lng: lng,
                    label: item.displayLabel || style.label,
                    emoji: style.emoji || '📌',
                    color: style.color || '#2e7d32',
                    layerId: layerId,
                });
            }
        }
    });

    this.activePinsDisplay = [...newPins];
    if (this.updateMapMarkers) this.updateMapMarkers();
    this.cdr.detectChanges();
}


handleApiResponse(res: any) {
  // 1. Aaj ki date string format mein (Comparison ke liye)
  const todayStr = new Date().toDateString();
  let processedPins: any[] = [];

  // --- A. Forest Events & Reports (With Date Filter) ---
  const forestData = [
    ...(res.forestReports || []),
    ...(res.forest_events || []),
  ];

  const forestPins = forestData
    .filter((f: any) => {
      const latValid = !isNaN(parseFloat(f.latitude)) && parseFloat(f.latitude) !== 0;
      
      // 🔥 DATE FILTER: Agar 'today' selected hai toh sirf aaj ka data lo
      if (this.activeDateFilter === 'today') {
        const fDate = new Date(f.date || f.created_at).toDateString();
        return latValid && fDate === todayStr;
      }
      return latValid;
    })
    .map((f: any) => {
      const type = (f.report_type || f.event_type || '').toLowerCase();
      let layerId = 'general_incident';

      if (type.includes('mining')) layerId = 'illegal_mining';
      else if (type.includes('felling')) layerId = 'illegal_felling';
      else if (type.includes('poaching')) layerId = 'animal_poaching';
      else if (type.includes('sighting')) layerId = 'animal_sighting';
      else if (type.includes('water')) layerId = 'water_status';
      else if (type.includes('fire')) layerId = 'fire_alerts';

      return {
        ...f,
        latitude: parseFloat(f.latitude),
        longitude: parseFloat(f.longitude),
        layerId: layerId,
        displayLabel: f.report_type || f.category || 'Forest Event',
      };
    });
  processedPins = [...processedPins, ...forestPins];

  // --- B. SOS Alerts (Filter by Date if needed) ---
  if (res.alerts && Array.isArray(res.alerts)) {
    const sosPins = res.alerts
      .filter((a: any) => {
        const isSos = (a.category === 'SOS' || (a.type && a.type.toUpperCase().includes('SOS')));
        const hasLoc = !isNaN(parseFloat(a.latitude)) && parseFloat(a.latitude) !== 0;
        
        if (this.activeDateFilter === 'today') {
          const aDate = new Date(a.created_at).toDateString();
          return isSos && hasLoc && aDate === todayStr;
        }
        return isSos && hasLoc;
      })
      .map((sos: any) => ({
        ...sos,
        latitude: parseFloat(sos.latitude),
        longitude: parseFloat(sos.longitude),
        layerId: 'sos',
        displayLabel: 'SOS Emergency',
      }));
    processedPins = [...processedPins, ...sosPins];
  }

  // --- C. Standard Incidents (Filter by Date) ---
  if (res.mapIncidents && Array.isArray(res.mapIncidents)) {
    const standardPins = res.mapIncidents
      .filter((inc: any) => {
        if (this.activeDateFilter === 'today') {
          const iDate = new Date(inc.incidentDate || inc.created_at).toDateString();
          return iDate === todayStr;
        }
        return true;
      })
      .map((inc: any) => {
        let layerId = 'general_incident';
        const crit = (inc.incidentCriteria || '').toLowerCase();
        if (crit.includes('fire')) layerId = 'fire_warning';
        else if (crit.includes('felling')) layerId = 'illegal_felling';
        else if (crit.includes('poaching')) layerId = 'animal_poaching';

        return {
          ...inc,
          latitude: parseFloat(inc.latitude),
          longitude: parseFloat(inc.longitude),
          layerId: layerId,
          displayLabel: inc.incidentCriteria || 'Incident',
        };
      });
    processedPins = [...processedPins, ...standardPins];
  }

  // --- 4. FINAL ASSIGNMENT & KPI SYNC ---
  this.allIncidents = processedPins;
  this.alerts = res.alerts || [];

  // Update KPI Counts based on filtered pins
  this.incidentsCount = this.allIncidents.length;
  
  this.criminalCount = this.allIncidents.filter(p => 
    ['illegal_mining', 'illegal_felling', 'animal_poaching'].includes(p.layerId)
  ).length;

  this.eventsCount= this.allIncidents.filter(p => 
    p.layerId === 'animal_sighting'
  ).length;

  console.log(`%c✅ Filtered Pins for ${this.activeDateFilter}: ${processedPins.length}`, 'color: cyan');
  
  this.updateVisiblePins();
  this.cdr.detectChanges();
}

  // // 2. API RESPONSE LOGIC (Isko API call ke subscribe ke andar paste karein)
  // handleApiResponse(res: any) {
  //   const today = new Date().toISOString().split('T')[0];
  //   let processedPins: any[] = [];

  //   // --- A. Forest Events & Reports ---
  //   const forestData = [
  //     ...(res.forestReports || []),
  //     ...(res.forest_events || []),
  //   ];

  //   if (forestData.length > 0) {
  //     const forestPins = forestData
  //       .filter(
  //         (f: any) =>
  //           !isNaN(parseFloat(f.latitude)) && parseFloat(f.latitude) !== 0,
  //       )
  //       .map((f: any) => {
  //         const type = (f.report_type || f.event_type || '').toLowerCase();
  //         let layerId = 'general_incident';

  //         if (type.includes('mining')) layerId = 'illegal_mining';
  //         else if (type.includes('felling')) layerId = 'illegal_felling';
  //         else if (type.includes('poaching')) layerId = 'animal_poaching';
  //         else if (type.includes('sighting')) layerId = 'animal_sighting';
  //         else if (type.includes('water')) layerId = 'water_status';
  //         else if (type.includes('fire')) layerId = 'fire_warning';

  //         return {
  //           ...f,
  //           latitude: parseFloat(f.latitude),
  //           longitude: parseFloat(f.longitude),
  //           layerId: layerId,
  //           displayLabel: f.report_type || f.event_type || 'Forest Event',
  //         };
  //       });
  //     processedPins = [...processedPins, ...forestPins];
  //   }

  //   // --- B. SOS Alerts (CRITICAL: Added to Map) ---
  //   if (res.alerts && Array.isArray(res.alerts)) {
  //     const sosPins = res.alerts
  //       .filter((a: any) => {
  //         const isSos = (a.category === 'SOS' || (a.type && a.type.toUpperCase().includes('SOS')));
  //         const hasLoc = !isNaN(parseFloat(a.latitude)) && parseFloat(a.latitude) !== 0;
  //         return isSos && hasLoc;
  //       })
  //       .map((sos: any) => ({
  //         ...sos,
  //         latitude: parseFloat(sos.latitude),
  //         longitude: parseFloat(sos.longitude),
  //         layerId: 'sos',
  //         displayLabel: 'SOS Emergency',
  //         emoji: '🚨',
  //         color: '#f43f5e'
  //       }));
  //     processedPins = [...processedPins, ...sosPins];
  //   }

  //   // --- C. Standard Incidents ---
  //   if (res.mapIncidents && Array.isArray(res.mapIncidents)) {
  //     const standardPins = res.mapIncidents.map((inc: any) => {
  //       let layerId = 'general_incident';
  //       const crit = (inc.incidentCriteria || '').toLowerCase();
        
  //       if (crit.includes('fire')) layerId = 'fire_warning';
  //       else if (crit.includes('felling')) layerId = 'illegal_felling';
  //       else if (crit.includes('poaching')) layerId = 'animal_poaching';

  //       return {
  //         ...inc,
  //         latitude: parseFloat(inc.latitude),
  //         longitude: parseFloat(inc.longitude),
  //         layerId: layerId,
  //         displayLabel: inc.incidentCriteria || 'Incident',
  //       };
  //     });
  //     processedPins = [...processedPins, ...standardPins];
  //   }

  //   this.allIncidents = processedPins;
  //   this.alerts = res.alerts || [];

  //   console.log(`%c✅ Data Processed. Pins: ${processedPins.length}`, 'color: cyan');
  //   this.updateVisiblePins();
  // }

  getMarkerEmoji(id: string) {
    if (id.includes('fire')) return '🔥';
    if (id.includes('felling')) return '🪓';
    if (id.includes('poaching')) return '🐾';
    if (id.includes('mining')) return '⛏️';
    if (id.includes('animal')) return '🦌';
    if (id.includes('water')) return '💧';
    if (id.includes('death')) return '💀';
    if (id.includes('impact')) return '⚠️';
    if (id.includes('sos')) return '🆘';
    return '📍';
  }

  getLayerColor(layerId: string) {
    const colors: any = {
      illegal_felling: '#0d9488',
      animal_poaching: '#f59e0b',
      fire_warning: '#ef4444',
      illegal_mining: '#7c3aed',
      animal_sighting: '#10b981',
      water_status: '#3b82f6',
      sos: '#dc2626',
    };
    return colors[layerId] || '#3b82f6';
  }

  // Old loadKPIs removed as everything is now in loadData()
  loadKPIs() {
    console.log('Redundant loadKPIs called - switching to loadData');
    this.loadData();
  }

  // --- UI Methods ---
  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // Update every minute
    setTimeout(() => this.updateTime(), 60000);
  }
  toggleFilterBar() {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  setDateFilter(type: string) {
    this.activeDateFilter = type;
    this.loadData();
    this.doRefresh();
  }


  // async doRefresh() {
  //   this.isRefreshing = true;
  //   this.isSpinning = true;

  //   const loading = await this.loadingCtrl.create({
  //     message: 'Refreshing Dashboard...',
  //     duration: 5000, // Timeout protection
  //     spinner: 'crescent',
  //     cssClass: 'custom-loading'
  //   });
  //   await loading.present();
    
  //   // Fetch latest data from backend in one go
  //   this.loadData();
  //   this.loadBeatCoverage();

  //   setTimeout(() => {
  //     this.isRefreshing = false;
  //     this.isSpinning = false;
  //     loading.dismiss();
      
  //     // After loading is dismissed, canvas is visible again — render charts
  //     if (this.activeSegment === 'overview') {
  //       this.initHomeCharts(); // renders mini-charts
  //       this.loadTrendData(); // fetches fresh trend and renders it
  //     }
  //     if (this.activeSegment === 'officers') this.initAttChart();
  //     if (this.activeSegment === 'map') this.updateMapMarkers();
  //   }, 1500);
  // }

  async doRefresh() {
  this.isRefreshing = true;
  this.isSpinning = true;

  const loading = await this.loadingCtrl.create({
    message: 'Refreshing Dashboard...',
    spinner: 'crescent',
    cssClass: 'custom-loading'
  });
  await loading.present();

  try {
    // Promise.all use karne se saare calls ek saath parallel mein honge
    await Promise.all([
      this.loadData(),
      this.loadBeatCoverage(),
      this.loadTrendData() // Refresh par trend data bhi update hona chahiye
    ]);

    console.log('Data fetched successfully!');
  } catch (error) {
    console.error('Refresh error:', error);
  } finally {
    // 1.5 second ka delay takki animation smooth lage
    setTimeout(() => {
      this.isRefreshing = false;
      this.isSpinning = false;
      loading.dismiss();

      // Charts ko re-initialize karna logic ke hisaab se
      if (this.activeSegment === 'overview') {
        this.initHomeCharts();
      } else if (this.activeSegment === 'officers') {
        this.initAttChart();
      } else if (this.activeSegment === 'map') {
        this.updateMapMarkers();
      }
    }, 1000);
  }
}


  private mkG(ctx: CanvasRenderingContext2D, color: string, h: number = 130) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + '44');
    g.addColorStop(1, color + '00');
    return g;
  }
  private mkChart(id: string, config: ChartConfiguration | any) {
    if (this._charts[id]) {
      this._charts[id].destroy();
      delete this._charts[id]; // Memory se poora hatao
    }

    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const c = new Chart(ctx, config);
    this._charts[id] = c;
    return c;
  }

  private rnd(n: number, max: number, min: number = 5) {
    return Array.from(
      { length: n },
      () => Math.floor(Math.random() * (max - min)) + min,
    );
  }

  initHomeCharts() {
    // --- 1. MAIN INCIDENT TREND CHART ---
    // We re-render from cache if data exists to prevent it from disappearing during refreshes
    if (this.lastTrendLabels && this.lastTrendLabels.length > 0) {
      this.initTrendChart(this.lastTrendLabels, this.lastTrendValues);
    } else {
      // If no data yet, we can trigger a load
      this.loadTrendData();
    }

    // --- 2. CATEGORY SNAPSHOTS (MINI CHARTS) ---

    // Dynamic Trend Logic: Agar data sirf 1 hai, toh hum use trend dikhane ke liye array mein convert kar rahe hain
    const getTrend = (val: number) => [0, 0, 0, 0, val || 0];

    const pairs: [string, number[], string, string?][] = [
      // Mapping to YOUR specific variables - Slicing to last 15 days for Sparklines
      ['mc-crim', (this.criminalTrendData?.length || 0) > 0 ? this.criminalTrendData!.slice(-15) : getTrend(this.criminalActivityCount15), this.COLORS.rose],
      ['mc-events', (this.eventsTrendData?.length || 0) > 0 ? this.eventsTrendData!.slice(-15) : getTrend(this.sightingsCount15), this.COLORS.amber],
      ['mc-fire', (this.fireTrendData?.length || 0) > 0 ? this.fireTrendData!.slice(-15) : getTrend(this.fireAlertsCount15), this.COLORS.orange, 'bar'],
      ['mc-assets', (this.assetsTrendData?.length || 0) > 0 ? this.assetsTrendData!.slice(-15) : getTrend(this.totalAssetsCount), this.COLORS.p],
      ['mc-duty', (this.onDutyTrendData?.length || 0) > 0 ? this.onDutyTrendData!.slice(-7) : getTrend(this.onDutyCount), this.COLORS.blue, 'bar'],
    ];

    pairs.forEach(([id, data, color, type = 'line']) => {
      const el = document.getElementById(id) as HTMLCanvasElement;
      if (!el) return;

      const ctx = el.getContext('2d');
      if (!ctx) return;

      // Purana mini-chart destroy karo
      const oldMini = Chart.getChart(id);
      if (oldMini) oldMini.destroy();

      this.mkChart(id, {
        type: type as any,
        data: {
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor:
                type === 'bar' ? color + '99' : this.mkG(ctx, color, 45),
              fill: type === 'line',
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
              borderRadius: type === 'bar' ? 3 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false }, 
            tooltip: { 
              enabled: true,
              backgroundColor: '#1e293b',
              titleColor: '#fff',
              bodyColor: '#fff',
              displayColors: false,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx: any) => `Value: ${ctx.raw}`
              }
            } 
          },
          scales: {
            x: { 
              display: true,
              grid: { display: false },
              border: { display: true, color: color, width: 2 }, // Solid and thicker baseline
              ticks: { display: false }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: { display: false },
              border: { display: true, color: color, width: 2 },
              ticks: { display: false },
              suggestedMax:
                Math.max(...data) > 0 ? Math.max(...data) * 1.3 : 5,
              // Isse ye ensure hota hai ki bar/line graph canvas ke ekdum top se na chipke
              grace: '15%'
            },
          },
        },
      });
    });
  }

  initAttChart(preFetchedData?: number[]) {
    if (preFetchedData && preFetchedData.length > 0) {
       this.renderAttChart(preFetchedData);
       return;
    }

    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const companyId = user.company_id ? Number(user.company_id) : 0;
    const rangerId = this.selectedRanger?.id ? Number(this.selectedRanger.id) : undefined;

    this.dataService.getWeeklyAttendanceStats(companyId, rangerId).subscribe({
      next: (realData: number[]) => this.renderAttChart(realData),
      error: (err: any) => {
        console.error('Database Fetch Error:', err);
        this.renderAttChart([0,0,0,0,0,0,0]);
      },
    });
  }

  private renderAttChart(realData: number[]) {
    const el = document.getElementById('c-att') as HTMLCanvasElement;
    if (!el) return;

    if (this.attChart) {
      this.attChart.destroy();
    }

    const ctx = el.getContext('2d');
    if (!ctx) return;

    this.attChart = this.mkChart('c-att', {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: this.selectedRanger
              ? `${this.selectedRanger.name}'s Activity`
              : 'Total Personnel On-Duty',
            data: realData,
            borderColor: this.COLORS.p,
            backgroundColor: this.mkG(ctx, this.COLORS.p, 150),
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: this.COLORS.p,
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            borderWidth: 3,
          },
        ],
      },
      options: {
        ...this.CDAX,
        plugins: {
          ...this.CDAX.plugins,
          legend: { display: false } // Keeping it clean like the other cards
        },
        scales: {
          x: { 
            display: true, 
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { display: false },
            border: { display: true, color: this.COLORS.p, width: 2 }
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(241,245,249,0.5)' },
            border: { display: true, color: this.COLORS.p, width: 2 },
            suggestedMax: Math.max(...realData, 5) + 2
          },
        },
      },
    });
  }


  private randomizeStats() {
    const kpiIds = ['kv-crim', 'kv-events', 'kv-fire', 'kv-assets'];
    kpiIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const v = parseInt(el.textContent?.replace(/,/g, '') || '0');
        el.textContent = (
          v +
          Math.floor(Math.random() * 11) -
          5
        ).toLocaleString();
      }
    });

    this.beatCoverage = this.beatCoverage.map((item: any) => ({
      ...item,
      val: Math.floor(Math.random() * (98 - 70)) + 70,
    }));
  }

  get timeLabel() {
    const labels: any = {
      today: 'For Today',
      week: 'Last 7 Days',
      month: 'Last 30 Days',
      custom: 'Custom Range',
    };
    return labels[this.activeDateFilter] || 'Last Month';
  }

  updatePinLocations() {
    this.updateVisiblePins();
  }

  toggleComps() {
    this.isCompsActive = !this.isCompsActive;
  }

  toggleLayerPanel() {
    this.isLayerPanelOpen = !this.isLayerPanelOpen;
  }

  toggleLayer(id: string) {
    this.layerStates[id] = !this.layerStates[id];

    // This updates the array that the 'get' function uses for counting
    this.updateVisiblePins();

    // This updates the Leaflet markers
    this.updateMapMarkers();
  }

  private updateLayerCount() {
    this.activeLayerCount = Object.values(this.layerStates).filter(
      (v) => v,
    ).length;
  }

  setSegment(segment: string) {
    this.activeSegment = segment;

    // 1. Force Angular to update the DOM so *ngIf templates (like the map div) are created
    this.cdr.detectChanges();

    // 2. Use a timeout to ensure the DOM elements are ready for third-party libraries
    setTimeout(() => {
      if (segment === 'overview') {
        this.initHomeCharts();
      } else if (segment === 'map') {
        // CRITICAL FIX: You must initialize the map object before updating pins
        this.initLeafletMap();
        this.updateVisiblePins();
      } else if (segment === 'officers') {
        this.initAttChart();
      }
    }, 150); // 150ms is a safe buffer for mobile rendering
  }

  switchTab(tab: string) {
    if (this.activeTab === tab) return;

    this.activeTab = tab;

    if (tab === 'home') {
      this.setSegment('overview');
    }
    // Add this block below
    else if (tab === 'settings') {
      this.navCtrl.navigateForward('/admin-settings');

      setTimeout(() => {
        this.activeTab = 'home';
      }, 500);
    }
  }

  openAnalytics() {
    // 1. Sabse pehle interval band karein
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }

    // 2. Saare charts destroy karein
    if (this._charts) {
      Object.values(this._charts).forEach((c) => {
        if (c) c.destroy();
      });
      this._charts = {};
    }

    // 3. Navigate karein
    this.navCtrl.navigateForward('/home/admin-analytics');
  }

  filterRangersByCompany(allOfficers: any[], targetCompanyId: number) {
    this.filteredRangers = allOfficers.filter(
      (officer) =>
        Number(officer.roleId) === 4 &&
        Number(officer.company_id) === targetCompanyId,
    );

    // Call this to update the UI numbers
    this.onDutyCount = this.filteredRangers.filter(
      (r) => r.status === 1,
    ).length;
    this.calculateStats();
    this.cdr.detectChanges();
  }

  // Helper for initials (e.g., "Anand Kankher" -> "AK")
  getInitials(name: string) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getRangerColor(name: string): string {
    // Premium Vibrant Palette (Tailwind-inspired)
    const colors = [
      '#dbeafe', // Blue
      '#ccfbf1', // Teal
      '#fef3c7', // Amber
      '#fee2e2', // Red
      '#f3e8ff', // Purple
      '#f0fdf4', // Green
      '#e0f2fe', // Sky
    ];
    // Pick based on name hash to keep it consistent
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // 3. Ensure your filteredRangers logic updates the attendance percent
  calculateStats() {
    if (this.filteredRangers.length > 0) {
      const onDuty = this.filteredRangers.filter(
        (r) => r.status === 'active',
      ).length;
      this.attendancePercent = Math.round(
        (onDuty / this.filteredRangers.length) * 100,
      );
    } else {
      this.attendancePercent = 0;
    }
  }

  selectRanger(ranger: any) {
    this.selectedRanger = ranger;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.initAttChart();
    }, 100);
  }
  // 3. Add logic to render specific data
  updateUserAttendanceChart(ranger: any) {
    const canvas = document.getElementById('c-att') as HTMLCanvasElement;
    if (!canvas) return;

    const onDutyData = this.rnd(7, 10, 4); // Random hours worked
    const leaveData = [0, 0, 1, 0, 0, 0, 0]; // Example: took leave on Wednesday

    this.mkChart('c-att', {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: `${ranger.name}'s Hours`,
            data: onDutyData,
            backgroundColor: this.COLORS.p + 'CC',
            borderRadius: 5,
          },
          {
            label: 'Leave Hours',
            data: leaveData,
            backgroundColor: this.COLORS.rose + '88',
            borderRadius: 5,
          },
        ],
      },
      options: {
        ...this.CDAX,
        plugins: {
          ...this.CDAX.plugins,
          legend: { display: true, position: 'top' },
        },
      },
    });
  }

  getStatusText(ranger: any): string {
    if (ranger.status === 2) return 'On Leave';
    if (ranger.status === 0) return 'Off Duty';

    if (ranger.status === 1) {
      // 1. Pehle check karo patrolling chalu hai kya
      if (ranger.is_patrolling) return 'On Patrol';

      // 2. Agar patrolling nahi hai par attendance hai, toh On Duty
      if (ranger.hasAttended) return 'On Duty';

      // 3. Agar kuch nahi hai toh Inactive
      return 'Inactive';
    }
    return 'Off Duty';
  }
  getStatusColor(ranger: any): string {
    const status = this.getStatusText(ranger);

    const colors: Record<string, string> = {
      'On Patrol': '#16a34a', // Green
      'On Duty': '#0284c7', // Blue
      'On Leave': '#f59e0b', // Orange
      Inactive: '#f43f5e', // Red
      'Off Duty': '#6b7280', // Grey
      Unknown: '#6b7280', // 💡 Ye missing tha, isliye error aa raha tha
    };

    return colors[status] || '#6b7280';
  }

  loadTrendData() {
    // The legacy '/incidents/trend/{id}' API is deprecated.
    // We now derive the overall incident trend dynamically from the unified stats arrays.
    const totalLength = Math.max(
      this.criminalTrendData?.length || 0,
      this.eventsTrendData?.length || 0,
      this.fireTrendData?.length || 0,
      6 // Fallback to 6 data points if arrays are empty
    );
    
    // Generate simple labels. In a real scenario, you can map 'date' keys if provided in stats.
    const labels = Array.from({length: totalLength}, (_, i) => `Ref ${i + 1}`);
    
    // Summing across all incident types per index to get total trend
    const values = labels.map((_, i) => {
       const crim = (this.criminalTrendData && this.criminalTrendData[i]) ? this.criminalTrendData[i] : 0;
       const env = (this.eventsTrendData && this.eventsTrendData[i]) ? this.eventsTrendData[i] : 0;
       const fire = (this.fireTrendData && this.fireTrendData[i]) ? this.fireTrendData[i] : 0;
       
       // If all are zero, give a random baseline (or 0 if preferred)
       return crim + env + fire;
    });

    this.lastTrendLabels = labels;
    this.lastTrendValues = values;

    // Calculate generic Momentum (MoM) based on last two points
    if (values.length >= 2) {
      const current = values[values.length - 1];
      const prev = values[values.length - 2];
      if (prev > 0) {
        const mom = Math.round(((current - prev) / prev) * 100);
        this.momStatus = `${Math.abs(mom)}% MoM`;
        this.isGoodTrend = mom <= 0; // Negative means fewer incidents, which is good
      } else {
        this.momStatus = `0% MoM`;
        this.isGoodTrend = true;
      }
    } else {
      this.momStatus = `0% MoM`;
      this.isGoodTrend = true;
    }

    this.initTrendChart(this.lastTrendLabels, this.lastTrendValues);
  }
  initTrendChart(labels: string[], values: number[]) {
    const canvas = document.getElementById('c-trend') as HTMLCanvasElement;
    if (!canvas) return;

    if (this._charts['c-trend']) {
      this._charts['c-trend'].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.trendChart = this.mkChart('c-trend', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Incidents Trend',
            data: values,
            borderColor: this.COLORS.p,
            backgroundColor: this.mkG(ctx, this.COLORS.p),
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        ...this.CDAX,
        plugins: { ...this.CDAX.plugins, legend: { display: false } },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 8 }, autoSkip: true, maxTicksLimit: 10 },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.3)', drawBorder: false },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 8 }, maxTicksLimit: 5 },
          },
        },
      },
    });
  }
  getFilterDates() {
    const now = new Date();
    const from = new Date();

    if (this.activeDateFilter === 'today') {
      // Backend se match karne ke liye: Midnight (Aaj ki shuruat)
      from.setHours(0, 0, 0, 0);
    } else if (this.activeDateFilter === 'week') {
      // Pichle 7 din
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
    } else if (this.activeDateFilter === 'month') {
      // Pichle 30 din (Fixed logic: Month ki 1st date ki jagah pichle 30 din lo)
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
    }

    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }
  getFilterLabel() {
    // Check karo tumhara filter variable ka naam kya hai (usually activeDateFilter hota hai)
    switch (this.activeDateFilter) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      default:
        return 'Selected Period';
    }
  }

  goAnalytics(category?: string) {
    this.router.navigate(['/home/admin-analytics'], {
      queryParams: { type: category || 'criminal' },
    });
  }

  // Aliases for template consistency
  gotoAnalytics(category?: string) { this.goAnalytics(category); }
  goToAnalytics(category?: string) { this.goAnalytics(category); }

  goToOfficers() {
    this.router.navigate(['/home/officers']);
  }
}