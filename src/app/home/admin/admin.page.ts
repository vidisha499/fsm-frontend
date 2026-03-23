import {Component,OnInit,AfterViewInit,ChangeDetectorRef, } from '@angular/core';
import { Router , } from '@angular/router'; // 1. Added Router
import { NavController } from '@ionic/angular';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DataService } from 'src/app/data.service';

Chart.register(...registerables);

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
  public onDutyCount: number = 0;
public incidentsCount: number = 0;
public fireAlertsCount: number = 0;
  currentTime: string = '';
  activeTab: string = 'home';
  activeSegment: string = 'overview';
  activeDateFilter: string = 'month';
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
  isCompsActive: boolean = false;
  isLayerPanelOpen: boolean = false;
  activeLayerCount: number = 4;
  public activeAlertFilter: string = 'all';
  private dataInterval: any;
 filteredRangers: any[] = [];
  showCompartments: boolean = false;
  attendancePercent: number = 0;
  
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

  public alertsData = [
  { id: 1, type: 'crit', icon: '🪓', title: 'Illegal Felling · Beat Alpha', desc: '3 trees, ~2.4 cmt teak · North Division', time: '14 min ago · R. Patil responding', label: 'CRITICAL', bg: '#fff1f2', color: '#ef4444' },
  { id: 2, type: 'warn', icon: '🔥', title: 'Fire Alert · Zone C-4', desc: 'East Plateau · Smoke detected, low intensity', time: '38 min ago · Fire watch deployed', label: 'WARNING', bg: '#fffbeb', color: '#d97706' },
  { id: 3, type: 'info', icon: '🦌', title: 'Wild Animal Sighting', desc: 'River Buffer · Tiger near village boundary', time: '1h 12m ago · Forest dept alerted', label: 'INFO', bg: '#eff6ff', color: '#3b82f6' },
  { id: 4, type: 'warn', icon: '🚛', title: 'Timber Transport Spotted', desc: 'South Valley · Unregistered truck Route-44', time: '2h 5m ago · Checkpoint alerted', label: 'WARNING', bg: '#fffbeb', color: '#d97706' },
  { id: 5, type: 'crit', icon: '🐾', title: 'Poaching Suspect Held', desc: 'East Plateau · 2 armed poachers arrested', time: '5h ago · Case filed', label: 'CRITICAL', bg: '#fff1f2', color: '#ef4444' },
  { id: 6, type: 'safe', icon: '✅', title: 'Patrol Completed · Beat Beta', desc: 'South Valley · 22km covered, all clear', time: '2h ago · S. Mehta', label: 'CLEAR', bg: '#f0fdfa', color: '#0d9488' }
];
  

  // Logic for pins displayed on the map
  // get activePins() {
  //   // You can filter this.patrolPins based on layerStates if you want it dynamic
  //   return this.patrolPins.map(p => ({
  //     label: p.name,
  //     l: p.x + '%',
  //     t: p.y + '%',
  //     color: p.color,
  //     emoji: p.name.includes('SOS') ? '🚨' : '👤'
  //   }));
  // }

  get activePins() {
    // This is now handled by updateVisiblePins(),
    // but to satisfy the compiler, we return the processed display array
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
  Object.keys(this.layerStates).forEach(key => {
    this.layerStates[key] = true;
  });
  this.updateVisiblePins();
}

// Add this to handle the "All Off" button logic
layerAllOff() {
  Object.keys(this.layerStates).forEach(key => {
    this.layerStates[key] = false;
  });
  this.updateVisiblePins();
}

