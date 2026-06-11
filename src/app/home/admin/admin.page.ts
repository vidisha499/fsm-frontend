import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  NgZone,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router'; // 1. Added Router
import { NavController, MenuController, LoadingController, IonContent } from '@ionic/angular';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DataService } from 'src/app/data.service';
import { AdminDataService } from 'src/app/services/admin-data';
import { HierarchyService } from 'src/app/services/hierarchy.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  @ViewChild(IonContent) content!: IonContent;
  public showScrollTop = false;
  public activePinsDisplay: any[] = [];
  // --- Constants ---
  readonly COLORS = {
    p: '#0d9488',
    ps: '#0b7c71',
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
  inactiveCount = 0;
  allAttendanceLogs: any[] = [];
  rangers: any[] = [];
  private dataSubscription: any;
  allRangers: number = 0;
  public isStatsLoading: boolean = true;
  private isFetching: boolean = false;
  private lastDashboardState: string = ''; // 🛑 Track sync state for flicker prevention
  public onDutyCount: number = 0;
  public onLeaveCount: number = 0;
  public incidentsCount: number = 0;
  public fireAlertsCount: number = 0;
  criminalActivityCount: number = 0;
  criminalTrendData: number[] = [];
  eventsTrendData: number[] = [];
  fireTrendData: number[] = [];
  assetsTrendData: number[] = [];
  onDutyTrendData: number[] = [];
  patrolCount: number = 0;
  criminalActivityCount15: number = 0;
  sightingsCount15: number = 0;
  fireAlertsCount15: number = 0;

  // --- DYNAMIC SNAPSHOT CARDS ---
  masterSnapshotCards: any[] = [
    { id: 'fire', labelKey: 'ADMIN.FIRE_LABEL', color: '#f97316', type: 'fire', count: 0, trend: [], iconLabel: 'Y_ALERTS' },
    { id: 'assets', labelKey: 'ADMIN.ASSETS_LABEL', color: '#6366f1', type: 'assets', count: 0, trend: [], iconLabel: 'Y_EVENTS' },
    // Criminal Sub-categories
    { id: 'illegal_felling', labelKey: 'ANALYTICS.ILLEGAL_FELLING', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    { id: 'timber_transport', labelKey: 'ANALYTICS.TIMBER_TRANSPORT', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    { id: 'timber_storage', labelKey: 'ANALYTICS.TIMBER_STORAGE', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    { id: 'wild_animal_poaching', labelKey: 'ANALYTICS.WILD_ANIMAL_POACHING', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    { id: 'encroachment', labelKey: 'ANALYTICS.ENCROACHMENT', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    { id: 'illegal_mining', labelKey: 'ANALYTICS.ILLEGAL_MINING', color: '#f43f5e', type: 'criminal', count: 0, trend: [], iconLabel: 'Y_CASES' },
    // Events Sub-categories
    { id: 'jfmc', labelKey: 'ANALYTICS.JFMC', color: '#f59e0b', type: 'events', count: 0, trend: [], iconLabel: 'Y_EVENTS' },
    { id: 'wild_animal_sighting', labelKey: 'ANALYTICS.WILD_ANIMAL_SIGHTING', color: '#f59e0b', type: 'events', count: 0, trend: [], iconLabel: 'Y_EVENTS' },
    { id: 'water_source', labelKey: 'ANALYTICS.WATER_SOURCE', color: '#f59e0b', type: 'events', count: 0, trend: [], iconLabel: 'Y_EVENTS' },
    { id: 'wildlife_compensation', labelKey: 'ANALYTICS.WILDLIFE_COMPENSATION', color: '#f59e0b', type: 'events', count: 0, trend: [], iconLabel: 'Y_EVENTS' }
  ];
  activeSnapshotCards: any[] = [];
  snapshotChartInstances: any = {};
  userRole: string = '3'; // 🔐 Role-based access for KPI elements
  assignedRange: string = ''; // 🔒 Assigned range to lock non-superadmin
  assignedBeat: string = '';  // 🔒 Assigned beat to lock non-superadmin

  currentPeriodDates: string[] = [];
  currentTime: string = '';
  activeTab: string = 'home';
  public isChartLoading: boolean = false;
  activeSegment: string = 'overview';
  activeDateFilter: string = 'today';

  // Caching Trend Data to prevent it from disappearing
  private lastTrendLabels: string[] = [];
  private lastTrendValues: number[] = [];
  private lastTrendState: string = '';
  isFilterCollapsed: boolean = true;
  isRefreshing: boolean = false;
  isSpinning: boolean = false;
  selectedRange: string = 'all';
  selectedBeat: string = 'all';
  allRanges: any[] = [];
  allBeats: any[] = [];
  displayBeats: any[] = [];
  layers: any[] = [];
  hierarchySelections: any[] = [];
  layerEntities: { [key: number]: any[] } = {};
  hierarchyNodes: any[] = [];
  dateFrom: string = '';
  dateTo: string = '';
  todayDate: string = new Date().toISOString().split('T')[0]; // e.g. "2026-05-02"
  allReportsCache: any[] | null = null;
  allAssetsCache: any[] | null = null;
  isLayerVisible: boolean = true;
  attendanceChart: any;
  // --- Map & Layer State ---
  public allIncidents: any[] = [];
  public map: L.Map | null | any = null;
  private markerGroup = L.featureGroup(); // To manage dynamic markers
  private shouldFitMapOnce: boolean = false; // Flag for auto-zoom
  private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
  isCompsActive: boolean = false;
  isMapFullscreen: boolean = false;
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
    animal_poaching: true,
    illegal_mining: true,
    animal_sighting: true,
    water_status: true,
    fire_alerts: true,
    sos: true,
    timber_storage: true,
    timber_transport: true,
    encroachment: true,
    jfmc: true,
    wildlife_compensation: true,
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
          label: 'Storage',
          emoji: '🪵',
          color: '#92400e',
          bg: '#fef3c7',
        },
        {
          id: 'timber_transport',
          label: 'Transport',
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
          id: 'animal_sighting',
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
        {
          id: 'jfmc',
          label: 'JFMC / Social Forestry',
          emoji: '🌳',
          color: '#059669',
          bg: '#ecfdf5',
        },
        {
          id: 'wildlife_compensation',
          label: 'Wildlife Compensation',
          emoji: '💰',
          color: '#0284c7',
          bg: '#e0f2fe',
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
  latestRangeMap: { [name: string]: number } = {};
  latestTotalReports: number = 1;
  deepestSelection: any = null;

  isRestrictedAdmin: boolean = false;
  restrictedLayerIndex: number = -1;

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
    this.userRole = localStorage.getItem('user_role') || '3';

    // 🌐 Restore Persistent Filters
    const savedFilter = localStorage.getItem('global_date_filter') || 'today';
    this.selectedTimeframe = savedFilter;
    this.activeDateFilter = savedFilter;

    // Resolve hierarchy assignments for non-Superadmins (roles 2, 7, etc.)
    if (this.userRole !== '1') {
      const storageData = localStorage.getItem('user_data');
      if (storageData) {
        try {
          const user = JSON.parse(storageData);
          this.assignedRange = user.range_name || user.range || user.division || user.division_name || '';
          this.assignedBeat = user.site_name || user.beat_name || user.beat || '';
        } catch (e) {
          console.error("Error parsing user_data for hierarchy resolution:", e);
        }
      }
      if (!this.assignedBeat) {
        this.assignedBeat = localStorage.getItem('user_site_name') || localStorage.getItem('site_name') || '';
      }

      if (this.assignedRange) {
        this.selectedRange = this.assignedRange;
        localStorage.setItem('global_range_filter', this.assignedRange);
      } else {
        this.selectedRange = localStorage.getItem('global_range_filter') || 'all';
      }

      if (this.assignedBeat) {
        this.selectedBeat = this.assignedBeat;
        localStorage.setItem('global_beat_filter', this.assignedBeat);
      } else {
        this.selectedBeat = localStorage.getItem('global_beat_filter') || 'all';
      }
    } else {
      this.selectedRange = localStorage.getItem('global_range_filter') || 'all';
      this.selectedBeat = localStorage.getItem('global_beat_filter') || 'all';
    }

    const rawData = localStorage.getItem('user_data');
  const userData = rawData ? JSON.parse(rawData) : null;
  
  // Sahi key 'company_id' use karo jaisa tere storage mein hai
  this.myCompanyId = userData ? Number(userData.company_id || userData.companyId) : 0;
  
  console.log("✅ Admin Page Loaded for Company ID:", this.myCompanyId);

    const savedId = localStorage.getItem('companyId'); 
  this.myCompanyId = savedId ? Number(savedId) : 0;
    this.clearAllIntervals();
    this.loadActivePatrols();

    // Har 30 seconds mein update karein (Live Tracking feel ke liye)
    this.patrolInterval = setInterval(() => {
      this.loadActivePatrols();
    }, 30000);

    this.loadData();
    // Replaced loadAllKPIs with unified loadData

    // Naya fresh interval lagao based on settings
    const savedSync = localStorage.getItem('admin_sync_interval');
    const intervalMs = savedSync ? parseInt(savedSync) * 60000 : 60000; // Default 60s to prevent constant flickering

    this.dataInterval = setInterval(() => {
      if (this.activeTab === 'home' && !this.isFetching) {
        this.loadData(false); // Silent refresh
      }
    }, intervalMs);

    this.loadTrendData();
    this.loadBeatCoverage();
    this.updateTime();
    // this.loadHierarchy(); // Moved to loadData for more reliable fetching
    setTimeout(() => {
      this.initHomeCharts();
    }, 300); // Reduced delay for faster visual feedback
  }

  ionViewWillLeave() {
    this.clearAllIntervals();
  }

  clearAllIntervals() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      clearTimeout(this.dataInterval);
      this.dataInterval = null;
    }
    if (this.patrolInterval) {
      clearInterval(this.patrolInterval);
      this.patrolInterval = null;
    }
  }

  loadBeatCoverage() {
    const rawData = localStorage.getItem('user_data');
    const companyId = rawData ? JSON.parse(rawData).company_id : 1;

    this.hierarchyService.getCoverageStats(companyId).subscribe({
      next: (stats: any[]) => {
        if (stats && stats.length > 0) {
          let filteredStats = stats;
          if (this.userRole !== '1') {
            const allowedNames: string[] = [];
            if (this.assignedRange) allowedNames.push(this.assignedRange.toLowerCase().trim());
            const deepestName = localStorage.getItem('global_deepest_filter_name') || '';
            if (deepestName) deepestName.split(',').forEach(n => allowedNames.push(n.toLowerCase().trim()));
            const globalRange = localStorage.getItem('global_range_filter');
            if (globalRange && globalRange !== 'all') allowedNames.push(globalRange.toLowerCase().trim());
            if (this.allRanges && this.allRanges.length > 0) {
              this.allRanges.forEach(r => allowedNames.push(r.toLowerCase().trim()));
            }
            
            const uniqueAllowed = [...new Set(allowedNames)].filter(Boolean);
            if (uniqueAllowed.length > 0) {
              filteredStats = stats.filter(item => {
                const label = (item.label || item.name || '').toLowerCase().trim();
                return uniqueAllowed.some(allowed => label.includes(allowed) || allowed.includes(label));
              });
            }
          }
          this.beatCoverage = filteredStats;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.warn('⚠️ Hierarchy coverage API (Vercel) is currently unreachable. Using locally calculated distribution.');
        // Do NOT overwrite existing data with zeros. 
        // Only provide a visual hint if the list is completely empty.
        if (!this.beatCoverage || this.beatCoverage.length === 0) {
           this.beatCoverage = [
             { label: 'General', val: 0, color: '#0d9488' }
           ];
        }
        this.cdr.detectChanges();
      },
    });
  }
  onRangeChange(newRange: string) {
    this.selectedRange = newRange; // 'today', 'week', ya 'month'

    // Dono KPIs ko dobara fetch karein
    this.fetchKPI('crimes', newRange);
    this.fetchKPI('events', newRange);
  }

  // --- Production Filter Data Logic (V2 Hierarchy Cascade + Fallback to legacy) ---
  loadHierarchy(force: boolean = false) {
    const companyId = localStorage.getItem('company_id') || localStorage.getItem('user_company_id') || '1';

    if (force || !this.layers || this.layers.length === 0) {
      console.log('📡 [Hierarchy] Dashboard Syncing V2 Hierarchy layers...');
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

            console.log("🎯 [Admin] V2 Layers Parsed:", this.layers);

            // Initialize hierarchy selections array
            if (!this.hierarchySelections || this.hierarchySelections.length !== this.layers.length) {
              this.hierarchySelections = new Array(this.layers.length).fill(null);
            }

            const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';
            this.isRestrictedAdmin = isRestrictedAdmin;
            if (isRestrictedAdmin) {
              const adminLayerId = localStorage.getItem('admin_layer_id');
              const adminEntityId = localStorage.getItem('admin_entity_id');
              const idx = this.layers.findIndex((l: any) => String(l.id) === String(adminLayerId));
              if (idx !== -1 && adminEntityId) {
                // Do NOT pre-populate hierarchySelections so user starts with "Select range"
                this.restrictedLayerIndex = idx;
              }
            }

            // Load initial entities for the first layer
            if (this.layers.length > 0) {
              const firstLayer = this.layers[0];
              this.dataService.listV2Entities(firstLayer.id, null, false, companyId).subscribe({
                next: (entRes: any) => {
                  const nodes = entRes?.data || entRes || [];
                  if (nodes.length === 0) {
                    console.warn("⚠️ No V2 entities found for the first layer. Falling back to legacy...");
                    this.layers = [];
                    this.loadOldHierarchy();
                    return;
                  }
                  
                  this.filterAndProcessRanges(nodes, companyId);
                  
                  if (isRestrictedAdmin && this.restrictedLayerIndex !== -1 && this.hierarchySelections[this.restrictedLayerIndex]) {
                    setTimeout(() => {
                      this.onLayerChange(this.restrictedLayerIndex);
                    }, 50);
                  }
                },
                error: (err) => {
                  console.warn("⚠️ Failed to load first layer V2 entities:", err);
                  this.layers = [];
                  this.loadOldHierarchy();
                }
              });
            } else {
              this.loadOldHierarchy();
            }

          } else {
            console.warn("⚠️ [Admin] No V2 Layers returned, falling back to legacy...");
            this.loadOldHierarchy();
          }
        },
        error: (err) => {
          console.error("❌ [Admin] listV2Layers API failed, falling back to legacy:", err);
          this.loadOldHierarchy();
        }
      });
    } else {
      // If layers are already loaded, just refresh the dynamic range entities
      let rangeLayer = this.layers && this.layers.length > 0 ? this.layers[0] : null;
      if (rangeLayer) {
        this.dataService.listV2Entities(rangeLayer.id, null, false, companyId).subscribe({
          next: (entRes: any) => {
            const nodes = entRes?.data || entRes || [];
            this.filterAndProcessRanges(nodes, companyId);
          }
        });
      } else {
        this.loadOldHierarchy();
      }
    }
  }

  filterAndProcessRanges(nodes: any[], companyId: any) {
    let rawNodes = Array.isArray(nodes) ? nodes : [];
    const firstLayer = this.layers && this.layers.length > 0 ? this.layers[0] : null;
    const secondLayer = this.layers && this.layers.length > 1 ? this.layers[1] : null;
    const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';

    if (this.userRole !== '1') {
      if (isRestrictedAdmin) {
        const adminLayerId = localStorage.getItem('admin_layer_id');
        const adminEntityId = localStorage.getItem('admin_entity_id');
        const firstLayerId = firstLayer?.id;
        const secondLayerId = secondLayer?.id;

        if (firstLayerId && String(firstLayerId) === String(adminLayerId) && adminEntityId) {
          const allowedIds = adminEntityId.split(',').map(id => id.trim()).filter(Boolean);
          rawNodes = rawNodes.filter(n => allowedIds.includes(String(n.id)));
          
          const matchedNames = rawNodes.map(n => n.name || n.label || '').filter(Boolean);
          if (matchedNames.length > 0) {
            this.assignedRange = matchedNames.join(', ');
            localStorage.setItem('global_deepest_filter_name', this.assignedRange);
            this.deepestSelection = { entityId: adminEntityId, name: this.assignedRange };
            this.loadData(true);
          }
        } else if (secondLayerId && String(secondLayerId) === String(adminLayerId) && adminEntityId) {
          const allowedBeatIds = adminEntityId.split(',').map(id => id.trim()).filter(Boolean);
          
          this.dataService.listV2Entities(secondLayerId, null, false, companyId).subscribe({
            next: (beatRes: any) => {
              const beatNodes = beatRes?.data || beatRes || [];
              if (Array.isArray(beatNodes)) {
                const parentIds = beatNodes
                  .filter((b: any) => allowedBeatIds.includes(String(b.id)))
                  .map((b: any) => {
                    const pId = b.parent_id !== undefined && b.parent_id !== null ? b.parent_id : b.parentId;
                    return pId ? String(pId) : null;
                  })
                  .filter(Boolean);
                
                const uniqueParentIds = [...new Set(parentIds)];
                rawNodes = rawNodes.filter(n => uniqueParentIds.includes(String(n.id)));
                
                if (firstLayer) {
                  this.layerEntities[firstLayer.id] = rawNodes;
                }
                this.allRanges = rawNodes.map((n: any) => n.name || n.label).filter(Boolean);
                
                const matchedNames = rawNodes.map(n => n.name || n.label || '').filter(Boolean);
                if (matchedNames.length > 0) {
                  this.assignedRange = matchedNames.join(', ');
                  localStorage.setItem('global_deepest_filter_name', this.assignedRange);
                  this.deepestSelection = { entityId: adminEntityId, name: this.assignedRange };
                  this.loadData(true);
                }
                
                this.updateBeatCoverage();
                this.cdr.detectChanges();
              }
            }
          });
          return; // Return early, async subscription handles the rest
        }
      } else {
        if (this.assignedRange) {
          const allowedName = this.assignedRange.toLowerCase().trim();
          rawNodes = rawNodes.filter(n => {
            const name = (n.name || n.label || '').toLowerCase().trim();
            return name.includes(allowedName) || allowedName.includes(name);
          });
        }
      }
    }

    if (firstLayer) {
      this.layerEntities[firstLayer.id] = rawNodes;
    }
    this.allRanges = rawNodes.map((n: any) => n.name || n.label).filter(Boolean);
    this.updateBeatCoverage();
    this.cdr.detectChanges();
  }

  loadOldHierarchy() {
    console.log('📡 [Hierarchy] Dashboard Syncing legacy range/beat layers (Sir\'s legacy way)...');
    const apiToken = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || localStorage.getItem('user_company_id') || '1';
    
    const rangeSet = new Set<string>();
    const beatArray: any[] = [];

    // 1. Fetch from getHierarchies (Structural)
    this.dataService.getHierarchies().subscribe({
      next: (res: any) => {
        const nodes = res?.data || res || [];
        if (Array.isArray(nodes)) {
          nodes.forEach((n: any) => {
            // Filter by active company to avoid showing ranges from Nagpur Division/other companies
            if (n.company_id && String(n.company_id) !== String(companyId)) {
              return;
            }
            if (String(n.layer_id) === '2' || String(n.layer_id) === '3') {
              if (n.name) rangeSet.add(n.name);
            } else if (String(n.layer_id) === '4' || String(n.layer_id) === '5') {
              const parent = nodes.find((p: any) => String(p.id) === String(n.parent_id));
              if (n.name) {
                beatArray.push({ name: n.name, parentName: parent?.name || 'General Range' });
              }
            }
          });
        }

        // 2. Merge with getSites (Assigned)
        this.dataService.getSites({ api_token: apiToken, company_id: companyId }).subscribe({
          next: (siteRes: any) => {
            const sites = siteRes?.data || siteRes || [];
            if (Array.isArray(sites)) {
              sites.forEach((s: any) => {
                const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
                const bName = s.name || s.beat_name || s.beat || s.site_name || s.site;
                if (rName) rangeSet.add(rName);
                if (bName && !beatArray.find(b => b.name === bName)) {
                  beatArray.push({ name: bName, parentName: rName });
                }
              });
            }
            this.finalizeHierarchy(rangeSet, beatArray);
          },
          error: () => this.finalizeHierarchy(rangeSet, beatArray)
        });
      },
      error: (err) => {
        console.error('❌ [Hierarchy] Dashboard structural fetch failed:', err);
        // Fallback to sites if hierarchies fail
        this.dataService.getSites({ api_token: apiToken, company_id: companyId }).subscribe({
          next: (siteRes: any) => {
            const sites = siteRes?.data || siteRes || [];
            sites.forEach((s: any) => {
              const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
              const bName = s.name || s.beat_name || s.beat || s.site_name || s.site;
              if (rName) rangeSet.add(rName);
              if (bName) beatArray.push({ name: bName, parentName: rName });
            });
            this.finalizeHierarchy(rangeSet, beatArray);
          },
          error: () => this.finalizeHierarchy(rangeSet, beatArray)
        });
      }
    });
  }


  // Set the final data for legacy fallback
  private finalizeHierarchy(rangeSet: Set<string>, beatArray: any[]) {
    let ranges = Array.from(rangeSet).sort();
    if (this.userRole !== '1') {
      if (this.assignedRange) {
        const allowedName = this.assignedRange.toLowerCase().trim();
        ranges = ranges.filter(r => r.toLowerCase().includes(allowedName) || allowedName.includes(r.toLowerCase()));
      }
    }
    this.allRanges = ranges;
    this.allBeats = beatArray;
    
    if (this.selectedRange === 'all') {
      this.displayBeats = Array.from(new Set(beatArray.map(b => b.name))).sort();
    } else {
      this.displayBeats = beatArray
        .filter(b => b.parentName === this.selectedRange)
        .map(b => b.name)
        .sort();
    }

    console.log('✅ [Hierarchy] Sync Complete (Legacy Fallback):', this.allRanges.length, 'Ranges,', this.displayBeats.length, 'Beats');
    this.updateBeatCoverage();
  }

  updateBeatCoverage() {
    const totalReports = this.latestTotalReports || 1;
    let rangesToDisplay: string[] = [];
    if (this.allRanges && this.allRanges.length > 0) {
      rangesToDisplay = [...this.allRanges];
    } else {
      rangesToDisplay = Object.keys(this.latestRangeMap);
    }

    // Filter out duplicate or empty values
    rangesToDisplay = Array.from(new Set(rangesToDisplay.map(r => r.trim()).filter(Boolean)));

    // Filter by assigned range if the user is not Super Admin (role '1')
    if (this.userRole !== '1') {
      const allowedNames: string[] = [];
      if (this.assignedRange) {
        allowedNames.push(this.assignedRange.toLowerCase().trim());
      }
      const deepestName = localStorage.getItem('global_deepest_filter_name') || '';
      if (deepestName) {
        deepestName.split(',').forEach(n => allowedNames.push(n.toLowerCase().trim()));
      }
      const globalRange = localStorage.getItem('global_range_filter');
      if (globalRange && globalRange !== 'all') {
        allowedNames.push(globalRange.toLowerCase().trim());
      }
      if (this.allRanges && this.allRanges.length > 0) {
        this.allRanges.forEach(r => allowedNames.push(r.toLowerCase().trim()));
      }

      const uniqueAllowed = [...new Set(allowedNames)].filter(Boolean);
      if (uniqueAllowed.length > 0) {
        rangesToDisplay = rangesToDisplay.filter(r => 
          uniqueAllowed.some(allowed => r.toLowerCase().includes(allowed) || allowed.includes(r.toLowerCase()))
        );
      }
    }

    rangesToDisplay.sort((a, b) => {
      const valA = this.latestRangeMap[a.toLowerCase()] || 0;
      const valB = this.latestRangeMap[b.toLowerCase()] || 0;
      if (valB !== valA) {
        return valB - valA;
      }
      return a.localeCompare(b);
    });

    this.beatCoverage = rangesToDisplay.map(name => ({
       label: name.toUpperCase(),
       val: Math.round(((this.latestRangeMap[name.toLowerCase()] || 0) / totalReports) * 100),
       color: this.COLORS.p
    }));
    this.cdr.detectChanges();
  }

  onLayerChange(layerIndex: number) {
    const selectedEntityId = this.hierarchySelections[layerIndex];
    console.log(`🔄 [Hierarchy] Layer ${layerIndex} changed to:`, selectedEntityId);
    
    // 1. Clear all subsequent selections and entity arrays
    for (let i = layerIndex + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }

    // 2. Load next layer entities from V2 API
    if (selectedEntityId && layerIndex + 1 < this.layers.length) {
      const nextLayer = this.layers[layerIndex + 1];
      const parentIds = String(selectedEntityId).split(',').map(id => id.trim()).filter(Boolean);
      
      if (parentIds.length > 1) {
        // Parallel fetch for each parent ID and merge
        const observables = parentIds.map(pid => 
          this.dataService.listV2Entities(nextLayer.id, pid).pipe(
            catchError(() => of([]))
          )
        );
        
        forkJoin(observables).subscribe({
          next: (results: any[]) => {
            let mergedNodes: any[] = [];
            results.forEach((res: any) => {
              const nodes = res?.data || res || [];
              if (Array.isArray(nodes)) {
                mergedNodes = [...mergedNodes, ...nodes];
              }
            });
            
            // Unique nodes by ID
            const uniqueMap = new Map();
            mergedNodes.forEach(node => {
              if (node && node.id) {
                uniqueMap.set(String(node.id), node);
              }
            });
            
            this.layerEntities[nextLayer.id] = Array.from(uniqueMap.values());
            console.log(`🎯 [Hierarchy] Merged ${this.layerEntities[nextLayer.id].length} entities for Layer ID ${nextLayer.id}`);
            
            this.loadData(true);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error("❌ [Hierarchy] Parallel fetch failed:", err);
            this.loadData(true);
          }
        });
      } else {
        this.dataService.listV2Entities(nextLayer.id, selectedEntityId).subscribe({
          next: (res: any) => {
            const nodes = res?.data || res || [];
            this.layerEntities[nextLayer.id] = Array.isArray(nodes) ? nodes : [];
            console.log(`🎯 [Hierarchy] Populated ${this.layerEntities[nextLayer.id].length} entities for Layer ID ${nextLayer.id}`);
            
            this.loadData(true); // reload dashboard content
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error("❌ [Hierarchy] Failed to load entities:", err);
            this.loadData(true);
          }
        });
      }
    } else {
      this.loadData(true);
    }
  }

  shouldShowLayer(layerIndex: number): boolean {
    if (layerIndex === 0) return true;
    return !!this.hierarchySelections[layerIndex - 1];
  }

  isRecordMatchingHierarchy(r: any, deepestSelection: any): boolean {
    if (!deepestSelection) return true;
    
    const { entityId, name } = deepestSelection;
    if (!entityId) return true;
    
    const allowedIds = String(entityId).split(',').map(id => id.trim()).filter(Boolean);
    
    // Extract candidate IDs from the record (site_id, beat_id, entity_id, range_id)
    const isRanger = r.role_id === 4 || !!r.status || r.range_name !== undefined;
    const rawSiteId = r.site_id || r.siteId || r.beat_id || r.entity_id || r.range_id || (isRanger ? '' : r.id) || '';
    
    let recordIds: string[] = [];
    if (Array.isArray(rawSiteId)) {
      recordIds = rawSiteId.map(id => String(id).trim());
    } else if (rawSiteId) {
      recordIds = String(rawSiteId).split(',').map(id => id.trim());
    }
    
    if (recordIds.length > 0) {
      // 1. Direct Match: Check if any record ID is allowed
      if (recordIds.some(id => allowedIds.includes(id))) return true;
      
      // 2. Trace V2 hierarchy parents recursively for each record ID
      for (let startId of recordIds) {
        let currentId = startId;
        let visited = new Set<string>();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          let foundParentId: string | null = null;
          for (const layerId of Object.keys(this.layerEntities)) {
            const ent = this.layerEntities[Number(layerId)]?.find(e => String(e.id) === String(currentId));
            if (ent) {
              const pId = ent.parent_id !== undefined && ent.parent_id !== null ? ent.parent_id : ent.parentId;
              foundParentId = pId !== undefined && pId !== null ? String(pId) : null;
              break;
            }
          }
          if (foundParentId) {
            if (allowedIds.includes(foundParentId)) {
              return true;
            }
            currentId = foundParentId;
          } else {
            break;
          }
        }
      }
    }

    // 3. Fallback: Robust name string match
    if (name && name !== 'Assigned Location') {
      const fieldsToSearch = [
        r.beat_name, r.site_name, r.location, r.location_name,
        r.range_name, r.range, r.region, r.division_name, r.division,
        r.client_name, r.name, r.beat
      ];
      
      const namesList = name.split(',').map((n: string) => n.trim().toLowerCase());
      for (const f of fieldsToSearch) {
        if (f) {
          const fLower = String(f).toLowerCase();
          if (namesList.some((n: string) => fLower.includes(n))) {
            return true;
          }
        }
      }
    }
    
    // 4. Fallback: Trace through allBeats mapping if Range is the selection
    if (name && name !== 'Assigned Location' && this.allBeats && this.allBeats.length > 0) {
      const rBeat = (r.beat_name || r.site_name || r.location || '').toLowerCase();
      const bObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
      const resolvedRange = (r.range_name || r.range || (bObj ? bObj.parentName : '')).toLowerCase();
      
      const namesList = name.split(',').map((n: string) => n.trim().toLowerCase());
      if (resolvedRange && namesList.some((n: string) => resolvedRange.includes(n) || n.includes(resolvedRange))) {
         return true;
      }
    }
    
    return false;
  }

  getAllDescendantEntityIds(startIds: string[]): string[] {
    const result = new Set<string>(startIds);
    const queue = [...startIds];
    
    while (queue.length > 0) {
      const currentParentId = queue.shift()!;
      for (const layerId of Object.keys(this.layerEntities)) {
        const entities = this.layerEntities[Number(layerId)] || [];
        for (const ent of entities) {
          const pId = ent.parent_id !== undefined && ent.parent_id !== null ? String(ent.parent_id) : (ent.parentId !== undefined && ent.parentId !== null ? String(ent.parentId) : '');
          if (pId === currentParentId) {
            const childId = String(ent.id);
            if (!result.has(childId)) {
              result.add(childId);
              queue.push(childId);
            }
          }
        }
      }
    }
    return Array.from(result);
  }

  onRangeFilterChange() {
    console.log('🔄 Range Filter Changed:', this.selectedRange);
    this.selectedBeat = 'all';
    // 🌐 Persist
    localStorage.setItem('global_range_filter', this.selectedRange);
    localStorage.setItem('global_beat_filter', 'all');
    
    if (this.selectedRange === 'all') {
      this.displayBeats = Array.from(new Set(this.allBeats.map(b => b.name))).sort();
    } else {
      this.displayBeats = this.allBeats
        .filter(b => b.parentName === this.selectedRange)
        .map(b => b.name)
        .sort();
    }
    
    this.doRefresh(false);
  }

  fetchKPI(category: string, range: string) {
    // If V2 hierarchy selections are active, don't let this API overwrite the precise locally-filtered counts
    let hasV2Selection = false;
    if (this.hierarchySelections) {
      hasV2Selection = this.hierarchySelections.some(sel => sel && sel !== 'null');
    }
    const hasLegacySelection = (this.selectedRange && this.selectedRange !== 'all') || (this.selectedBeat && this.selectedBeat !== 'all');
    
    if (hasV2Selection || hasLegacySelection) {
      console.log(`♻️ Skipping fetchKPI overwrite because active filters are set.`);
      return;
    }

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


  resetAllFilters() {
    if (this.layers && this.layers.length > 0) {
      this.hierarchySelections = new Array(this.layers.length).fill(null);
      const firstLayer = this.layers[0];
      const companyId = localStorage.getItem('company_id') || localStorage.getItem('user_company_id') || '1';
      this.dataService.listV2Entities(firstLayer.id, null, false, companyId).subscribe({
        next: (entRes: any) => {
          const nodes = entRes?.data || entRes || [];
          let rawNodes = Array.isArray(nodes) ? nodes : [];
          
          const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';
          if (isRestrictedAdmin) {
            const adminLayerId = localStorage.getItem('admin_layer_id');
            const adminEntityId = localStorage.getItem('admin_entity_id');
            if (String(firstLayer.id) === String(adminLayerId) && adminEntityId) {
              const allowedIds = adminEntityId.split(',').map(id => id.trim()).filter(Boolean);
              rawNodes = rawNodes.filter(n => allowedIds.includes(String(n.id)));
            }
          }
          
          this.layerEntities[firstLayer.id] = rawNodes;
          this.cdr.detectChanges();
        }
      });
    }

    if (this.userRole === '1') {
      this.selectedRange = 'all';
      this.selectedBeat = 'all';
      localStorage.setItem('global_range_filter', 'all');
      localStorage.setItem('global_beat_filter', 'all');
      localStorage.removeItem('global_deepest_filter_name');
      localStorage.removeItem('global_hierarchy_chain');
    } else {
      this.selectedRange = this.assignedRange || 'all';
      this.selectedBeat = this.assignedBeat || 'all';
      localStorage.setItem('global_range_filter', this.selectedRange);
      localStorage.setItem('global_beat_filter', this.selectedBeat);
      localStorage.removeItem('global_deepest_filter_name');
      localStorage.removeItem('global_hierarchy_chain');
    }
    this.activeDateFilter = 'today';
    this.dateFrom = '';
    this.dateTo = '';
    localStorage.setItem('global_date_filter', 'today');
    localStorage.setItem('global_date_from', '');
    localStorage.setItem('global_date_to', '');
    this.loadHierarchy();
    this.doRefresh(false);
  }

  segmentChanged(event: any) {
  const val = event.detail.value;
  this.selectedTimeframe = val;
  this.activeDateFilter = val;

  console.log('🕒 Fetching for:', val);
  localStorage.setItem('global_date_filter', val);
  if (val !== 'custom') {
    localStorage.removeItem('global_date_from');
    localStorage.removeItem('global_date_to');
  }

  // 1. Pehle Cards update karo
  this.fetchKPI('crimes', val);
  this.fetchKPI('events', val);

  // 2. Thoda gap dekar charts aur data load karo
  setTimeout(() => {
    this.loadData(false);
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
        const c = this._charts[id] as any;
        if (c && typeof c.destroy === 'function') {
          c.destroy();
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
    } else if (this.activeSegment === 'officers') {
      setTimeout(() => {
        this.initAttChart();
      }, 100);
    }
  }

  ionViewWillEnter() {
    const userRole = localStorage.getItem('user_role');
    const isRestrictedAdmin = localStorage.getItem('is_restricted_admin') === 'true';
    
    // 🛡️ Security: Redirect to Home if role is 3 (Guard/Employee)
    if (userRole === '3') {
      console.warn("❌ FORCE_LOG: Access Denied! userRole is 3 (Guard). Redirecting to home.");
      this.navCtrl.navigateRoot('/home');
      return;
    }

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
      this.markerGroup = L.featureGroup().addTo(this.map);

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

        // --- Premium Popup Data ---
        const reportId = pin.report_id || pin.id || 'N/A';
        const formattedDate = new Date(pin.created_at || pin.date || Date.now()).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        });
        const coords = `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`;
        const locationName = pin.site_name || pin.beat_name || pin.location_name || pin.location || 'Forest Area';
        const reporterName = pin.created_by_name || pin.reporter_name || 'System';
        const subject = pin.subject || pin.title || pin.displayLabel || 'No subject provided';
        
        // Dynamic fields extraction (e.g., Mineral/Volume for Mining)
        let dynamicHtml = '';
        if (pin.layerId === 'illegal_mining') {
          const mineral = pin.mineral || 'Murrum';
          const vol = pin.volume || '8';
          dynamicHtml = `
            <div class="popup-divider"></div>
            <div class="popup-fields-grid">
              <div class="field-box">
                <div class="f-lbl">MINERAL</div>
                <div class="f-val">${mineral}</div>
              </div>
              <div class="field-box">
                <div class="f-lbl">VOL (CUM)</div>
                <div class="f-val">${vol}</div>
              </div>
            </div>
          `;
        } else if (pin.layerId === 'illegal_felling') {
            const species = pin.species || 'Teak';
            const count = pin.tree_count || '1';
            dynamicHtml = `
            <div class="popup-divider"></div>
            <div class="popup-fields-grid">
              <div class="field-box">
                <div class="f-lbl">SPECIES</div>
                <div class="f-val">${species}</div>
              </div>
              <div class="field-box">
                <div class="f-lbl">COUNT</div>
                <div class="f-val">${count}</div>
              </div>
            </div>
          `;
        }

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon })
            .addTo(this.markerGroup)
            .bindPopup(`
              <div class="popup-container">
                <div class="popup-banner" style="background: ${markerColor}">
                  <div class="pb-left">
                    <span class="cat-ico">${markerEmoji}</span>
                    <span class="cat-nm">${labelText}</span>
                  </div>
                  <div class="pb-right">#${reportId}</div>
                </div>

                <div class="popup-body">
                  <div class="popup-meta-list">
                    <div class="meta-row">
                      <ion-icon name="calendar-outline"></ion-icon>
                      <span>${formattedDate}</span>
                    </div>
                    <div class="meta-row highlight">
                      <ion-icon name="location-outline"></ion-icon>
                      <span>${locationName}</span>
                    </div>
                    <div class="meta-row">
                       <ion-icon name="pin-outline"></ion-icon>
                       <span style="color: #6366f1; font-weight: 800;">${coords}</span>
                    </div>
                    <div class="meta-row highlight">
                      <ion-icon name="person-circle-outline"></ion-icon>
                      <span>Reported by: ${reporterName}</span>
                    </div>
                  </div>

                  ${dynamicHtml}

                  <div class="popup-note">
                    <span class="n-lbl">Subject:</span> ${subject}
                  </div>

                  <button class="popup-footer-btn" id="btn-detailed-${reportId}">
                    <ion-icon name="document-text-outline"></ion-icon>
                    View Detailed Report
                  </button>
                </div>
              </div>
            `, {
              className: 'premium-popup',
              maxWidth: 300,
              minWidth: 280
            });


        // Add click listener to the popup button after it opens
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-detailed-${reportId}`);
          if (btn) {
            btn.onclick = () => {
              this.zone.run(() => {
                this.viewDetailedReport(pin);
              });
            };
          }
        });
    });

    // 🔥 AUTO-ZOOM: Fit bounds to show markers (Highest concentration area)
    if (this.shouldFitMapOnce && this.markerGroup && this.markerGroup.getLayers().length > 0) {
        try {
            const bounds = this.markerGroup.getBounds();
            if (this.map) {
                this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                this.shouldFitMapOnce = false; // Zoom only once
            }
        } catch (e) {
            console.error('Error auto-zooming map:', e);
        }
    }
}

viewDetailedReport(pin: any) {
  console.log("Navigating to detailed report for:", pin);
  // Determine target page based on layerId
  let targetPage = '/home/admin-events-records';
  if (pin.layerId === 'illegal_mining' || pin.layerId === 'illegal_felling' || pin.layerId === 'animal_poaching' || pin.layerId === 'timber_storage' || pin.layerId === 'encroachment') {
    targetPage = '/home/admin-criminal-records';
  } else if (pin.layerId === 'fire_alerts') {
    targetPage = '/home/admin-fire-records';
  }
  
  this.navCtrl.navigateForward(targetPage, {
    state: { selectedReportId: pin.id || pin.report_id }
  });
}


changeTimeframe(newTimeframe: string) {
  this.selectedTimeframe = newTimeframe; 
  this.activeDateFilter = newTimeframe;
  
  if (this.trendChart) {
    this.trendChart.destroy();
  }

  this.loadData(true);
}

  loadData(force: boolean = false) {
    if (force || !this.lastTrendState) {
      this.isStatsLoading = true;
    }
    console.log('DEBUG: DataService Object ->', this.dataService);
    if (this.isFetching) return;

    if (force) {
      this.allReportsCache = null;
      this.allAssetsCache = null;
    }

    const storageData = localStorage.getItem('user_data');
    if (!storageData) return;

    const user = JSON.parse(storageData);
    const myCompanyId = Number(user.company_id || user.companyId);
    this.myCompanyId = myCompanyId; 

    if (!myCompanyId || isNaN(myCompanyId)) {
      console.error('CRITICAL: Company ID missing or invalid!', myCompanyId);
      return;
    }

    // Refresh hierarchy data (Ranges/Beats) on every load
    this.loadHierarchy();
    
    // 🌐 Restore & Sync State
    const savedFilter = localStorage.getItem('global_date_filter') || 'today';
    this.activeDateFilter = savedFilter;
    this.selectedTimeframe = savedFilter;

    localStorage.setItem('global_date_filter', this.activeDateFilter);
    localStorage.setItem('global_range_filter', this.selectedRange);
    localStorage.setItem('global_beat_filter', this.selectedBeat);

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

    // --- DYNAMIC DATABASE FETCH (FORCE SYNC - Fixed for Local Time) ---
    // Only fetch reports and assets if they aren't cached yet
    const fetchReportsObs = this.allReportsCache ? of(this.allReportsCache) : this.dataService.getForestReports(undefined, force);
    const fetchAssetsObs = this.allAssetsCache ? of(this.allAssetsCache) : this.dataService.getAssets(myCompanyId);

    // FETCH STATS AND ALERTS - TRY V2 FIRST, FALLBACK TO LEGACY
    const processStatsResponse = (apiResponse: any) => {
        console.log("📊 Admin Dashboard Response (Stats):", apiResponse);
        const res = apiResponse.data ? apiResponse.data : apiResponse;
        
        // Map V2 KPIs if present
        const kpis = res.kpis;
        if (kpis) {
          if (kpis.onDuty !== undefined) this.onDutyCount = Number(kpis.onDuty);
          if (kpis.patrolCount !== undefined) this.patrolCount = Number(kpis.patrolCount);
          if (kpis.criminal !== undefined) this.criminalCount = Number(kpis.criminal);
          if (kpis.events !== undefined) this.eventsCount = Number(kpis.events);
          if (kpis.fire !== undefined) this.fireAlertsCount = Number(kpis.fire);
          if (kpis.assets !== undefined) this.totalAssetsCount = Number(kpis.assets);
          
          this.incidentsCount = this.criminalCount + this.eventsCount + this.fireAlertsCount;
        } else {
          // Legacy stats fallback
          const stats = res.stats?.data || res.stats || {};
          const summaryFire = Number(stats.fire_count || stats.fireEvents || 0);
          this.incidentsCount = Number(stats.total_incidents || stats.total_events || 0);
          
          // Only set these if they are currently 0 (Initial Load)
          if (this.fireAlertsCount === 0) this.fireAlertsCount = summaryFire;
        }

        // Populate Alerts for the Map
        const alertsList = res.alerts || res.sos || [];
        this.alerts = alertsList.map((a: any) => ({
          id: a.id,
          title: a.title || a.message || 'SOS Alert',
          description: a.description || `Generated by ${a.created_by_name || 'System'}`,
          severity: (a.title || a.message || '').toLowerCase().includes('fire') ? 'critical' : 'warning',
          category: a.category || 'SOS',
          beat_name: a.beat_name || 'Unknown',
          created_at: a.created_at || new Date().toISOString(),
          lat: parseFloat(a.latitude || a.lat || '0'),
          lng: parseFloat(a.longitude || a.lng || '0'),
          location_name: a.location_name || a.location || 'Unknown Area',
          action_taken: a.action_taken || false
        })).filter((a: any) => a.lat !== 0 && a.lng !== 0);
        
        // Update Layer Counters
        if (this.map && this.activeSegment === 'map') {
          this.updateFilteredAlerts();
        }
    };

    const adminLayerId = localStorage.getItem('admin_layer_id');
    const adminEntityId = localStorage.getItem('admin_entity_id');
    
    let payload: any = {
      date_from: dates.from,
      date_to: dates.to
    };

    if (adminLayerId && adminEntityId) {
      payload.layer_id = adminLayerId;
      payload.entity_id = adminEntityId.split(',').map(id => id.trim()).filter(Boolean);
      payload.is_restricted = true;
    }

    // Try V2 Dashboard API first
    this.dataService.getV2DashboardData(payload).subscribe({
      next: (v2Response: any) => {
        console.log("✅ V2 Dashboard API Success");
        processStatsResponse(v2Response);
      },
      error: () => {
        console.warn("⚠️ V2 Dashboard API failed, falling back to legacy...");
        // Fallback to legacy endpoint
        this.dataService.getDashboardStats(myCompanyId, dates.from, dates.to).subscribe({
          next: processStatsResponse,
          error: (err) => console.error("Stats Fetch Error:", err)
        });
      }
    });

    // FETCH AND PROCESS REPORTS/ASSETS (INSTANT IF CACHED)
    forkJoin({
      reports: fetchReportsObs,
      assets: fetchAssetsObs
    }).subscribe({
      next: ({ reports, assets }: { reports: any, assets: any }) => {
        if (!this.allReportsCache) {
          this.allReportsCache = Array.isArray(reports) ? reports : (reports.data || []);
        }
            if (!this.allAssetsCache) {
              this.allAssetsCache = Array.isArray(assets) ? assets : (assets.data || []);
            }
            
            const list = this.allReportsCache || [];
            const assetList = this.allAssetsCache || [];

            // Resolve deepest V2 hierarchy selection
            this.deepestSelection = null;
            if (this.layers && this.layers.length > 0 && this.hierarchySelections) {
              for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
                if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
                  const selId = this.hierarchySelections[i];
                  const layerId = this.layers[i].id;
                  
                  const ids = String(selId).split(',');
                  const names: string[] = [];
                  ids.forEach(id => {
                    const ent = this.layerEntities[layerId]?.find((e: any) => String(e.id) === String(id.trim()));
                    if (ent) names.push(ent.name || ent.label || '');
                  });

                  if (names.length > 0) {
                    this.deepestSelection = { entityId: selId, name: names.join(', ') };
                    break;
                  } else {
                    this.deepestSelection = { entityId: selId, name: 'Assigned Location' };
                    break;
                  }
                }
              }
            }
            // Compute all allowed descendant IDs for detail pages
            let activeEntityIds: string[] = [];
            if (this.deepestSelection) {
              activeEntityIds = String(this.deepestSelection.entityId).split(',').map(id => id.trim()).filter(Boolean);
            } else if (localStorage.getItem('is_restricted_admin') === 'true') {
              const adminEntityId = localStorage.getItem('admin_entity_id');
              if (adminEntityId) {
                activeEntityIds = adminEntityId.split(',').map(id => id.trim()).filter(Boolean);
              }
            }

            if (activeEntityIds.length > 0) {
              const allDescendantIds = this.getAllDescendantEntityIds(activeEntityIds);
              localStorage.setItem('global_allowed_entity_ids', JSON.stringify(allDescendantIds));
              console.log("🔍 [Admin Dashboard] Saved Descendant IDs:", allDescendantIds);
            } else {
              localStorage.removeItem('global_allowed_entity_ids');
            }

            // 🌐 Persist V2 hierarchy filter to localStorage for detail pages
            if (this.deepestSelection) {
              console.log("🔍 [Admin Dashboard] Active V2 Deepest Selection:", this.deepestSelection);
              localStorage.setItem('global_deepest_filter_name', this.deepestSelection.name || '');
              // Build full hierarchy chain names for multi-level matching
              const chainNames: string[] = [];
              if (this.layers && this.hierarchySelections) {
                for (let ci = 0; ci < this.hierarchySelections.length; ci++) {
                  if (this.hierarchySelections[ci] && this.hierarchySelections[ci] !== 'null') {
                    const cLayerId = this.layers[ci]?.id;
                    const cEnt = this.layerEntities[cLayerId]?.find((e: any) => String(e.id) === String(this.hierarchySelections[ci]));
                    if (cEnt) chainNames.push(cEnt.name || cEnt.label || '');
                  }
                }
              }
              localStorage.setItem('global_hierarchy_chain', JSON.stringify(chainNames));
              
              // 🔥 NEW: Map V2 hierarchy back to legacy filters for compatibility with Patrol Logs page
              if (chainNames.length > 0) {
                 localStorage.setItem('global_range_filter', chainNames[0]);
                 if (chainNames.length > 1) {
                    localStorage.setItem('global_beat_filter', chainNames[1]);
                 } else {
                    localStorage.setItem('global_beat_filter', 'all');
                 }
              }

            } else {
              localStorage.removeItem('global_deepest_filter_name');
              localStorage.removeItem('global_hierarchy_chain');
              
              // Reset legacy filters
              localStorage.setItem('global_range_filter', 'all');
              localStorage.setItem('global_beat_filter', 'all');
            }

            // Calculate Period Dates dynamically based on date filter
            let periodDates: string[] = [];
            const now = new Date(nowL);
            if (this.activeDateFilter === 'today') {
               periodDates = [todayYMD];
            } else if (this.activeDateFilter === 'week') {
               periodDates = Array.from({length: 7}, (_, i) => {
                  const d = new Date(now);
                  d.setDate(now.getDate() - (6 - i));
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${d.getFullYear()}-${m}-${day}`;
               });
            } else if (this.activeDateFilter === 'month') {
               periodDates = Array.from({length: 30}, (_, i) => {
                  const d = new Date(now);
                  d.setDate(now.getDate() - (29 - i));
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${d.getFullYear()}-${m}-${day}`;
               });
            } else if (this.activeDateFilter === 'custom' && dates.from && dates.to) {
               const start = new Date(dates.from);
               const end = new Date(dates.to);
               const diffTime = Math.abs(end.getTime() - start.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
               const totalDays = Math.min(diffDays, 90);
               periodDates = Array.from({length: totalDays}, (_, i) => {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${d.getFullYear()}-${m}-${day}`;
               });
            } else {
               periodDates = Array.from({length: 30}, (_, i) => {
                  const d = new Date(now);
                  d.setDate(now.getDate() - (29 - i));
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${d.getFullYear()}-${m}-${day}`;
               });
            }
            this.currentPeriodDates = periodDates;

            // Helper for robust date parsing (Shared for Assets and Reports)
            const getTS = (d: any) => {
              if (!d) return 0;
              if (typeof d === 'string' && d.includes('-')) {
                const parts = d.split('T')[0].split(' ')[0].split('-');
                if (parts[0].length === 2 && parts[2].length === 4) {
                  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                }
              }
              return new Date(d).getTime();
            };

            // --- A. PROCESS ASSETS ---
            if (assetList.length > 0) {
              console.log("📊 Asset Sync: Found", assetList.length, "Total Assets");
              
              // --- ADD FILTERING LOGIC FOR ASSETS ---
              let filteredAssets = assetList.filter((a: any) => {
                 const aDate = a.created_at || a.date_time || a.date || '';
                 
                 // Date filter
                 let datePass = true;
                 if (this.activeDateFilter === 'today') {
                    datePass = aDate && (aDate.includes(todayYMD) || aDate.includes(todayDMY));
                  } else if (this.activeDateFilter === 'week') {
                     const rTimestamp = getTS(aDate);
                     const nowTS = nowL.getTime();
                     datePass = rTimestamp > (nowTS - (7 * 24 * 60 * 60 * 1000));
                  } else if (this.activeDateFilter === 'month') {
                     const rTimestamp = getTS(aDate);
                     const nowTS = nowL.getTime();
                     datePass = rTimestamp > (nowTS - (30 * 24 * 60 * 60 * 1000));
                  } else if (this.activeDateFilter === 'custom') {
                     const rTimestamp = getTS(aDate);
                     const fromTS = new Date(dates.from).setHours(0, 0, 0, 0);
                     const toTS = new Date(dates.to).setHours(23, 59, 59, 999);
                     datePass = rTimestamp >= fromTS && rTimestamp <= toTS;
                  }

                  // Hierarchy or Legacy filter
                  let hierarchyPass = true;
                  if (this.deepestSelection) {
                    hierarchyPass = this.isRecordMatchingHierarchy(a, this.deepestSelection);
                  } else {
                    // Range filter (Inclusive)
                    let rangePass = true;
                    if (this.selectedRange && this.selectedRange !== 'all') {
                       rangePass = this.dataService.isNameMatching(a.range_name || a.range, this.selectedRange);
                    }

                    // Beat filter (Inclusive)
                    let beatPass = true;
                    if (this.selectedBeat && this.selectedBeat !== 'all') {
                       beatPass = this.dataService.isNameMatching(a.beat_name || a.beat, this.selectedBeat);
                    }
                    hierarchyPass = rangePass && beatPass;
                  }

                  return datePass && hierarchyPass;
               });

              this.totalAssetsCount = filteredAssets.length;
              
              // Category Reset
              this.realNurseryCount = 0;
              this.realPlantationCount = 0;
              this.realOfficeCount = 0;
              this.realEcoCount = 0;
              let goodCount = 0;

              filteredAssets.forEach((a: any) => {
                const cat = (a.category || '').toLowerCase();
                const status = (a.status || '').toLowerCase();

                if (cat.includes('nursery')) this.realNurseryCount++;
                else if (cat.includes('plantation')) this.realPlantationCount++;
                else if (cat.includes('office')) this.realOfficeCount++;
                else if (cat.includes('eco')) this.realEcoCount++;

                if (status === 'good' || status === 'operational') goodCount++;
              });

              this.operationalRate = filteredAssets.length > 0 
                ? Math.round((goodCount / filteredAssets.length) * 100) + '%' 
                : '100%';

              // ADD ASSET TREND DATA
              const assetsTrendMap: { [date: string]: number } = {};
              assetList.forEach((a: any) => {
                 const aDate = a.created_at || a.date_time || a.date || '';
                 let dateYMD = '';
                 if (aDate && aDate.includes('-')) {
                     const parts = aDate.split('T')[0].split(' ')[0].split('-');
                     if (parts.length === 3) {
                       dateYMD = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                     }
                 }
                 if (dateYMD) {
                     assetsTrendMap[dateYMD] = (assetsTrendMap[dateYMD] || 0) + 1;
                 }
              });

              const last30 = Array.from({length: 30}, (_, i) => {
                 const d = new Date();
                 d.setDate(d.getDate() - (29 - i));
                 const m = String(d.getMonth() + 1).padStart(2, '0');
                 const day = String(d.getDate()).padStart(2, '0');
                 return `${d.getFullYear()}-${m}-${day}`;
              });
              this.assetsTrendData = last30.map(d => assetsTrendMap[d] || 0);
            }


            // --- B. PROCESS REPORTS ---
            if (list.length > 0) {
                console.log("📊 Direct Database Sync: Found", list.length, "Total Records");
                
                const counts = { criminal: 0, monitoring: 0, fire: 0 };
                const trendMap: { [cat: string]: { [date: string]: number } } = { crim: {}, events: {}, fire: {} };
                const rangeMap: { [name: string]: number } = {};
                const seenIds = new Set();

                const subCatTrendMap: { [id: string]: { [date: string]: number } } = {};
                this.masterSnapshotCards.forEach(c => {
                  c.count = 0;
                  subCatTrendMap[c.id] = {};
                });

                list.forEach((r: any) => {
                   // Prevent double counting duplicates
                   const rId = r.id || (r.latitude + '_' + r.longitude + '_' + (r.created_at || r.date));
                   if (seenIds.has(rId)) return;
                   seenIds.add(rId);

                   const cat = (r.category || '').toLowerCase();
                   const rDate = r.date || ''; 
                   const rCreatedAt = r.created_at || r.date_time || '';
                   
                   // Hierarchy Resolution (Standardized with sub-pages)
                   const rBeat = (r.beat_name || r.site_name || r.location || '').toLowerCase();
                   const beatObj = this.allBeats.find(b => b.name.toLowerCase() === rBeat);
                   const rRange = (r.range_name || r.range || r.region || (beatObj ? beatObj.parentName : '') || 'General').toLowerCase();

                   const rFullDate = rCreatedAt || rDate;
                   const rTimestamp = getTS(rFullDate);
                   
                   // Robust Today Check
                   const isToday = (rFullDate && (rFullDate.includes(todayYMD) || rFullDate.includes(todayDMY) || rFullDate.includes(todayYMD.replace(/-/g, '/'))));

                   // Timeframe Checks for Week/Month (Calendar-based for Parity)
                   const dayStart = new Date(nowL).setHours(0, 0, 0, 0);
                   const isThisWeek = rTimestamp >= (dayStart - (7 * 24 * 60 * 60 * 1000));
                   const isThisMonth = rTimestamp >= (dayStart - (30 * 24 * 60 * 60 * 1000));

                   // Record for trend mapping (Last 30 Days logic)
                   let dateYMD = '';
                   if (rFullDate && rFullDate.includes('-')) {
                     const parts = rFullDate.split(' ')[0].split('-');
                     dateYMD = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                   }
                   
                   // Robust Categorization (Independent checks for count parity)
                   const rType = (r.report_type || r.event_type || r.type || '').toLowerCase();
                   const subCatStr = (r.sub_category || '').toLowerCase();
                   const combinedText = `${cat} ${rType} ${subCatStr}`.toLowerCase();
                    
                   let isFire = combinedText.includes('fire');
                   let isCrim = combinedText.includes('crim') || combinedText.includes('poach') || combinedText.includes('mining') || combinedText.includes('fell') || combinedText.includes('timber') || combinedText.includes('storage') || combinedText.includes('transport') || combinedText.includes('sos');
                   let isEvent = combinedText.includes('event') || combinedText.includes('sight') || combinedText.includes('monit') || combinedText.includes('animal') || combinedText.includes('flora') || combinedText.includes('fauna');

                   // Standardize catKey for Trend Mapping (Dashboard Trend only shows one category per record)
                   let catKey = '';
                   if (isFire) catKey = 'fire';
                   else if (isCrim) catKey = 'crim';
                   else if (isEvent) catKey = 'events';

                   if (catKey && dateYMD) {
                     trendMap[catKey][dateYMD] = (trendMap[catKey][dateYMD] || 0) + 1;
                   }

                   // Specific Sub-category resolution for Dynamic Snapshot Cards
                   let exactId = '';
                   if (isFire) exactId = 'fire';
                   else if (combinedText.includes('fell')) exactId = 'illegal_felling';
                   else if (combinedText.includes('transport')) exactId = 'timber_transport';
                   else if (combinedText.includes('storage')) exactId = 'timber_storage';
                   else if (combinedText.includes('poach')) exactId = 'wild_animal_poaching';
                   else if (combinedText.includes('encroach')) exactId = 'encroachment';
                   else if (combinedText.includes('mining')) exactId = 'illegal_mining';
                   else if (combinedText.includes('jfmc')) exactId = 'jfmc';
                   else if (combinedText.includes('sight') || combinedText.includes('animal')) exactId = 'wild_animal_sighting';
                   else if (combinedText.includes('water')) exactId = 'water_source';
                   else if (combinedText.includes('compens')) exactId = 'wildlife_compensation';

                   if (exactId && dateYMD) {
                      subCatTrendMap[exactId][dateYMD] = (subCatTrendMap[exactId][dateYMD] || 0) + 1;
                   }

                   // Hierarchy Filtering logic
                   let isPass = true;

                   if (this.deepestSelection) {
                      isPass = this.isRecordMatchingHierarchy(r, this.deepestSelection);
                   } else {
                      // RANGE FILTER (Inclusive Matching)
                      if (this.selectedRange && this.selectedRange !== 'all') {
                         if (!this.dataService.isNameMatching(rRange, this.selectedRange)) isPass = false;
                      }

                      // BEAT FILTER (Inclusive Matching)
                      if (isPass && this.selectedBeat && this.selectedBeat !== 'all') {
                         if (!this.dataService.isNameMatching(rBeat, this.selectedBeat)) isPass = false;
                      }
                   }

                   // DATE FILTER (Dashboard context: Today/Week/Month)
                   if (isPass) {
                      if (this.activeDateFilter === 'today' && !isToday) isPass = false;
                      else if (this.activeDateFilter === 'week' && !isThisWeek) isPass = false;
                      else if (this.activeDateFilter === 'month' && !isThisMonth) isPass = false;
                      else if (this.activeDateFilter === 'custom') {
                        const fromTS = new Date(dates.from).setHours(0, 0, 0, 0);
                        const toTS = new Date(dates.to).setHours(23, 59, 59, 999);
                        if (rTimestamp < fromTS || rTimestamp > toTS) isPass = false;
                      }
                   }

                   if (isPass) {
                      if (isFire) counts.fire++;
                      if (isCrim) counts.criminal++;
                      if (isEvent) counts.monitoring++;

                      // Increment snapshot card count
                      if (exactId) {
                        const card = this.masterSnapshotCards.find(c => c.id === exactId);
                        if (card) card.count++;
                      }
                      
                      // Populate rangeMap for Coverage (Filtered by current criteria)
                      let matchedRange = '';
                      if (this.allRanges && this.allRanges.length > 0) {
                        const fieldsToSearch = [
                          r.beat_name, r.site_name, r.location, r.location_name,
                          r.range_name, r.range, r.region, r.division_name, r.division,
                          r.client_name, r.name, r.beat, r.displayRange, r.displayBeat
                        ];
                        for (const range of this.allRanges) {
                          const lowerRange = range.toLowerCase();
                          if (fieldsToSearch.some(f => f && String(f).toLowerCase().includes(lowerRange))) {
                            matchedRange = lowerRange;
                            break;
                          }
                        }
                      }
                      const normalizedRange = matchedRange || rRange.toLowerCase().trim() || 'general';
                      rangeMap[normalizedRange] = (rangeMap[normalizedRange] || 0) + 1;
                   }
                });

                const last30 = Array.from({length: 30}, (_, i) => {
                   const d = new Date();
                   d.setDate(d.getDate() - (29 - i));
                   const m = String(d.getMonth() + 1).padStart(2, '0');
                   const day = String(d.getDate()).padStart(2, '0');
                   return `${d.getFullYear()}-${m}-${day}`;
                });

                const getTrendArr = (k: string) => last30.map(d => trendMap[k][d] || 0);
                this.criminalTrendData = getTrendArr('crim');
                this.eventsTrendData = getTrendArr('events');
                this.fireTrendData = getTrendArr('fire');

                // Build trend arrays for snapshot cards
                this.masterSnapshotCards.forEach(card => {
                  if (card.id === 'assets') {
                    card.trend = this.assetsTrendData;
                  } else {
                    card.trend = last30.map(d => subCatTrendMap[card.id][d] || 0);
                  }
                });

                // --- 📅 CALCULATE TOTALS FOR SNAPSHOT (Dynamic Filtered) ---
                this.latestTotalReports = Object.values(rangeMap).reduce((a: any, b: any) => a + b, 0) || 1;
                this.latestRangeMap = rangeMap;
                this.updateBeatCoverage();

                this.criminalCount = counts.criminal;
                this.eventsCount = counts.monitoring;
                this.fireAlertsCount = counts.fire;

                // Sync Bottom Snapshot variables
                this.criminalActivityCount = this.criminalCount;
                this.sightingsCount = this.eventsCount;

                // Total Summary
                const totalSummary = this.criminalCount + this.eventsCount + this.fireAlertsCount;
                
                // 🛑 Smart Guard: Prevent re-rendering if counts haven't changed
                const currentSyncState = `${this.criminalCount}-${this.eventsCount}-${this.fireAlertsCount}-${this.totalAssetsCount}`;
                if (this.lastDashboardState === currentSyncState) {
                   console.log("♻️ Data identical, skipping chart re-render.");
                   this.isFetching = false;
                   this.cdr.detectChanges();
                   return;
                }
                this.lastDashboardState = currentSyncState;

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
                      } else if (this.activeDateFilter === 'custom') {
                         const rTimestamp = fDate ? new Date(fDate).getTime() : 0;
                         const fromTS = new Date(dates.from).getTime();
                         const toTS = new Date(dates.to).getTime() + (24 * 60 * 60 * 1000) - 1;
                         isPass = rTimestamp >= fromTS && rTimestamp <= toTS;
                      }

                      // HIERARCHY FILTER on map pins
                      if (isPass) {
                        if (this.deepestSelection) {
                          isPass = this.isRecordMatchingHierarchy(f, this.deepestSelection);
                        } else {
                          // RANGE FILTER on map pins
                          if (this.selectedRange && this.selectedRange !== 'all') {
                            const fRange = f.range_name || f.range || f.region || '';
                            if (!this.dataService.isNameMatching(fRange, this.selectedRange)) isPass = false;
                          }

                          // BEAT FILTER on map pins
                          if (isPass && this.selectedBeat && this.selectedBeat !== 'all') {
                            const fBeat = f.beat_name || f.beat || '';
                            if (!this.dataService.isNameMatching(fBeat, this.selectedBeat)) isPass = false;
                          }
                        }
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
                      else if (fullType.includes('timber storage')) layerId = 'timber_storage';
                      else if (fullType.includes('timber transport')) layerId = 'timber_transport';
                      else if (fullType.includes('timber')) layerId = 'timber_storage';
                      else if (fullType.includes('sight')) layerId = 'animal_sighting';
                      else if (fullType.includes('water')) layerId = 'water_status';
                      else if (fullType.includes('jfmc') || fullType.includes('social')) layerId = 'jfmc';
                      else if (fullType.includes('compensation')) layerId = 'wildlife_compensation';
                      else if (fullType.includes('fire')) layerId = 'fire_alerts';
                      else if (fullType.includes('storage')) layerId = 'timber_storage';
                      else if (fullType.includes('transport')) layerId = 'timber_transport';
                      else if (fullType.includes('sos')) layerId = 'sos';
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
                
                // 🔄 SYNC DASHBOARD COUNTS
                // We use the counts calculated during the full list iteration (which includes records without coordinates)
                this.criminalCount = counts.criminal;
                this.eventsCount = counts.monitoring;
                this.fireAlertsCount = counts.fire;
                this.incidentsCount = counts.criminal + counts.monitoring + counts.fire;

                // Sync Bottom Snapshot variables for the Home page
                this.criminalActivityCount = this.criminalCount;
                this.sightingsCount = this.eventsCount;

                console.log(`%c📊 Robust KPI Sync: Criminal=${this.criminalCount}, Events=${this.eventsCount}, Fire=${this.fireAlertsCount}`, 'color: #10b981; font-weight: bold;');

                this.updateVisiblePins();
                
                this.loadTrendData();
                this.initHomeCharts();
                this.cdr.detectChanges();

                // --- 🚨 ALERTS & SOS PROCESSING (Enhanced with Forest Reports) ---
                const rawAlerts = this.alerts || [];
                
                // Add fire alerts from system alerts to KPI if they are from today
                rawAlerts.forEach((a: any) => {
                   const aType = (a.type || a.category || a.report_type || '').toLowerCase();
                   const aDate = a.created_at || a.date || '';
                   const isTodayAlert = (aDate.includes(todayYMD) || aDate.includes(todayDMY) || aDate.includes(todayYMD.replace(/-/g, '/')));
                   
                   if ((aType.includes('fire') || aType.includes('sos')) && isTodayAlert) {
                      if (aType.includes('fire')) {
                        this.fireAlertsCount++;
                      } else if (aType.includes('sos')) {
                        this.criminalCount++;
                      }
                      this.incidentsCount++;
                   }
                });
                
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
            this.isStatsLoading = false;
          },
          error: (err) => {
            console.error("❌ Direct Sync Failure:", err);
            this.isStatsLoading = false;
          }
        });


        // --- 📊 ATTENDANCE RECOVERY SYNC (Fixed for Local Time) ---
        this.dataService.getAssignableUsers({ company_id: this.myCompanyId.toString() }).subscribe({
          next: (userRes: any) => {
             const staffList = userRes.data || userRes.users || (Array.isArray(userRes) ? userRes : []);
             
                    // 🔥 NEW: Unified Attendance Sync (Logs + Pending Requests + OnSite)
                    forkJoin({
                       logs: this.dataService.getAttendanceLogsByRanger(this.myCompanyId.toString()).pipe(catchError(() => of([]))),
                       requests: this.dataService.getAttendanceRequests(this.myCompanyId.toString()).pipe(catchError(() => of([]))),
                       onsite: this.dataService.getGuardsOnSite(this.myCompanyId.toString()).pipe(catchError(() => of([])))
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
                          
                          this.allAttendanceLogs = [...logsArray, ...reqArray, ...onsiteArray];
                           
                          console.log("🔍 Syncing Attendance:", { 
                            logs: logsArray.length, 
                            requests: reqArray.length, 
                            onsite: onsiteArray.length 
                          });

                          const activeIds = new Set<string>();
                          const todayISO = new Date().toISOString().split('T')[0];
                          
                          const processRecord = (record: any) => {
                             const rDate = (record.timestamp || record.entryDateTime || record.created_at || record.date || '').toString();
                             if (!rDate) return false;

                             const isToday = rDate.includes(todayYMD) || 
                                            rDate.includes(todayDMY) || 
                                            rDate.includes(todayISO) ||
                                            rDate.toLowerCase().includes('today');

                              // Count as On-Duty ONLY if APPROVED
                              // Note: status '1' in legacy beat attendance is considered "marked/approved"
                              // but for onsite requests, it must explicitly be 'approved'
                              const status = String(record.status || '').toLowerCase().trim();
                              const isApproved = status === 'approved' || (status === '1' && !record.request_id);
                              
                              if (isToday && isApproved) {
                                 const uId = record.guard_id || record.guardId || record.user_id || record.userId || record.staff_id || record.ranger_id || record.added_by || record.created_by;
                                 if (uId) {
                                   const rawUser = staffList.find((u: any) => String(u.id || u.user_id || u.staff_id || u.ranger_id || '') === String(uId));
                                   if (rawUser) {
                                     const tempRanger = {
                                       role_id: 4,
                                       site_id: rawUser.site_id || rawUser.siteId || rawUser.entity_id || rawUser.entity_ids || '',
                                       entity_id: rawUser.entity_id || rawUser.entity_ids || rawUser.site_id || rawUser.siteId || '',
                                       range_name: rawUser.range_name || rawUser.beat_name || 'Forest Division'
                                     };
                                     if (!this.deepestSelection || this.isRecordMatchingHierarchy(tempRanger, this.deepestSelection)) {
                                       activeIds.add(uId.toString());
                                       return true;
                                     }
                                   }
                                 }
                              }
                              return false;
                           };

                           logsArray.forEach(processRecord);
                           reqArray.forEach(processRecord);
                           onsiteArray.forEach(processRecord);

                           // Ensure unique count: Only count one attendance per officer per day
                           this.onDutyCount = activeIds.size;
                           this.allRangers = staffList.length || this.allRangers || 0;
                           this.inactiveCount = Math.max(0, this.allRangers - this.onDutyCount);

                           const last30 = Array.from({length: 30}, (_, i) => {
                             const d = new Date();
                             d.setDate(d.getDate() - (29 - i));
                             const m = String(d.getMonth() + 1).padStart(2, '0');
                             const day = String(d.getDate()).padStart(2, '0');
                             return `${d.getFullYear()}-${m}-${day}`;
                           });

                           const dutyTrendMap: { [date: string]: Set<string> } = {};
                           last30.forEach((d: string) => dutyTrendMap[d] = new Set<string>());

                           const processTrendRecord = (record: any) => {
                             const rDate = (record.timestamp || record.entryDateTime || record.created_at || record.date || '').toString();
                             if (!rDate) return;

                             let dateYMD = '';
                             if (rDate.includes('-')) {
                               const parts = rDate.split('T')[0].split(' ')[0].split('-');
                               if (parts.length === 3) {
                                 dateYMD = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                               }
                             } else if (rDate.includes('/')) {
                               const parts = rDate.split('T')[0].split(' ')[0].split('/');
                               if (parts.length === 3) {
                                 dateYMD = parts[2].length === 4 ? `${parts[2]}-${parts[1]}-${parts[0]}` : `${parts[0]}-${parts[1]}-${parts[2]}`;
                               }
                             }
                             
                             if (dateYMD && dutyTrendMap[dateYMD]) {
                               const status = String(record.status || '').toLowerCase().trim();
                               const isApproved = status === 'approved' || (status === '1' && !record.request_id);
                               if (isApproved) {
                                 const uId = record.guard_id || record.guardId || record.user_id || record.userId || record.staff_id || record.ranger_id || record.added_by || record.created_by;
                                 if (uId) {
                                   const rawUser = staffList.find((u: any) => String(u.id || u.user_id || u.staff_id || u.ranger_id || '') === String(uId));
                                   if (rawUser) {
                                     const tempRanger = {
                                       role_id: 4,
                                       site_id: rawUser.site_id || rawUser.siteId || rawUser.entity_id || rawUser.entity_ids || '',
                                       entity_id: rawUser.entity_id || rawUser.entity_ids || rawUser.site_id || rawUser.siteId || '',
                                       range_name: rawUser.range_name || rawUser.beat_name || 'Forest Division'
                                     };
                                     if (!this.deepestSelection || this.isRecordMatchingHierarchy(tempRanger, this.deepestSelection)) {
                                       dutyTrendMap[dateYMD].add(uId.toString());
                                     }
                                   }
                                 }
                                }
                             }
                           };

                           logsArray.forEach(processTrendRecord);
                           reqArray.forEach(processTrendRecord);
                           onsiteArray.forEach(processTrendRecord);

                           this.onDutyTrendData = last30.map((d: string) => dutyTrendMap[d]?.size || 0);

                           if (staffList.length > 0) {
                              this.rangers = staffList.map((u: any) => {
                                 const sId = (u.id || u.user_id || u.staff_id || u.ranger_id || '').toString();
                                 const isWorking = sId ? activeIds.has(sId) : false;
                                return {
                                    id: sId,
                                    name: u.name || u.full_name || 'Staff',
                                    status: isWorking ? 1 : 0, 
                                    role_id: 4,
                                    range_name: u.range_name || u.beat_name || 'Forest Division',
                                    site_id: u.site_id || u.siteId || u.entity_id || u.entity_ids || '',
                                    entity_id: u.entity_id || u.entity_ids || u.site_id || u.siteId || ''
                                };
                             });
                             
                             this.rangers.sort((a,b) => b.status - a.status);
                             this.filteredRangers = this.rangers.filter(u => this.isRecordMatchingHierarchy(u, this.deepestSelection));

                             // Recalculate stats based on filtered list
                             this.onDutyCount = this.filteredRangers.filter(r => r.status === 1).length;
                             this.allRangers = this.filteredRangers.length;
                             this.inactiveCount = Math.max(0, this.allRangers - this.onDutyCount);
                          }

                          // Trigger attendance chart initialization as fallback if not in res
                          if (!res.officerStatus || !res.officerStatus.history) {
                             this.initAttChart();
                          }
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
                             const status = String(log.status || '').toLowerCase();
                             
                             // 🔥 Fix: Check for [PENDING] vs [APPROVED] status
                             const isPending = isRequest && status !== 'approved';
                             const statusLabel = isPending ? '[PENDING]' : '[APPROVED]';
                             const theme = this.getAlertTheme(isPending ? 'WARN' : 'ATTENDANCE');
                                
                             return {
                                 ...log,
                                 ...theme, // 🔥 Fix: Spread theme to get icon and color
                                 displayTitle: `${statusLabel} attendance ${isExit ? 'out' : 'in'}`,
                                 displayDesc: `${uName} at ${log.location_name || log.geofence || 'Forest Area'}`,
                                 displayTime: this.formatTime(log.timestamp || log.created_at || log.entryDateTime),
                                 severity: isPending ? 'warning' : 'info',
                                 layerId: 'attendance'
                             };
                          });

                      this.alertsData = [...(this.alertsData || []), ...attAlerts];
                      this.updateFilteredAlerts();
                      this.cdr.detectChanges();

                      // ⚡ FETCH PATROL ALERTS (Respecting timeframe filter)
                      let pFrom = todayYMD;
                      let pTo = todayYMD;
                      if (this.activeDateFilter === 'week') {
                         const d = new Date(nowL); d.setDate(d.getDate() - 7);
                         pFrom = d.toISOString().split('T')[0];
                      } else if (this.activeDateFilter === 'month') {
                         const d = new Date(nowL); d.setDate(d.getDate() - 30);
                         pFrom = d.toISOString().split('T')[0];
                      } else if (this.activeDateFilter === 'custom' && this.dateFrom && this.dateTo) {
                         pFrom = this.dateFrom;
                         pTo = this.dateTo;
                      }

                      this.dataService.getPatrolsByCompany(this.myCompanyId, pFrom, pTo).subscribe({
                         next: (pRes: any) => {
                             const rawPList = pRes.data || pRes.patrols || (Array.isArray(pRes) ? pRes : []);
                             
                             // Hierarchy Filtering for Patrols (Dashboard Parity)
                             const filteredPList = rawPList.filter((p: any) => {
                                 const pBeat = (p.beat_name || p.site_name || p.location || '').toLowerCase();
                                 const bObj = this.allBeats.find(b => b.name.toLowerCase() === pBeat);
                                 const pRange = (p.range_name || p.range || (bObj ? bObj.parentName : '')).toLowerCase();
                                 
                                 // V2 Hierarchy Filtering Aligned with Reports
                                 if (this.deepestSelection) {
                                    return this.isRecordMatchingHierarchy(p, this.deepestSelection);
                                 }

                                 let rangePass = true;
                                 if (this.selectedRange && this.selectedRange !== 'all') {
                                    const fRange = this.selectedRange.toLowerCase();
                                    rangePass = pRange.includes(fRange) || fRange.includes(pRange);
                                 }
                                 
                                 let beatPass = true;
                                 if (this.selectedBeat && this.selectedBeat !== 'all') {
                                    const fBeat = this.selectedBeat.toLowerCase();
                                    beatPass = pBeat.includes(fBeat) || fBeat.includes(pBeat);
                                 }
                                 
                                 return rangePass && beatPass;
                             });

                             this.patrolCount = filteredPList.length;
                             const pList = filteredPList; // Use filtered list for alerts too
                            const pAlerts = pList.map((p: any) => {
                               const uName = p.user_name || p.ranger_name || this.resolveUserName(p.user_id || p.ranger_id);
                               const theme = this.getAlertTheme('PATROL');
                               return {
                                  ...p,
                                  ...theme, // 🔥 Fix: Spread theme to get icon and color
                                  displayTitle: `patrol ${p.status === 'completed' ? 'ended' : 'started'}`,
                                  displayDesc: `${uName} at ${p.range_name || 'Beat Area'}`,
                                  displayTime: this.formatTime(p.created_at || p.start_time || p.updated_at),
                                  severity: 'info',
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
            label: item.id === 'jfmc' ? 'JFMC' : item.label,
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
      JFMC: { bg: '#ecfdf5', color: '#059669', icon: 'leaf', label: 'WARNING' },
      COMPENSATION: { bg: '#e0f2fe', color: '#0284c7', icon: 'wallet', label: 'WARNING' },

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
    const warn = ['animal_sighting', 'sighting', 'monitoring', 'jfmc', 'compensation'];
    
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
      else if (type.includes('timber')) layerId = 'timber_storage';
      else if (type.includes('felling') || type.includes('fell')) layerId = 'illegal_felling';
      else if (type.includes('poaching') || type.includes('poach')) layerId = 'animal_poaching';
      else if (type.includes('sighting') || type.includes('sight')) layerId = 'animal_sighting';
      else if (type.includes('water')) layerId = 'water_status';
      else if (type.includes('jfmc') || type.includes('social')) layerId = 'jfmc';
      else if (type.includes('compensation')) layerId = 'wildlife_compensation';
      else if (type.includes('fire')) layerId = 'fire_alerts';
      else if (type.includes('encroach')) layerId = 'encroachment';
      else if (type.includes('storage')) layerId = 'timber_storage';
      else if (type.includes('transport')) layerId = 'timber_transport';
      else if (type.includes('sos')) layerId = 'sos';

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
    if (id.includes('timber')) return '🪵';
    if (id.includes('encroach')) return '🏠';
    if (id.includes('jfmc')) return '🌳';
    if (id.includes('compensation')) return '💰';
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
      timber_storage: '#92400e',
      timber_transport: '#1e293b',
      encroachment: '#7c3aed',
      jfmc: '#059669',
      wildlife_compensation: '#0284c7'
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

  toggleMapFullscreen() {
    this.isMapFullscreen = !this.isMapFullscreen;
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
  }

  setDateFilter(type: string) {
    this.activeDateFilter = type;
    // 🌐 Persist globally so analytics & sub-pages pick it up
    localStorage.setItem('global_date_filter', type);
    localStorage.setItem('global_date_from', this.dateFrom);
    localStorage.setItem('global_date_to', this.dateTo);
    localStorage.setItem('global_range_filter', this.selectedRange);
    localStorage.setItem('global_beat_filter', this.selectedBeat);
    this.doRefresh(false);
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

  async doRefresh(force: boolean = true) {
    this.isRefreshing = true;
    this.isSpinning = true;

    const loading = await this.loadingCtrl.create({
      message: 'Syncing Dashboard...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      await Promise.all([
        this.loadData(force),
        this.loadBeatCoverage(),
        this.loadTrendData()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      this.isRefreshing = false;
      this.isSpinning = false;
      await loading.dismiss();

      if (this.activeSegment === 'overview') {
        this.initHomeCharts();
      } else if (this.activeSegment === 'officers') {
        this.initAttChart();
      } else if (this.activeSegment === 'map') {
        this.updateMapMarkers();
      }
    }
  }


  private mkG(ctx: CanvasRenderingContext2D, color: string, h: number = 130) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + '44');
    g.addColorStop(1, color + '00');
    return g;
  }
  private mkChart(id: string, config: ChartConfiguration | any) {
    const existing = Chart.getChart(id);
    if (existing) {
      existing.destroy();
    }
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

    // Generate Dynamic Array of Active Cards
    this.activeSnapshotCards = this.masterSnapshotCards.filter(c => c.count > 0);
    this.cdr.detectChanges(); // 🔥 Force DOM update so canvases exist

    // Dynamic Trend Logic: Graceful fallback for single values
    const getTrend = (val: number) => [0, 0, 0, 0, val || 0];

    const pairs: [string, number[], string, string?][] = [];

    // Push dynamic snapshot cards
    this.activeSnapshotCards.forEach(c => {
      pairs.push([`mc-${c.id}`, (c.trend?.length || 0) > 0 ? c.trend : getTrend(c.count), c.color, c.type === 'fire' ? 'bar' : 'line']);
    });

    pairs.forEach(([id, data, color, type = 'line']) => {
      // Small timeout to ensure Angular ngFor has rendered the canvas
      setTimeout(() => {
        const el = document.getElementById(id) as HTMLCanvasElement;
        if (!el) {
          console.warn('⚠️ Canvas element still missing in DOM:', id);
          return;
        }

        const ctx = el.getContext('2d');
        if (!ctx) return;

        // Purana mini-chart destroy karo
        const oldMini = Chart.getChart(id);
        if (oldMini) oldMini.destroy();

      // Dynamic Type Resolution: Gracefully handle single-day datasets by switching to single-bar representations
      let finalType = type;
      if (data.length === 1) {
        finalType = 'bar';
      }

      this.mkChart(id, {
        type: finalType as any,
        data: {
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor:
                finalType === 'bar' ? color + '99' : this.mkG(ctx, color, 45),
              fill: finalType === 'line',
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
              borderRadius: finalType === 'bar' ? 3 : 0,
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
      }, 300); // Wait for ngFor to render canvases
    });
  }

  initAttChart(preFetchedData?: number[]) {
    if (preFetchedData && preFetchedData.length > 0) {
       this.renderAttChart(preFetchedData);
       return;
    }

    this.isChartLoading = true;
    this.cdr.detectChanges();

    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const companyId = user.company_id ? Number(user.company_id) : 0;
    const rangerId = this.selectedRanger?.id ? Number(this.selectedRanger.id) : undefined;

    this.dataService.getWeeklyAttendanceStats(companyId, rangerId).subscribe({
      next: (realData: number[]) => {
        this.isChartLoading = false;
        // 🔥 FALLBACK: If individual ranger selected and API returns zero, calculate from synced logs
        if (this.selectedRanger && realData.every(v => v === 0)) {
          const calculated = this.calculateIndividualStats(this.selectedRanger.id || this.selectedRanger.user_id);
          this.renderAttChart(calculated);
        } else {
          this.renderAttChart(realData);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isChartLoading = false;
        console.error('Database Fetch Error:', err);
        const fallback = this.selectedRanger ? this.calculateIndividualStats(this.selectedRanger.id || this.selectedRanger.user_id) : [0,0,0,0,0,0,0];
        this.renderAttChart(fallback);
        this.cdr.detectChanges();
      },
    });
  }

  private calculateIndividualStats(rangerId: any): number[] {
    const stats = [0, 0, 0, 0, 0, 0, 0];
    if (!this.allAttendanceLogs || this.allAttendanceLogs.length === 0) return stats;

    const now = new Date();
    // Calculate Monday of this week
    const currentDay = now.getDay();
    const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0,0,0,0);

    this.allAttendanceLogs.forEach(log => {
      // Robust ID check
      const logUserId = log.user_id || log.ranger_id || log.staff_id || log.guard_id;
      if (String(logUserId) === String(rangerId)) {
        const dateStr = log.timestamp || log.entryDateTime || log.created_at || log.date;
        if (dateStr) {
          const lDate = new Date(dateStr);
          if (lDate >= monday) {
            const dayIdx = lDate.getDay() === 0 ? 6 : lDate.getDay() - 1;
            // Sum duration if exists, else count as 1 (presence)
            const duration = parseFloat(log.duration_for_calc || log.duration || 0);
            stats[dayIdx] += (duration > 0) ? duration : 1;
          }
        }
      }
    });
    return stats;
  }

  private renderAttChart(realData: number[]) {
    const el = document.getElementById('c-att') as HTMLCanvasElement;
    if (!el) return;

    const existingAtt = Chart.getChart('c-att');
    if (existingAtt) {
      existingAtt.destroy();
    }

    if (this.attChart) {
      this.attChart.destroy();
    }

    const ctx = el.getContext('2d');
    if (!ctx) return;

    // Create a premium gradient for the bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, this.COLORS.p);
    gradient.addColorStop(1, this.COLORS.ps);

    // Ensure we have exactly 7 days of data
    let chartData = realData.length >= 7 ? realData.slice(0, 7) : [...realData, 0, 0, 0, 0, 0, 0, 0].slice(0, 7);

    // 🔥 DATA RECOVERY: If API history is zero but we know people are on duty today
    const now = new Date();
    const todayDay = now.getDay(); // 0-6 (Sun-Sat)
    const todayIdx = todayDay === 0 ? 6 : todayDay - 1; // 0-6 (Mon-Sun)
    
    if (!this.selectedRanger && chartData[todayIdx] === 0 && this.onDutyCount > 0) {
      chartData[todayIdx] = this.onDutyCount;
    }

    this.attChart = this.mkChart('c-att', {
      type: 'bar',
      data: {
        labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        datasets: [
          {
            label: this.selectedRanger
              ? `${this.selectedRanger.name}'s Activity`
              : 'Total Personnel On-Duty',
            data: chartData,
            backgroundColor: gradient,
            hoverBackgroundColor: this.COLORS.p,
            borderRadius: 5,
            borderSkipped: false,
            barThickness: 12,
          },
        ],
      },
      options: {
        ...this.CDAX,
        layout: {
          padding: { right: 20, left: 0 } // Shifted left for better balance
        },
        plugins: {
          ...this.CDAX.plugins,
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (item: any) => `Duty: ${item.raw} ${this.selectedRanger ? 'Hrs' : 'Officers'}`
            }
          }
        },
        scales: {
          x: { 
            display: true, 
            ticks: { color: '#64748b', font: { size: 9, weight: '700' } },
            grid: { display: false },
            border: { display: true, color: '#e2e8f0', width: 1 }
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: { 
              stepSize: this.selectedRanger ? undefined : 1, 
              color: '#94a3b8', 
              font: { size: 9 } 
            },
            grid: { color: 'rgba(241,245,249,0.5)', drawBorder: false },
            border: { display: false },
            suggestedMax: Math.max(...chartData, 5) + 2
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
        this.shouldFitMapOnce = true;
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
      Object.values(this._charts).forEach((c: any) => {
        if (c && typeof c.destroy === 'function') c.destroy();
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
    // Derive the overall incident trend from the 30-day trend arrays
    const totalLength = 30;
    
    // Labels (MM-DD)
    const labels = Array.from({length: totalLength}, (_, i) => {
       const d = new Date(); d.setDate(d.getDate() - (29 - i));
       return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
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

    // Calculate generic Momentum (DoD) based on last two points
    if (values.length >= 2) {
      const current = values[values.length - 1];
      const prev = values[values.length - 2];
      if (prev > 0) {
        const mom = Math.round(((current - prev) / prev) * 100);
        this.momStatus = `${Math.abs(mom)}% DoD`;
        this.isGoodTrend = mom <= 0; // Negative means fewer incidents, which is good
      } else {
        this.momStatus = `0% DoD`;
        this.isGoodTrend = true;
      }
    } else {
      this.momStatus = `0% DoD`;
      this.isGoodTrend = true;
    }

    this.initTrendChart(this.lastTrendLabels, this.lastTrendValues);
  }
  initTrendChart(labels: string[], values: number[]) {
    const canvas = document.getElementById('c-trend') as HTMLCanvasElement;
    if (!canvas) return;

    // 🔥 FIX: Prevent flickering if data hasn't changed
    const newDataStr = JSON.stringify({ labels, values });
    const existingChart = Chart.getChart('c-trend');
    
    if (this.lastTrendState === newDataStr && existingChart && existingChart.canvas === canvas) {
      this.isStatsLoading = false;
      this.cdr.detectChanges();
      return; 
    }
    this.lastTrendState = newDataStr;
    this.isStatsLoading = false; // Data is ready to render

    if (existingChart) {
      existingChart.destroy();
    }

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
            display: false,
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
    } else if (this.activeDateFilter === 'custom') {
      if (this.dateFrom && this.dateTo) {
        // Fix for custom range: Return precisely selected dates
        return {
          from: new Date(this.dateFrom).toISOString(),
          to: new Date(this.dateTo).toISOString()
        };
      }
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

  get snapshotMetaLabel(): string {
    switch (this.activeDateFilter) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Selected Period';
    }
  }

  goAnalytics(category?: string) {
    this.router.navigate(['/home/admin-analytics'], {
      queryParams: { type: category || 'criminal' },
    });
  }

  goToCriminalRecords() {
    this.router.navigate(['/home/admin-criminal-records']);
  }

  goToEventsRecords() {
    this.router.navigate(['/home/admin-events-records']);
  }

  goToFireRecords() {
    this.router.navigate(['/home/admin-fire-records']);
  }

  goToAssetsRecords() {
    this.router.navigate(['/home/admin-assets-records']);
  }

  goToPatrolLogs() {
    this.router.navigate(['/home/admin-patrol-logs']);
  }

  // Aliases for template consistency
  gotoAnalytics(category?: string) { this.goAnalytics(category); }
  goToAnalytics(category?: string) { this.goAnalytics(category); }

  goToOfficers() {
    this.router.navigate(['/home/officers']);
  }

  goToPlantations() {
    this.router.navigate(['/plantations']);
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
    this.cdr.detectChanges();
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }
}