import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  HostListener, ElementRef
} from '@angular/core';
import { Router } from '@angular/router'; // 1. Added Router
import { NavController } from '@ionic/angular';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DataService } from 'src/app/data.service';
import { AdminDataService } from 'src/app/services/admin-data';
import * as L from 'leaflet';
Chart.register(...registerables);

interface ForestAlert {
  id?: number;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'clear';
  category: string;
  beat_name?: string;
  created_at: string;
  assigned_ranger?: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
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
  attChart: any;     // Attendance chart ke liye
// trendChart: any;

  layerStates: { [key: string]: boolean } = {
    patrols: true,
    wildlife: true,
    firealert: true,
    felling: true,
  };

  // Define a specific interface or use 'any' to bypass strict template checking
  // --- Updated Layers with Categories ---
  readonly LAYERS_DATA: any = {
    criminal: {
      label: 'Criminal Activity',
      emoji: '🌲',
      items: [
        {
          id: 'felling',
          label: 'Illegal Felling',
          emoji: '🪓',
          color: '#ef4444',
          bg: '#fff1f2',
        },
        {
          id: 'poaching',
          label: 'Wild Animal Poaching',
          emoji: '🐾',
          color: '#b91c1c',
          bg: '#fef2f2',
        },
        {
          id: 'mining',
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
          id: 'wildlife',
          label: 'Animal Sighting',
          emoji: '🦌',
          color: '#059669',
          bg: '#ecfdf5',
        },
        {
          id: 'water',
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
          id: 'firealert',
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
        {
          id: 'checkposts',
          label: 'Checkposts',
          emoji: '🏠',
          color: '#4f46e5',
          bg: '#eef2ff',
        },
      ],
    },
  };

  // --- Map Pin Coordinates (Relative %) ---
  readonly PIN_POS: any = {
    felling: [
      { l: '22%', t: '32%' },
      { l: '38%', t: '44%' },
    ],
    poaching: [
      { l: '28%', t: '55%' },
      { l: '65%', t: '42%' },
    ],
    wildlife: [
      { l: '40%', t: '35%' },
      { l: '62%', t: '48%' },
      { l: '75%', t: '28%' },
    ],
    firealert: [
      { l: '65%', t: '26%' },
      { l: '35%', t: '50%' },
    ],
    patrols: [
      { l: '20%', t: '34%' },
      { l: '55%', t: '44%' },
      { l: '72%', t: '62%' },
    ],
    sos: [{ l: '45%', t: '55%' }],
    checkposts: [
      { l: '33%', t: '36%' },
      { l: '82%', t: '42%' },
    ],
  };

  get activePins() {
    return this.activePinsDisplay;
  }

  get activeLegendItems() {
    const active: any[] = [];
    Object.values(this.LAYERS_DATA).forEach((cat: any) => {
      cat.items.forEach((l: any) => {
        if (this.layerStates[l.id]) active.push(l);
      });
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
    private eRef: ElementRef
  ) {}

 @HostListener('document:click', ['$event'])
  clickout(event: any) {
    // Check if the layer panel is currently open
    if (this.isLayerPanelOpen) {
      // If the click is NOT inside this component's element, close the panel
      if (!this.eRef.nativeElement.contains(event.target)) {
        this.isLayerPanelOpen = false;
        this.cdr.detectChanges(); // Ensure UI updates immediately
      }
    }
  }

  ngOnInit() {
    this.loadData();

    // Pehle check karo agar koi purana interval hai toh usey maro
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }

    this.dataInterval = setInterval(() => {
      this.loadData();
    }, 30000); // 30 seconds
    this.loadTrendData();
    this.updateTime();
    this.updateVisiblePins();
  }

 // Replace your current ngAfterViewInit with this:
ngAfterViewInit() {
  this.initHomeCharts();
  // Map initialization moved to onSegmentChange to ensure container existence
}

// Add this method to your AdminPage class:
onSegmentChange(event: any) {
  this.activeSegment = event.detail.value;
  
  if (this.activeSegment === 'map') {
    // Small delay to allow Angular to render the *ngIf container
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
  // 1. Destroy existing instance correctly
  if (this.map) {
    this.map.remove();
    this.map = null; // This will now work without error
  }

  // 2. Check for container existence
  const mapEl = document.getElementById('leafletMap');
  if (!mapEl) {
    console.warn("Map container not found yet.");
    return;
  }

  // 3. Initialize Map
  // Use 'leafletMap' as the ID to match your HTML
  this.map = L.map('leafletMap', {
    center: [19.9298, 79.1325],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  // 4. Add Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(this.map);

  // 5. THE FIX FOR VISIBILITY: Force recalculation
  // Leaflet needs a moment to realize the container has size
  setTimeout(() => {
    if (this.map) {
      this.map.invalidateSize();
    }
  }, 250);

  this.markerGroup = L.layerGroup().addTo(this.map);
  this.updateMapMarkers();
}

// Replace your current logic to add markers to the Leaflet instance
private updateMapMarkers() {
  // 1. Clear all existing markers from the group
  this.markerGroup.clearLayers();

  // 2. Loop through your actual data
  this.activePins.forEach(pin => {
    
    // --- THE FIX: Check if the category for this pin is toggled ON ---
    // This assumes 'pin.category' matches keys in your layerStates (e.g., 'felling', 'wildlife', etc.)
    if (this.layerStates && this.layerStates[pin.category] === false) {
      return; // Skip drawing this pin if its layer is toggled OFF
    }

    // 3. Define the coordinates
    const lat = pin.lat ? pin.lat : 19.9298 + (Math.random() - 0.5) * 0.01;
    const lng = pin.lng ? pin.lng : 79.1325 + (Math.random() - 0.5) * 0.01;

    // 4. Create the same-to-same custom icon with the label
    const customIcon = L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div class="mpin-wrapper">
          <div class="mpin-ring" style="background: ${pin.color}33; border: 1px solid ${pin.color}66;"></div>
          <div class="mpin-bubble" style="background: ${pin.color}">
            ${pin.emoji || '🌲'}
          </div>
          <div class="mpin-label">${pin.label.split(' ')[0]}</div> 
        </div>`,
      iconSize: [50, 60],
      iconAnchor: [25, 25] 
    });

    // 5. Add only the "filtered-in" markers to the group
    L.marker([lat, lng], { icon: customIcon })
      .addTo(this.markerGroup)
      .bindPopup(`<b>${pin.label}</b>`);
  });
}

  loadData() {
  if (this.isFetching) return;

  const storageData = localStorage.getItem('user_data');
  if (!storageData) return;

  const user = JSON.parse(storageData);
  const myCompanyId = Number(user.company_id || user.companyId); 
  const localISOTime = new Date().toISOString().split('T')[0];
  const dates = this.getFilterDates(); 
  

  this.isFetching = true;

  // 1. Dashboard General Stats
this.dataService.getDashboardStats(myCompanyId, dates.from, dates.to).subscribe({
    next: (stats: any) => {
      this.incidentsCount = stats.totalEvents || 0;
      this.criminalActivityCount = stats.criminalEvents || 0; // Ab ye 'Month' ke hisab se aayega
      this.fireAlertsCount = stats.fireEvents || 0;
      this.attendancePercent = stats.resolvedPercentage || 0;
      this.cdr.detectChanges();
    },
    error: (err: any) => console.error('Dashboard Stats Error:', err),
  });
  // 2. Sightings Count
  this.dataService.getSightingCount(myCompanyId, dates.from || '', dates.to || '').subscribe({
    next: (res: any) => {
      this.sightingsCount = typeof res === 'object' ? (res.count ?? 0) : (res ?? 0);
      this.cdr.detectChanges();
    },
    error: (err: any) => {
      console.error('Sighting Count Error:', err);
      this.sightingsCount = 0;
    },
  });

  // 3. Personnel Status Counts
  this.adminService.getFireAlertsCount(myCompanyId, localISOTime).subscribe({
    next: (res: any) => (this.fireAlertsCount = res.count ?? res ?? 0),
  });
  this.adminService.getOnDutyCount(myCompanyId, localISOTime).subscribe({
    next: (res: any) => (this.onDutyCount = res.count ?? res ?? 0),
  });
  this.adminService.getOnLeaveCount(myCompanyId).subscribe({
    next: (res: any) => (this.onLeaveCount = res.count ?? res ?? 0),
  });
  this.adminService.getInactiveCount(myCompanyId, localISOTime).subscribe({
    next: (res: any) => (this.inactiveCount = res.count ?? res ?? 0),
  });

  // 4. Rangers List
  this.dataService.getUsersByCompany(myCompanyId).subscribe({
    next: (res: any) => {
      const allUsers = res.data || res;
      if (Array.isArray(allUsers)) {
        this.rangers = allUsers.filter((u: any) => Number(u.role_id || u.roleId) === 4);
        this.filteredRangers = [...this.rangers];
        this.allRangers = this.rangers.length;
      }
      this.cdr.detectChanges();
    },
    error: (err: any) => console.error('Users Fetch Error:', err),
  });

//alerts section here


this.dataService.getLatestAlerts(myCompanyId).subscribe({
  next: (alerts: any[]) => {
    if (alerts && Array.isArray(alerts)) {
      // 1. Get Notification Toggles from LocalStorage
      const savedPrefs = localStorage.getItem('admin_notification_settings');
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : null;

      this.alertsData = alerts
        .filter((alert) => {
          if (!prefs) return true; // Show all if no settings saved yet

          const dbCat = (alert.category || 'SYSTEM').toUpperCase();
          
          // Helper to check if a specific label is enabled in your Settings Page
          const isEnabled = (label: string) => {
            const p = prefs.find((x: any) => x.label.toLowerCase() === label.toLowerCase());
            return p ? p.enabled : true;
          };

          // --- FILTERING LOGIC ---
          // Checks if the database category matches the toggle in Settings
          if (dbCat.includes('FIRE')) {
            return isEnabled('Fire Alerts');
          }
          
          if (dbCat.includes('FELL')) {
            return isEnabled('Illegal Felling');
          }

          if (dbCat.includes('POACH')) {
            return isEnabled('Animal Poaching');
          }

          if (dbCat.includes('CRIMINAL')) {
            return isEnabled('Criminal Activity');
          }

          return true; // Show Attendance/Patrols by default
        })
        .map((alert) => {
          // 2. FORMATTING & THEMING
          const rawType = (alert.type || 'INFO').toUpperCase();
          const theme = this.getAlertTheme(rawType);
          const name = alert.ranger_name || 'System';
          
          // --- DYNAMIC TITLE LOGIC ---
          let titlePrefix = '';

          if (rawType === 'ATTENDANCE') {
            titlePrefix = 'ATTENDANCE';
          } else if (rawType === 'ONSITE') {
            titlePrefix = 'ONSITE-ATTENDANCE';
          } else if (rawType === 'PATROL_START') {
            titlePrefix = 'PATROL-START';
          } else if (rawType === 'PATROL_END') {
            titlePrefix = 'PATROL-END';
          } else if (rawType === 'INCIDENT') {
            // For incidents, use the specific category (e.g., ILLEGAL FELLING)
            titlePrefix = (alert.category || 'INCIDENT').toUpperCase();
          } else {
            // Fallback for other types
            titlePrefix = rawType;
          }

          return {
            ...alert,
            // Map raw types to severity for CSS classes (critical, warning, info)
            severity: rawType.includes('INCIDENT') || rawType.includes('CRIT') ? 'critical' : 
                      rawType.includes('WARN') ? 'warning' : 'info',
            
            // Result: "ATTENDANCE - Ishika" or "ILLEGAL FELLING - Ishika"
            displayTitle: `${titlePrefix} - ${name}`,
            
            displayDesc: `${alert.location_name || 'Forest Division'}`,
            displayTime: alert.created_at ? 
              `${new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${new Date(alert.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : 
              'Just Now',
            icon: theme.icon,
            bg: theme.bg,
            color: theme.color,
            label: theme.label
          };
        });

      // 3. Refresh the visible lists (All/Critical/Warning tabs)
      this.updateFilteredAlerts();
    }
    this.isFetching = false;
    this.cdr.detectChanges();
  },
  error: (err) => {
    console.error('Alerts Fetch Error:', err);
    this.isFetching = false;
    this.cdr.detectChanges();
  },
  complete: () => {
    this.isFetching = false;
    this.cdr.detectChanges();
  }
});

}

// Add this inside your AdminPage class
get dynamicFootStats() {
  const activeStats: any[] = [];
  
  // 1. Loop through your categories (Patrols, Alerts, etc.)
  Object.keys(this.LAYERS_DATA).forEach(catKey => {
    const category = this.LAYERS_DATA[catKey];
    
    // 2. Check each item inside that category
    category.items.forEach((item: any) => {
      // 3. Only if the user has this layer toggled ON
      if (this.layerStates[item.id]) {
        // 4. Count how many real pins belong to this specific item
        const count = this.activePins.filter(p => p.category === item.id).length;
        
        activeStats.push({
          label: item.label,
          count: count,
          color: item.color
        });
      }
    });
  });

  return activeStats;
}

updateFilteredAlerts() {
  const filter = this.activeAlertFilter || 'all';
  
  if (filter === 'all') {
    this.filteredAlerts = [...this.alertsData];
  } else {
    // This filters the results that already passed the Settings Toggles
    this.filteredAlerts = this.alertsData.filter(a => a.type === filter);
  }
  this.cdr.detectChanges();
}

  getAlertTheme(type: string) {
    const t = String(type).toUpperCase(); // Normalize to Uppercase

    const themes: any = {
      INCIDENT: {
        bg: '#fff1f2',
        color: '#ef4444',
        icon: '🚨',
        label: 'CRITICAL',
      },
      CRIT: { bg: '#fff1f2', color: '#ef4444', icon: '🚨', label: 'CRITICAL' },

      ONSITE_ATTENDANCE: {
        bg: '#fffbeb',
        color: '#d97706',
        icon: '📍',
        label: 'VERIFY',
      },
      WARN: { bg: '#fffbeb', color: '#d97706', icon: '🔥', label: 'WARNING' },

      PATROL_START: {
        bg: '#eff6ff',
        color: '#3b82f6',
        icon: '🛡️',
        label: 'ACTIVE',
      },
      ATTENDANCE: {
        bg: '#f5f3ff',
        color: '#8b5cf6',
        icon: '👤',
        label: 'ON-DUTY',
      },

      PATROL_END: {
        bg: '#f0fdfa',
        color: '#0d9488',
        icon: '✅',
        label: 'COMPLETED',
      },
      SAFE: { bg: '#f0fdfa', color: '#0d9488', icon: '✅', label: 'CLEAR' },

      INFO: { bg: '#f8fafc', color: '#64748b', icon: '🔔', label: 'INFO' },
    };

    return themes[t] || themes['INFO'];
  }

  getAlertIcon(category: string): string {
    const map: any = {
      fire: '🔥',
      timber: '🪓',
      animal: '🐾',
      poaching: '👣',
      patrol: '✅',
    };
    return map[category?.toLowerCase()] || '🔔';
  }

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

  

  ngOnDestroy() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
  }

  

  updateVisiblePins() {
    const pins: any[] = [];

    // Loop through categories
    Object.values(this.LAYERS_DATA).forEach((cat: any) => {
      // Loop through items in category
      cat.items.forEach((layer: any) => {
        // Only add pins if this specific layer ID is toggled ON
        if (this.layerStates[layer.id]) {
          const positions = this.PIN_POS[layer.id] || [];
          positions.forEach((pos: any, index: number) => {
            // Added : any here
            pins.push({
              label: layer.label.split(' ')[0],
              l: pos.l,
              t: pos.t,
              color: layer.color,
              emoji: layer.emoji,
              delay: index * 0.35,
            });
          });
        }
      });
    });

    this.activePinsDisplay = pins;
    this.updateLayerCount();
    this.cdr.detectChanges();
  }

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
    const prev = this._charts[id];
    if (prev) {
      try {
        prev.destroy();
      } catch (e) {}
    }
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
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
    // Check if element exists before trying to render (prevents errors on other segments)
    const tCanvas = document.getElementById('c-trend') as HTMLCanvasElement;
    if (!tCanvas) return;
    const tCtx = tCanvas.getContext('2d');
    if (!tCtx) return;

    this.mkChart('c-trend', {
      type: 'line',
      data: {
        labels: Array.from({ length: 30 }, (_, i) => `D${i + 1}`),
        datasets: [
          {
            data: this.rnd(30, 60, 15),
            borderColor: this.COLORS.p,
            backgroundColor: this.mkG(tCtx, this.COLORS.p),
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            label: 'Incidents',
          },
        ],
      },
      options: {
        ...this.CDAX,
        plugins: { ...this.CDAX.plugins, legend: { display: false } },
        scales: {
          x: {
            ...this.CDAX.scales.x,
            display: true,
            title: {
              display: true,
              text: 'Days',
              color: '#94a3b8',
              font: { size: 9 },
            },
          },
          y: {
            ...this.CDAX.scales.y,
            title: {
              display: true,
              text: 'No. of Incidents',
              color: '#94a3b8',
              font: { size: 9 },
            },
          },
        },
      },
    });

    const pairs: [string, number[], string, string?][] = [
      ['mc-crim', this.rnd(15, 20, 5), this.COLORS.rose],
      ['mc-events', this.rnd(15, 50, 20), this.COLORS.amber],
      ['mc-fire', this.rnd(15, 8, 1), this.COLORS.orange, 'bar'],
      ['mc-assets', this.rnd(15, 99, 85), this.COLORS.p],
      ['mc-duty', this.rnd(7, 420, 390), this.COLORS.blue, 'bar'],
    ];

    pairs.forEach(([id, data, color, type = 'line']) => {
      const el = document.getElementById(id) as HTMLCanvasElement;
      if (!el) return;
      const ctx = el.getContext('2d');
      if (!ctx) return;

      this.mkChart(id, {
        type: type as any,
        data: {
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor:
                type === 'bar' ? color + '99' : this.mkG(ctx, color, 55),
              fill: type === 'line',
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
              borderRadius: 3,
              label: 'Value',
            },
          ],
        },
        options: this.CD,
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

      // --- YE FIX HAI: Purane chart ko khatam karo ---
      // Agar 'c-att' chart pehle se bana hai, toh destroy karo
      if (this.attChart) { 
        this.attChart.destroy();
      }

      // Important: Actual data use ho raha hai
      // Is line se naya chart assign ho jayega this.attChart ko
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
    // We now iterate through the keys in PIN_POS instead of a flat array
    Object.keys(this.PIN_POS).forEach((key) => {
      this.PIN_POS[key].forEach((p: any) => {
        p.l = parseFloat(p.l) + (Math.random() - 0.5) * 0.5 + '%';
        p.t = parseFloat(p.t) + (Math.random() - 0.5) * 0.5 + '%';
      });
    });
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

  // toggleLayer(id: string) {
  //   this.layerStates[id] = !this.layerStates[id];
  //   this.updateVisiblePins(); // Redraw the map
  // }

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
  setAlertFilter(filter: string) {
    this.activeAlertFilter = filter;
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
    if (this.trendChart) this.trendChart.destroy();

    const ctx = document.getElementById('c-trend') as HTMLCanvasElement;

    // Gradient effect for the area under the line
    const gradient = ctx.getContext('2d')?.createLinearGradient(0, 0, 0, 140);
    gradient?.addColorStop(0, 'rgba(0, 137, 123, 0.3)');
    gradient?.addColorStop(1, 'rgba(0, 137, 123, 0)');

    this.trendChart = new Chart(ctx, {
      
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Incidents',
            data: values,
            borderColor: '#00897b', // Dark Forest Green
            backgroundColor: gradient,
            fill: true,
            tension: 0.4, // Isse curve smooth aayega (Screenshot jaisa)
            borderWidth: 2,
            pointRadius: 0, // Points hide karke clean line dikhayenge
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false }, // X-axis hide (labels niche manually span mein hain)
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

    if (this.activeDateFilter === 'today') {
      // This is the magic line:
      // It sets the time to 00:00:00 (Midnight) of the current day
      from.setHours(0, 0, 0, 0);
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
}