// Ensure the allLayersOn property is available for the template
get allLayersOn(): boolean {
  return Object.values(this.layerStates).every(val => val === true);
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
  constructor(private router: Router,
     private cdr: ChangeDetectorRef,
     private dataService: DataService,
    private navCtrl : NavController,
  ) {}

ngOnInit() {
  this.loadData();
  this.updateTime();
  this.updateVisiblePins();

  // Store the interval
  this.dataInterval = setInterval(() => {
    this.updateTime();
    this.loadData(); 
  }, 30000);
}


loadData() {
  const user = JSON.parse(localStorage.getItem('user_data') || '{}');
  const myCompanyId = user.company_id;
  
  console.log('Fetching rangers for Company ID:', myCompanyId); // <--- Check this in console

  if (!myCompanyId) {
    console.error('No Company ID found in localStorage!');
    return;
  }

  this.dataService.getUsersByCompany(myCompanyId).subscribe({
    next: (res: any) => {
       console.log('Rangers received:', res);
       this.filterRangersByCompany(res, Number(myCompanyId));
    },
    error: (err) => console.error('Full Error Object:', err)
  });
}

  ngAfterViewInit() {
    this.initHomeCharts();
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

  // --- Navigation & Tab Methods ---
  // switchTab(tab: string) {
  //   this.activeTab = tab;
  //   if (tab === 'home') {
  //     this.activeSegment = 'overview';
  //     this.router.navigate(['/admin']); // Ensure we are on admin root
  //     setTimeout(() => this.initHomeCharts(), 50);
  //   }
  //   console.log('Switched to primary tab:', tab);
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
    this.doRefresh();
  }

  doRefresh() {
    this.isRefreshing = true;
    this.isSpinning = true;
    setTimeout(() => {
      this.isRefreshing = false;
      this.isSpinning = false;
      this.randomizeStats();
      if (this.activeSegment === 'overview') this.initHomeCharts();
      if (this.activeSegment === 'officers') this.initAttChart();
    }, 700);
  }

  goAnalytics(type: string) {
    console.log('Redirecting to analytics for:', type);
    this.activeTab = 'analytics';
    // Add router navigation here if analytics is a separate page
  }

  // --- Chart Logic ---
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
    const el = document.getElementById('c-att');
    if (!el) return;

    this.mkChart('c-att', {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'On Duty',
            data: this.rnd(7, 420, 395),
            backgroundColor: this.COLORS.p + 'CC',
            borderRadius: 5,
          },
          {
            label: 'On Leave',
            data: this.rnd(7, 60, 20),
            backgroundColor: this.COLORS.amber + '88',
            borderRadius: 5,
          },
        ],
      },
      options: this.CDAX,
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
    this.updateVisiblePins(); // Redraw the map
  }



  private updateLayerCount() {
    this.activeLayerCount = Object.values(this.layerStates).filter(
      (v) => v,
    ).length;
  }

  // Add NgZone to your constructor if you haven't already
  // constructor(private zone: NgZone, private cdr: ChangeDetectorRef, ...) {}

  setSegment(segment: string) {
    this.activeSegment = segment;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (segment === 'overview') {
        this.initHomeCharts();
      }
      if (segment === 'map') {
        this.updateVisiblePins();
      }
    }, 50);
  }

  switchTab(tab: string) {
    if (this.activeTab === tab) return; // Don't do anything if clicking the same tab

    this.activeTab = tab;
    if (tab === 'home') {
      this.setSegment('overview');
    }
  }

  get filteredAlerts() {
  if (this.activeAlertFilter === 'all') return this.alertsData;
  return this.alertsData.filter(a => a.type === this.activeAlertFilter);
}

setAlertFilter(filter: string) {
  this.activeAlertFilter = filter;
}



  createAttendanceChart() {
    const ctx = document.getElementById('c-att') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.attendanceChart) {
      this.attendanceChart.destroy();
    }

    this.attendanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'On Duty',
            data: [400, 412, 405, 408, 415, 410, 418],
            backgroundColor: '#4db6ac',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.5
          },
          {
            label: 'On Leave',
            data: [40, 35, 20, 25, 30, 38, 32],
            backgroundColor: '#ffd54f',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'rectRounded',
              // 2. FIX THIS LINE: Changed '600' to 'bold' to fix TS2322 error
              font: { size: 10, weight: 'bold' }, 
              padding: 15
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { size: 10 },
              color: '#94a3b8',
              stepSize: 200
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

openAnalytics() {
  // 1. Sabse pehle interval band karein
  if (this.dataInterval) {
    clearInterval(this.dataInterval);
    this.dataInterval = null;
  }

  // 2. Saare charts destroy karein
  if (this._charts) {
    Object.values(this._charts).forEach(c => {
      if (c) c.destroy();
    });
    this._charts = {};
  }

  // 3. Navigate karein
  this.navCtrl.navigateForward('/home/admin-analytics');
}

filterRangersByCompany(allOfficers: any[], targetCompanyId: number) {
  this.filteredRangers = allOfficers.filter(officer => 
    Number(officer.roleId) === 4 && 
    Number(officer.company_id) === targetCompanyId
  );
  
  // Call this to update the UI numbers
  this.onDutyCount = this.filteredRangers.filter(r => r.status === 1).length;
  this.calculateStats();
  this.cdr.detectChanges();
}

// Helper for initials (e.g., "R. Patil" -> "RP")
getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
      const onDuty = this.filteredRangers.filter(r => r.status === 'active').length;
      this.attendancePercent = Math.round((onDuty / this.filteredRangers.length) * 100);
    } else {
      this.attendancePercent = 0;
    }
  }
}


