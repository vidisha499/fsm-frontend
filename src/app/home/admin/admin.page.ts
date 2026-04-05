import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  HostListener, ElementRef,
  NgZone,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router'; // 1. Added Router
import { NavController } from '@ionic/angular';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DataService } from 'src/app/data.service';
import { AdminDataService } from 'src/app/services/admin-data';
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
  // YE NEECHE WAALI LINES ADD KARO
  private sightingsLayer = L.layerGroup();
public allSightings: any[] = [];
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
  trendChart: any;
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
  currentTime: string = '';
  activeTab: string = 'home';
  activeSegment: string = 'overview';
  activeDateFilter: string = 'today';
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
  // Replace your hardcoded alertsData with an empty array
  public alertsData: any[] = [];
public filteredAlerts: any[] = [];
  alerts: ForestAlert[] = [];
  // Inside your class variables
  public sightingsCount: number = 0;
  attChart: any;  
  public allActivePatrols: any[] = [];  
  private patrolInterval: any; // Attendance chart ke liye
// trendChart: any;

layerStates: { [key: string]: boolean } = {
  illegal_felling: true,
  poaching: true,
  illegal_mining: true,
  animal_sighting: true,
  water_status: true,
  fire_warning: true,
  patrols: true,
  sos: true,
 
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
        id: 'fire_warning', // Matches incidentCriteria "Fire Warning" in your NestJS service
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
      {
        id: 'patrols',
        label: 'Active Patrols',
        emoji: '👮',
        color: '#0d9488',
        bg: '#f0fdfa',
      },
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
  beatCoverage = [
    { label: 'North Division', val: 94, color: this.COLORS.p },
    { label: 'South Valley', val: 88, color: this.COLORS.blue },
    { label: 'East Plateau', val: 76, color: this.COLORS.amber },
    { label: 'River Buffer', val: 82, color: this.COLORS.ind },
  ];

  private _charts: { [key: string]: Chart } = {};

  // 2. Injected Router into Constructor
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dataService: DataService,
    private navCtrl: NavController,
    private adminService: AdminDataService,
    private eRef: ElementRef,
    private zone: NgZone,
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

ngOnInit() {

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

  // Naya fresh interval lagao
  this.dataInterval = setInterval(() => {
    
    if (this.activeTab === 'home') {
      this.loadData();
    }
  }, 30000); 

  this.loadTrendData();
  this.updateTime();
  setTimeout(() => {
  this.initHomeCharts();
}, 1000);
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
    Object.keys(this._charts).forEach(id => {
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
  
  console.log("Admin Page Destroyed: Memory Cleared!");
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
      console.warn("Map removal error:", e);
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
      markerZoomAnimation: true
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
    console.error("Map Init Fatal Error:", err);
  }
}


loadSightings() {
  const companyId = 1; // Aapka dynamic company ID
  this.dataService.getAllMapSightings(companyId).subscribe((data: any) => {
    this.allSightings = data;
    this.updateMapMarkers(); // Map par dikhane ke liye
  });
}

// REPLACE existing updateMapMarkers starting at line 752
private updateMapMarkers() {
  if (!this.map || !this.markerGroup) return;
  this.markerGroup.clearLayers();

  this.activePinsDisplay.forEach(pin => {
    // 1. Check if the layer is turned on in the UI
    if (this.layerStates && this.layerStates[pin.layerId] === false) {
      return;
    }

    // 2. Validate coordinates
    const lat = pin.lat || pin.latitude; // Backend might send 'latitude'
    const lng = pin.lng || pin.longitude; // Backend might send 'longitude'

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    // 3. Set Color based on type
    const markerColor = pin.type === 'SIGHTING' ? '#10b981' : (pin.color || '#f43f5e');
    const markerEmoji = pin.type === 'SIGHTING' ? '🦌' : (pin.emoji || '📍');

    const customIcon = L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div class="mpin-wrapper">
          <div class="mpin-ring" style="background: ${markerColor}33; border: 1px solid ${markerColor}66;"></div>
          <div class="mpin-bubble" style="background: ${markerColor}">
            ${markerEmoji}
          </div>
          <div class="mpin-label">${pin.category || 'Alert'}</div>
        </div>`,
      iconSize: [50, 60],
      iconAnchor: [25, 25]
    });

    L.marker([lat, lng], { icon: customIcon })
      .addTo(this.markerGroup)
      .bindPopup(`
        <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
          <strong style="color: ${markerColor}">${pin.category || pin.title}</strong><br>
          <p>${pin.message || pin.description || ''}</p>
          <small>${new Date(pin.created_at || pin.createdAt || Date.now()).toLocaleString()}</small>
        </div>
      `);
  });
}



loadData() {
  if (this.isFetching) return;

  const storageData = localStorage.getItem('user_data');
  if (!storageData) return;

  const user = JSON.parse(storageData);
  const myCompanyId = Number(user.company_id || user.companyId);

  // Validation Check
  if (!myCompanyId || isNaN(myCompanyId)) {
    console.error("CRITICAL: Company ID missing or invalid!", myCompanyId);
    return;
  }

  const localISOTime = new Date().toISOString().split('T')[0];
  const dates = this.getFilterDates();

  this.isFetching = true;

  // FECHING ALL DATA SOURCES
  forkJoin({
    stats: this.dataService.getDashboardStats(myCompanyId, dates.from, dates.to),
    sightings: this.dataService.getSightingCount(myCompanyId, dates.from || '', dates.to || ''),
    fireCount: this.adminService.getFireAlertsCount(myCompanyId, localISOTime),
    onDuty: this.adminService.getOnDutyCount(myCompanyId, localISOTime),
    onLeave: this.adminService.getOnLeaveCount(myCompanyId),
    inactive: this.adminService.getInactiveCount(myCompanyId, localISOTime),
    users: this.dataService.getUsersByCompany(myCompanyId),
    alerts: this.dataService.getLatestAlerts(myCompanyId), // Contains SOS
    assetsStats: this.dataService.getAdminStats(myCompanyId, this.activeDateFilter, dates.from, dates.to),
    assetsTrend: this.dataService.getAssetsTrend(myCompanyId),
    mapIncidents: this.dataService.getIncidentsForMap(myCompanyId),
    allSightings: this.dataService.getAllMapSightings(myCompanyId) // Added this to ensure sightings load
  }).subscribe({
    next: (res: any) => {
      // --- 1. ASSETS DATA ---
      if (res.assetsStats) {
        this.totalAssetsCount = res.assetsStats.totalAssets || 0;
        this.operationalRate = res.assetsStats.operationalRate || '0%';
        (this as any).realNurseryCount = res.assetsStats.nursery || 0;
        (this as any).realPlantationCount = res.assetsStats.plantations || 0;
        (this as any).realOfficeCount = res.assetsStats.offices || 0;
        (this as any).realEcoCount = res.assetsStats.ecoSites || 0;

        if ((this as any).activeTab === 'assets' && typeof (this as any).setAnaCat === 'function') {
          (this as any).setAnaCat('assets');
        }
      }

      // --- 2. TREND CHART ---
      if (res.assetsTrend) {
        this.momStatus = res.assetsTrend.momLabel || '0% MoM';
        this.isGoodTrend = res.assetsTrend.isImprovement;
        setTimeout(() => {
          if (typeof (this as any).initTrendChart === 'function') {
            (this as any).initTrendChart(res.assetsTrend.labels, res.assetsTrend.values);
          }
        }, 300);
      }

      // --- 3. DASHBOARD COUNTS ---
      const stats = res.stats || {};
      this.incidentsCount = stats.totalEvents || 0;
      this.criminalActivityCount = stats.criminalEvents || 0;
      this.fireAlertsCount = stats.fireEvents || (res.fireCount?.count ?? res.fireCount ?? 0);
      this.attendancePercent = stats.resolvedPercentage || 0;

      // --- 4. PERSONNEL & RANGERS ---
      this.sightingsCount = typeof res.sightings === 'object' ? (res.sightings.count ?? 0) : (res.sightings ?? 0);
      this.onDutyCount = res.onDuty?.count ?? res.onDuty ?? 0;
      this.onLeaveCount = res.onLeave?.count ?? res.onLeave ?? 0;
      this.inactiveCount = res.inactive?.count ?? res.inactive ?? 0;

      const allUsers = res.users?.data || res.users || [];
      if (Array.isArray(allUsers)) {
        this.rangers = allUsers.filter((u: any) => Number(u.role_id || u.roleId) === 4);
        this.filteredRangers = [...this.rangers];
        this.allRangers = this.rangers.length;
      }

      // --- 5. MAP DATA PROCESSING (INCIDENTS + SOS + SIGHTINGS) ---
      let processedPins: any[] = [];

      // A. Standard Incidents
      if (res.mapIncidents && Array.isArray(res.mapIncidents)) {
        const incidentPins = res.mapIncidents.map((inc: any) => {
          const dbCriteria = (inc.incidentCriteria || '').toUpperCase();
          const rawSubCat = inc.subCategory || '';
          const normalizedSub = rawSubCat.toLowerCase().trim().replace(/\s+/g, '_');

          let finalLayerId = 'general_incident';
          if (dbCriteria.includes('POACH') || normalizedSub.includes('poach')) finalLayerId = 'animal_poaching';
          else if (dbCriteria.includes('FIRE') || normalizedSub.includes('fire')) finalLayerId = 'fire_warning';
          else if (dbCriteria.includes('FELL') || normalizedSub.includes('felling')) finalLayerId = 'illegal_felling';
          else if (dbCriteria.includes('MINING') || normalizedSub.includes('mining')) finalLayerId = 'illegal_mining';

          return {
            ...inc,
            layerId: finalLayerId,
            displayLabel: dbCriteria.includes('FIRE') ? 'Fire Warning' : (rawSubCat || inc.incidentCriteria || 'Incident')
          };
        });
        processedPins = [...incidentPins];
      }

      // B. SOS Alerts for Map
      if (res.alerts && Array.isArray(res.alerts)) {
        const sosPins = res.alerts
          .filter((a: any) => (a.category === 'SOS' || (a.type && a.type.toUpperCase().includes('SOS'))))
          .map((sos: any) => ({
            ...sos,
            layerId: 'sos',
            displayLabel: 'SOS Emergency',
            emoji: '🚨',
            color: '#f43f5e'
          }));
        processedPins = [...processedPins, ...sosPins];
      }

      // C. Sightings (Water & Animal)
      if (res.allSightings && Array.isArray(res.allSightings)) {
        const sightingPins = res.allSightings.map((s: any) => {
          const isWater = (s.category || '').toLowerCase().includes('water') || (s.species || '').toLowerCase().includes('water');
          const type = isWater ? 'water' : 'animal';
          return {
            ...s,
            layerId: type,
            displayLabel: isWater ? 'Water Status' : 'Animal Sighting',
            emoji: isWater ? '💧' : '🐾',
            color: isWater ? '#0ea5e9' : '#e11d48'
          };
        });
        processedPins = [...processedPins, ...sightingPins];
      }

      // Store in array for updateVisiblePins()
      this.allIncidents = processedPins;
      // Ensure alerts variable is also populated for the notification list
      this.alerts = res.alerts || []; 

      if (typeof (this as any).updateVisiblePins === 'function') {
        (this as any).updateVisiblePins();
      }

// --- 6. ALERTS NOTIFICATION LIST LOGIC (WITH DEBUG LOGS) ---
console.log("--- 🕵️ ALERTS DEBUG START ---");
      // if (res.alerts && Array.isArray(res.alerts)) {
      //   const savedPrefs = localStorage.getItem('admin_notification_settings');
      //   const prefs = savedPrefs ? JSON.parse(savedPrefs) : null;
        
      //   const processedAlerts = res.alerts.map((alert: any) => {
      //     const rawType = (alert.type || 'INFO').toUpperCase();
      //     const baseType = rawType.includes(' - ') ? rawType.split(' - ')[0].trim() : rawType; 
      //     const theme = this.getAlertTheme(baseType);
      //     const catRaw = (alert.category || baseType || '').toLowerCase();
          
      //     return {
      //       ...alert,
      //       bg: theme.bg,
      //       color: theme.color,
      //       label: theme.label,
      //       icon: this.getAlertIcon ? this.getAlertIcon(catRaw) : theme.icon,
      //       severity: (baseType === 'SOS' || baseType === 'INCIDENT' || catRaw.includes('death')) ? 'critical' : 'info',
      //       displayTitle: `${alert.category || baseType} - ${alert.ranger_name || 'Ranger'}`,
      //       displayDesc: alert.location_name || alert.message || 'Reported',
      //       displayTime: alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'
      //     };
      //   });

      //   this.alertsData = processedAlerts.filter((alert: any) => {
      //     const alertCoId = alert.company_id || alert.companyId;
      //     const isCompanyMatch = (alertCoId == 0 || alertCoId == null || Number(alertCoId) === myCompanyId);
      //     if (!isCompanyMatch) return false;

      //     if (!prefs || !Array.isArray(prefs)) return true;
      //     const cat = (alert.category || '').toUpperCase();
      //     const isEnabled = (label: string) => {
      //       const p = prefs.find((x: any) => x.label.toLowerCase() === label.toLowerCase());
      //       return p ? p.enabled : true;
      //     };

      //     if (cat.includes('FIRE') && !isEnabled('Fire Alerts')) return false;
      //     if (cat.includes('FELL') && !isEnabled('Illegal Felling')) return false;
      //     return true;
      //   }).slice(0, 15);

      //   console.log("✅ Final AlertsData:", this.alertsData);
      //   this.critCount = this.alertsData.filter(a => a.severity === 'critical').length;
      //   this.warnCount = this.alertsData.filter(a => a.severity === 'warning').length;
      //   this.infoCount = this.alertsData.filter(a => a.severity === 'info').length;
      // }
      // console.log("--- 🕵️ ALERTS DEBUG END ---");

      // this.cdr.markForCheck();
      // this.cdr.detectChanges();
      // --- 6. ALERTS NOTIFICATION LIST LOGIC (FIXED ICONS) ---
  console.log("--- 🕵️ ALERTS DEBUG START ---");
      if (res.alerts && Array.isArray(res.alerts)) {
        const savedPrefs = localStorage.getItem('admin_notification_settings');
        const prefs = savedPrefs ? JSON.parse(savedPrefs) : null;
        
        const processedAlerts = res.alerts.map((alert: any) => {
          const rawType = (alert.type || 'INFO').toUpperCase();
          const baseType = rawType.includes(' - ') ? rawType.split(' - ')[0].trim() : rawType; 
          
          // Keyword search in Category, Type, and Message
          const searchKey = `${alert.category || ''} ${alert.type || ''} ${alert.message || ''}`.toLowerCase();
          
          // Decide Theme based on baseType (for colors)
          const theme = this.getAlertTheme(baseType);
          
          // --- ROBUST ICON & COLOR OVERRIDE ---
          let finalIcon = theme.icon || 'notifications'; 
          let finalColor = theme.color || '#64748b';

          if (searchKey.includes('fire')) {
            finalIcon = 'flame';
            finalColor = '#ff4d4f'; // Vibrant Red
          } else if (searchKey.includes('fell') || searchKey.includes('tree') || searchKey.includes('timber')) {
            finalIcon = 'leaf';
            finalColor = '#52c41a'; // Green
          } else if (searchKey.includes('poach') || searchKey.includes('animal') || searchKey.includes('sighting')) {
            finalIcon = 'paw';
            finalColor = '#fa8c16'; // Orange
          } else if (searchKey.includes('sos') || searchKey.includes('emergency')) {
            finalIcon = 'nuclear';
            finalColor = '#f5222d'; // Deep Red
          } else if (searchKey.includes('criminal')) {
            finalIcon = 'shield-half';
            finalColor = '#2b2d42'; // Navy
          } else if (searchKey.includes('patrol') && searchKey.includes('end')) {
            finalIcon = 'stop-circle';
            finalColor = '#0d9488'; // Teal
          } else if (searchKey.includes('patrol') && searchKey.includes('start')) {
            finalIcon = 'play-circle';
            finalColor = '#3b82f6'; // Blue
          } else if (searchKey.includes('onsite') || searchKey.includes('attendance')) {
            finalIcon = 'location';
            finalColor = '#d97706'; // Amber
          }

          return {
            ...alert,
            normalizedType: baseType,
            bg: theme.bg || '#f8fafc',
            color: finalColor, // Direct vibrant color
            label: theme.label || baseType,
            icon: finalIcon, 
            severity: (baseType === 'SOS' || baseType === 'INCIDENT' || searchKey.includes('death')) ? 'critical' : 'info',
            displayTitle: `${alert.category || baseType} - ${alert.ranger_name || 'Ranger'}`,
            displayDesc: alert.message || alert.location_name || 'Reported activity',
            displayTime: alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'
          };
        });

        // 3. FILTERING LOGIC
        this.alertsData = processedAlerts.filter((alert: any) => {
          const alertCoId = alert.company_id || alert.companyId;
          const isCompanyMatch = (alertCoId == 0 || alertCoId == null || Number(alertCoId) === myCompanyId);
          if (!isCompanyMatch) return false;

          if (!prefs || !Array.isArray(prefs)) return true;
          const cat = (alert.category || alert.type || '').toUpperCase();
          const isEnabled = (label: string) => {
            const p = prefs.find((x: any) => x.label.toLowerCase() === label.toLowerCase());
            return p ? p.enabled : true;
          };

          if (cat.includes('FIRE') && !isEnabled('Fire Alerts')) return false;
          if (cat.includes('FELL') && !isEnabled('Illegal Felling')) return false;
          if ((cat.includes('POACH') || cat.includes('ANIMAL')) && !isEnabled('Animal Poaching')) return false;
          if (cat.includes('CRIMINAL') && !isEnabled('Criminal Activity')) return false;
          
          return true; 
        }).slice(0, 15);

        this.critCount = this.alertsData.filter(a => a.severity === 'critical').length;
        this.warnCount = this.alertsData.filter(a => a.severity === 'warning').length;
        this.infoCount = this.alertsData.filter(a => a.severity === 'info').length;
      }
      console.log("--- 🕵️ ALERTS DEBUG END ---");

      // --- 4. Assets & Extra Data ---
      if (res.assetsStats) {
        this.totalAssetsCount = res.assetsStats.totalAssets || 0;
        this.operationalRate = res.assetsStats.operationalRate || '0%';
      }
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    },
    error: (err: any) => {
      console.error('Master Data Fetch Error:', err);
      this.isFetching = false;
      this.cdr.detectChanges();
    },
    complete: () => {
      this.isFetching = false;
      if (typeof (this as any).updateFilteredAlerts === 'function') {
        (this as any).updateFilteredAlerts();
      }
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
  if (!this.LAYERS_DATA || !this.layerStates || !this.activePinsDisplay) return activeStats;

  Object.values(this.LAYERS_DATA).forEach((category: any) => {
    category.items.forEach((item: any) => {
      // Only show if the toggle is ON
      if (this.layerStates[item.id]) {
        // We filter the processed pins by the layerId we assigned
        const count = this.activePinsDisplay.filter(p => p.layerId === item.id).length;
        
        activeStats.push({
          label: item.label,
          count: count,
          color: item.color,
          emoji: item.emoji
        });
      }
    });
  });
  return activeStats;
}
setAlertFilter(filter: string) {
  this.activeAlertFilter = filter; // Updates 'all', 'crit', 'warn', or 'info'
  this.updateFilteredAlerts();    // Filters the data
  this.cdr.detectChanges();       // Forces UI to show changes
}

updateFilteredAlerts() {
  if (!this.alertsData) return;

  if (this.activeAlertFilter === 'all') {
    this.filteredAlerts = [...this.alertsData];
  } else {
    // Map the short filter keys ('crit', 'warn') to the full severity strings
    const severityMap: { [key: string]: string } = {
      'crit': 'critical',
      'warn': 'warning',
      'info': 'info'
    };
    
    const target = severityMap[this.activeAlertFilter];
    this.filteredAlerts = this.alertsData.filter(a => a.severity === target);
  }
}


  // getAlertTheme(type: string) {
  //   const t = String(type).toUpperCase(); // Normalize to Uppercase

  //   const themes: any = {
  //     INCIDENT: {
  //       bg: '#fff1f2',
  //       color: '#ef4444',
  //       icon: '🚨',
  //       label: 'CRITICAL',
  //     },
  //       SOS: { bg: '#fff1f2', 
  //       color: '#ef4444',
  //       icon: '🆘',
  //       label: 'EMERGENCY' 
  //     },
  //     CRIT: { bg: '#fff1f2', color: '#ef4444', icon: '🚨', label: 'CRITICAL' },

  //     ONSITE_ATTENDANCE: {
  //       bg: '#fffbeb',
  //       color: '#d97706',
  //       icon: '📍',
  //       label: 'VERIFY',
  //     },
  //     SIGHTING: {
  //       bg: '#f0f9ff',
  //       color: '#0ea5e9',
  //       icon: '🐾',
  //       label: 'SIGHTING' },
  //     WARN: { bg: '#fffbeb', color: '#d97706', icon: '🔥', label: 'WARNING' },

  //     PATROL_START: {
  //       bg: '#eff6ff',
  //       color: '#3b82f6',
  //       icon: '🛡️',
  //       label: 'ACTIVE',
  //     },
  //     ATTENDANCE: {
  //       bg: '#f5f3ff',
  //       color: '#8b5cf6',
  //       icon: '👤',
  //       label: 'ON-DUTY',
  //     },
  //     PATROL_END: {
  //       bg: '#f0fdfa',
  //       color: '#0d9488',
  //       icon: '✅',
  //       label: 'COMPLETED',
  //     },
      
  //     SAFE: { bg: '#f0fdfa', color: '#0d9488', icon: '✅', label: 'CLEAR' },

  //     INFO: { bg: '#f8fafc', color: '#64748b', icon: '🔔', label: 'INFO' },
  //   };

  //   return themes[t] || themes['INFO'];
  // }

//   getAlertTheme(type: string) {
//   const t = String(type).toUpperCase(); // Normalize to Uppercase

//   const themes: any = {
//     // --- CRITICAL / SOS / FIRE ---
//     INCIDENT: {
//       bg: '#fff1f2',
//       color: '#ef4444', // Red
//       icon: 'flashlight', 
//       label: 'CRITICAL',
//     },
//     SOS: { 
//       bg: '#fff1f2', 
//       color: '#ef4444', // Red
//       icon: 'alert-circle', 
//       label: 'EMERGENCY' 
//     },
//     CRIT: { 
//       bg: '#fff1f2', 
//       color: '#ef4444', 
//       icon: 'nuclear', 
//       label: 'CRITICAL' 
//     },
//     FIRE: {
//       bg: '#fff1f0',
//       color: '#ff4d4f', // Fire Red
//       icon: 'flame',
//       label: 'FIRE ALERT'
//     },

//     // --- WARNING / ONSITE ---
//     ONSITE_ATTENDANCE: {
//       bg: '#fffbeb',
//       color: '#d97706', // Amber/Orange
//       icon: 'location',
//       label: 'VERIFY',
//     },
//     WARN: { 
//       bg: '#fffbeb', 
//       color: '#d97706', 
//       icon: 'warning', 
//       label: 'WARNING' 
//     },
//     CRIMINAL: {
//       bg: '#f0f0f0',
//       color: '#2b2d42', // Dark Navy/Black
//       icon: 'shield-half',
//       label: 'CRIMINAL'
//     },

//     // --- SIGHTINGS ---
//     SIGHTING: {
//       bg: '#f0f9ff',
//       color: '#0ea5e9', // Bright Blue
//       icon: 'paw',
//       label: 'SIGHTING' 
//     },

//     // --- PATROL & ATTENDANCE ---
//     PATROL_START: {
//       bg: '#eff6ff',
//       color: '#3b82f6', // Blue
//       icon: 'play-circle',
//       label: 'ACTIVE',
//     },
//     ATTENDANCE: {
//       bg: '#f5f3ff',
//       color: '#8b5cf6', // Purple
//       icon: 'person',
//       label: 'ON-DUTY',
//     },
//     PATROL_END: {
//       bg: '#f0fdfa',
//       color: '#0d9488', // Teal
//       icon: 'stop-circle',
//       label: 'COMPLETED',
//     },
    
//     // --- SAFE / INFO ---
//     SAFE: { 
//       bg: '#f0fdfa', 
//       color: '#0d9488', 
//       icon: 'checkmark-circle', 
//       label: 'CLEAR' 
//     },
//     INFO: { 
//       bg: '#f8fafc', 
//       color: '#64748b', 
//       icon: 'notifications', 
//       label: 'INFO' 
//     },
//   };

//   // Return the theme or fallback to INFO
//   return themes[t] || themes['INFO'];
// }
getAlertTheme(type: string) {
  const t = String(type).toUpperCase();

  const themes: any = {
    // --- CRITICAL & EMERGENCY (Red Tones) ---
    INCIDENT: { bg: '#fff1f2', color: '#ff4d4d', icon: 'flashlight', label: 'CRITICAL' },
    SOS:      { bg: '#fff1f2', color: '#e63946', icon: 'megaphone', label: 'EMERGENCY' },
    CRIT:     { bg: '#fff1f2', color: '#f72585', icon: 'nuclear', label: 'CRITICAL' },
    FIRE:     { bg: '#fff1f0', color: '#ff4d4f', icon: 'flame', label: 'FIRE ALERT' },

    // --- WARNINGS & SIGHTINGS (Orange/Amber Tones) ---
    SIGHTING: { bg: '#f0f9ff', color: '#0ea5e9', icon: 'paw', label: 'SIGHTING' },
    WARN:     { bg: '#fffbeb', color: '#f39c12', icon: 'warning', label: 'WARNING' },
    ONSITE_ATTENDANCE: { bg: '#fffbeb', color: '#d97706', icon: 'location', label: 'VERIFY' },
    CRIMINAL: { bg: '#f0f0f0', color: '#2b2d42', icon: 'shield-half', label: 'CRIMINAL' },

    // --- LOGISTICS & FLOW (Blue/Teal Tones) ---
    PATROL_START: { bg: '#eff6ff', color: '#3b82f6', icon: 'play-circle', label: 'ACTIVE' },
    PATROL_END:   { bg: '#f0fdfa', color: '#0d9488', icon: 'stop-circle', label: 'COMPLETED' },
    ATTENDANCE:   { bg: '#f5f3ff', color: '#8b5cf6', icon: 'person', label: 'ON-DUTY' },
    
    // --- OTHERS ---
    SAFE: { bg: '#f0fdfa', color: '#0d9488', icon: 'checkmark-circle', label: 'CLEAR' },
    INFO: { bg: '#f8fafc', color: '#64748b', icon: 'notifications', label: 'INFO' },
  };

  return themes[t] || themes['INFO'];
}

  getAlertIcon(category: string): string {
  if (!category) return 'information-circle'; // Default icon agar category na mile
  
  const cat = category.toLowerCase();
  
  // Mapping categories to Ionic Icon Names
  const map: { [key: string]: string } = {
    fire: 'flame',
    timber: 'leaf',
    fell: 'leaf',
    animal: 'paw',
    sighting: 'paw',
    poaching: 'skull',
    patrol: 'shield-check',
    start: 'play-circle',
    end: 'stop-circle',
    criminal: 'warning',
    sos: 'alert-circle'
  };

  // Agar category map mein milti hai toh wo return karo, nahi toh default info icon
  return map[cat] || 'information-circle';
}

  // getAlertIcon(category: string): string {
  //   const map: any = {
  //     fire: '🔥',
  //     timber: '🪓',
  //     animal: '🐾',
  //     poaching: '👣',
  //     patrol: '✅',
  //   };
  //   return map[category?.toLowerCase()] ;
  // }

  getCount(sev: string): number {
    // Add (a: ForestAlert) here
    return this.alerts.filter((a: ForestAlert) => a.severity === sev).length;
  }

  formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMin < 1) return 'Just now';
    if (diffInMin < 60) return `${diffInMin} min ago`;
    const hours = Math.floor(diffInMin / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

loadActivePatrols() {
  // 1. LocalStorage se user/ranger data nikaalein
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  
  // 2. Company ID prioritize karein (User object se ya fir storage se)
  const companyId = userData.companyId || userData.company_id || localStorage.getItem('company_id');

  if (!companyId) {
    console.error("Company ID not found in storage");
    return;
  }

  // 3. API Call with dynamic ID
  this.dataService.getActivePatrols(Number(companyId)).subscribe({
    next: (res: any) => {
      this.allActivePatrols = res;
      this.updateVisiblePins();
    },
    error: (err) => {
      console.error("Error fetching active patrols:", err);
    }
  });
}

  


updateVisiblePins() {
  const newPins: any[] = [];
  
  // 1. Data merge karein (Incidents, Alerts, Sightings aur ab Active Patrols bhi)
  const combinedData = [
    ...(this.allIncidents || []), 
    ...(this.alerts || []),
    ...(this.allSightings || []),
    ...(this.allActivePatrols || []) // Naya: Active patrols list
  ];
  
  if (combinedData.length === 0) return;

  // Filter logic: Today (Last 24 hours)
  const now = new Date();
  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  combinedData.forEach(item => {
    const rawDate = item.created_at || item.createdAt || item.startTime; // Patrols use startTime
    const itemDate = new Date(rawDate);
    
    // Agar data 24 ghante se purana hai toh skip karein 
    // (Note: Active patrols hamesha current hoti hain, so ye pass ho jayengi)
    if (itemDate < yesterday && !item.isActive) return;

    let layerId = '';
    const category = (item.category || '').toUpperCase();
    const type = (item.type || '').toUpperCase();

    // 2. Mapping Logic (Including Active Patrol Detection)
    
    // Sabse pehle check karein kya ye active patrol hai
    if (item.isActive === true && item.liveLatitude) {
      layerId = 'active_patrol';
    } 
    // SOS Detection
    else if (category === 'SOS' || type.includes('SOS')) {
      layerId = 'sos';
    } 
    // Sightings & Alerts Mapping
    else if (category.includes('ANIMAL')) layerId = 'animal_sighting';
    else if (category.includes('WATER')) layerId = 'water_status';
    else if (category.includes('DEATH')) layerId = 'wildlife_death';
    else if (category.includes('FELLING')) layerId = 'illegal_felling';
    else if (category.includes('IMPACT')) layerId = 'human_impact';
    else if (type.includes('POACH')) layerId = 'animal_poaching';
    else if (type.includes('FIRE')) layerId = 'fire_warning';
    else if (type.includes('MINING')) layerId = 'illegal_mining';
    else layerId = 'others';

    // 3. Check if layer is toggled ON in UI
    if (layerId && this.layerStates[layerId] === true) {
      let style: any = null;
      // LAYERS_DATA se design (emoji, color) uthayein
      Object.values(this.LAYERS_DATA).forEach((cat: any) => {
        const found = cat.items.find((i: any) => i.id === layerId);
        if (found) style = found;
      });

      // 4. Coordinate Parsing (Live location for Patrols, Static for Alerts)
      const lat = parseFloat(item.liveLatitude || item.latitude);
      const lng = parseFloat(item.liveLongitude || item.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        newPins.push({
          ...item,
          lat: lat,
          lng: lng,
          // Agar patrol hai toh Ranger ka naam dikhayein, warna Alert label
          label: layerId === 'active_patrol' ? (item.ranger?.name || 'Active Ranger') : (style?.label || item.category || 'Alert'),
          emoji: style?.emoji || this.getMarkerEmoji(layerId),
          color: style?.color || this.getLayerColor(layerId),
          layerId: layerId,
          isPatrol: layerId === 'active_patrol' // Flag for special popup logic in updateMapMarkers
        });
      }
    }
  });

  this.activePinsDisplay = newPins;
  
  // Map markers refresh karein
  this.updateMapMarkers();
  
  // UI update trigger karein
  this.cdr.detectChanges();
}



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
    'illegal_felling': '#0d9488',
    'animal_poaching': '#f59e0b',
    'fire_warning': '#ef4444',
    'illegal_mining': '#7c3aed',
    'animal_sighting': '#10b981',
    'water_status': '#3b82f6',
    'sos': '#dc2626'
  };
  return colors[layerId] || '#3b82f6';
}


// getMarkerEmoji(id: string) {
//   if (id.includes('fire')) return '🔥';
//   if (id.includes('felling')) return '🪓';
//   if (id.includes('poaching')) return '🐾';
//   if (id.includes('mining')) return '⛏️';
//   return '📍';
// }

// // Helper to keep colors consistent
// getLayerColor(layerId: string) {
//   const colors: any = {
//     'illegal_felling': '#0d9488',
//     'poaching': '#f59e0b',
//     'fire_alert': '#ef4444',
//     'illegal_mining': '#7c3aed'
//   };
//   return colors[layerId] || '#3b82f6';
// }

  // --- UI Methods ---
  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toggleFilterBar() {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  setDateFilter(type: string) {
    this.activeDateFilter = type;
    this.loadData();
    this.doRefresh();
  }

  doRefresh() {
    this.isRefreshing = true;
    this.isSpinning = true;
    setTimeout(() => {
      this.isRefreshing = false;
      this.isSpinning = false;
      // this.randomizeStats();
      if (this.activeSegment === 'overview') this.initHomeCharts();
      if (this.activeSegment === 'officers') this.initAttChart();
    }, 700);
  }

  goAnalytics(type: string) {
    console.log('Redirecting to analytics for:', type);
    this.activeTab = 'analytics';
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
  const tCanvas = document.getElementById('c-trend') as HTMLCanvasElement;
  if (tCanvas) {
    const tCtx = tCanvas.getContext('2d');
    if (tCtx) {
      // Purana chart destroy karo taaki error na aaye
      const existingTrend = Chart.getChart('c-trend');
      if (existingTrend) existingTrend.destroy();

      this.mkChart('c-trend', {
        type: 'line',
        data: {
          labels: Array.from({ length: 30 }, (_, i) => `D${i + 1}`),
          datasets: [{
            data: this.rnd(30, 60, 15), // Isme tu real historical data bhi daal sakta hai
            borderColor: this.COLORS.p,
            backgroundColor: this.mkG(tCtx, this.COLORS.p),
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            label: 'Incidents',
          }],
        },
        options: {
          ...this.CDAX,
          plugins: { ...this.CDAX.plugins, legend: { display: false } },
          scales: {
            x: { 
              display: true, 
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#94a3b8', font: { size: 8 } }
            },
            y: { 
              display: true, 
              beginAtZero: true,
              grid: { color: 'rgba(226, 232, 240, 0.3)', drawBorder: false },
              border: { display: false },
              ticks: { color: '#94a3b8', font: { size: 8 }, maxTicksLimit: 5 }
            }
          }
        },
      });
    }
  }

  // --- 2. CATEGORY SNAPSHOTS (MINI CHARTS) ---
  
  // Dynamic Trend Logic: Agar data sirf 1 hai, toh hum use trend dikhane ke liye array mein convert kar rahe hain
  const getTrend = (val: number) => [0, 0, 0, 0, val || 0];

  const pairs: [string, number[], string, string?][] = [
    // Mapping to YOUR specific variables:
    ['mc-crim', getTrend(this.criminalActivityCount), this.COLORS.rose],
    ['mc-events', getTrend(this.sightingsCount), this.COLORS.amber],
    ['mc-fire', getTrend(this.fireAlertsCount), this.COLORS.orange, 'bar'],
    ['mc-assets', getTrend(this.totalAssetsCount), this.COLORS.p],
    ['mc-duty', getTrend(this.onDutyCount), this.COLORS.blue, 'bar'],
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
        datasets: [{
          data, 
          borderColor: color,
          backgroundColor: type === 'bar' ? color + '99' : this.mkG(ctx, color, 45),
          fill: type === 'line',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
          borderRadius: type === 'bar' ? 3 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { 
            display: false, 
            beginAtZero: true,
            // Isse graph area poora use hoga aur data ke hisaab se height adjust hogi
            suggestedMax: Math.max(...data) > 0 ? Math.max(...data) * 1.2 : 10 
          }
        }
      },
    });
  });
}

initAttChart() {
  const user = JSON.parse(localStorage.getItem('user_data') || '{}');
  const companyId = user.company_id ? Number(user.company_id) : 0;

  const rangerId = this.selectedRanger?.id
    ? Number(this.selectedRanger.id)
    : undefined;

  this.dataService.getWeeklyAttendanceStats(companyId, rangerId).subscribe({
    next: (realData: number[]) => {
      const el = document.getElementById('c-att') as HTMLCanvasElement;
      if (!el) return;

    
      if (this.attChart) { 
        this.attChart.destroy();
      }

   
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
              backgroundColor: this.mkG(
                el.getContext('2d')!,
                this.COLORS.p,
                100,
              ),
              fill: true,
              tension: 0.4,
              pointRadius: 4,
            },
          ],
        },
        options: {
          ...this.CDAX,
          scales: {
            x: { display: true, ticks: { color: '#94a3b8' } },
            y: {
              display: true,
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#94a3b8' },
            },
          },
        },
      });
    },
    error: (err) => console.error('Database Fetch Error:', err),
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

    this.beatCoverage = this.beatCoverage.map((item) => ({
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
    } 
    else if (segment === 'map') {
      // CRITICAL FIX: You must initialize the map object before updating pins
      this.initLeafletMap(); 
      this.updateVisiblePins();
    } 
    else if (segment === 'officers') {
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

  // This handles the logic for the filter chips
  // setAlertFilter(filter: string) {
  //   this.activeAlertFilter = filter;
  // }

 
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

  // Helper for initials (e.g., "R. Patil" -> "RP")
  getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  getRangerColor(name: string): string {
    const colors = ['#eff6ff', '#f0fdfa', '#fffbeb', '#fff1f2', '#f5f3ff'];
    // Simple logic to pick a color based on the name string
    const index = name.length % colors.length;
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
    const myCompanyId = 1;
    this.dataService.getIncidentTrend(myCompanyId).subscribe({
      next: (data) => {
        // Backend se jo naya data aayega usse yahan map karo
        this.momStatus = data.momLabel || '0% MoM';
        this.isGoodTrend = data.isImprovement; // true matlab incidents kam hue (Green)

        // Tera existing chart logic
        this.initTrendChart(data.labels, data.values);
      },
      error: (err) => console.error('Trend Chart Error:', err),
    });
  }

  initTrendChart(labels: string[], values: number[]) {
  const canvas = document.getElementById('c-trend') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // FIX: Agar purana chart hai, toh usse seedha DESTROY karo.
  // Ye sabse safe tareeka hai 'Canvas in use' error se bachne ka.
  if (this.trendChart) {
    this.trendChart.destroy();
  }

  // Gradient setup
  const gradient = ctx.createLinearGradient(0, 0, 0, 140);
  gradient.addColorStop(0, 'rgba(0, 137, 123, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 137, 123, 0)');

  // Naya Chart banao (Fresh start har baar data load hone par)
  this.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Assets Trend', // "Incidents" ki jagah "Assets" kar diya
        data: values,
        borderColor: '#00897b',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          display: true,
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.03)', drawTicks: false },
          ticks: { font: { size: 9 }, stepSize: 10 },
        },
      },
    },
  });
}

  getFilterDates() {
    const now = new Date();
    const from = new Date();

    // if (this.activeDateFilter === 'today') {
    //   // This is the magic line:
    //   // It sets the time to 00:00:00 (Midnight) of the current day
    //   from.setHours(0, 0, 0, 0);
    // } 
    
    if (this.activeDateFilter === 'today') {
  // Look back 24 hours from right now to catch all recent sightings
  from.setHours(now.getHours() - 24); 
    } else if (this.activeDateFilter === 'week') {
      from.setDate(now.getDate() - 7);
    } else if (this.activeDateFilter === 'month') {
      from.setDate(1); // First day of the month
      from.setHours(0, 0, 0, 0);
    }

    return {
      from: from.toISOString(), // Example: 2026-03-25T00:00:00
      to: now.toISOString(), // Example: 2026-03-25T14:13:00 (Current time)
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

gotoAnalytics(category?: string) {
  // Navigation ke liye router ka use karein
  this.router.navigate(['/home/admin-analytics'], { 
    queryParams: { cat: category || 'all' } 
  });
}

goToAnalytics(category: string) {
  this.router.navigate(['/home/admin-analytics'], { 
    queryParams: { type: category } 
  });
}


}
