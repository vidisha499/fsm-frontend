import { Component, OnInit, AfterViewInit , ChangeDetectorRef} from '@angular/core';
import { Router } from '@angular/router'; // 1. Added Router
import { Chart, registerables, ChartConfiguration } from 'chart.js';


Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false
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
    slateLight: '#94a3b8'
  };

  // --- Chart Configurations ---
  readonly CD: any = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,.9)",
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 11, family: "Poppins", weight: "600" },
        bodyFont: { size: 10, family: "Poppins" },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { display: false }, y: { display: false } }
  };

  readonly CDAX: any = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: { color: "#64748b", font: { size: 9, family: "Poppins" }, boxWidth: 8, padding: 10, usePointStyle: true }
      },
      tooltip: this.CD.plugins.tooltip
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: true, ticks: { color: "#94a3b8", font: { size: 9, family: "Poppins" } }, grid: { display: false }, border: { display: false } },
      y: { display: true, ticks: { color: "#94a3b8", font: { size: 9, family: "Poppins" }, maxTicksLimit: 5 }, grid: { color: "rgba(241,245,249,.8)" }, border: { display: false } }
    }
  };

  // --- UI State ---
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
  // --- Map & Layer State ---
  isCompsActive: boolean = false;
  isLayerPanelOpen: boolean = false;
  activeLayerCount: number = 2; // Initial count of active layers
  layerStates: { [key: string]: boolean } = {
    'patrols': true,
    'sos': true,
    'fire': false,
    'wildlife': false
  };

// Define a specific interface or use 'any' to bypass strict template checking
activeLayers: { [key: string]: any } = {
  personnel: {
    label: 'Personnel',
    emoji: '👥',
    items: [
      { id: 'patrols', label: 'Active Patrols', emoji: '👮', bg: '#eff6ff', color: '#3b82f6' },
      { id: 'sos', label: 'SOS Units', emoji: '🚨', bg: '#fff1f2', color: '#f43f5e' }
    ]
  },
  threats: {
    label: 'Safety',
    emoji: '⚠️',
    items: [
      { id: 'fire', label: 'Fire Zones', emoji: '🔥', bg: '#fff7ed', color: '#f97316' },
      { id: 'wildlife', label: 'Wildlife Activity', emoji: '🐾', bg: '#f0fdfa', color: '#0d9488' }
    ]
  }
};

  // Logic for pins displayed on the map
  get activePins() {
    // You can filter this.patrolPins based on layerStates if you want it dynamic
    return this.patrolPins.map(p => ({
      label: p.name,
      l: p.x + '%',
      t: p.y + '%',
      color: p.color,
      emoji: p.name.includes('SOS') ? '🚨' : '👤'
    }));
  }
  patrolPins = [
    { name: 'Ranger A-1', x: 25, y: 35, color: '#0d9488' },
    { name: 'Ranger B-4', x: 60, y: 25, color: '#3b82f6' },
    { name: 'SOS Unit', x: 45, y: 55, color: '#ef4444' },
    { name: 'Patrol G', x: 75, y: 70, color: '#f59e0b' },
    { name: 'Eco-Guard', x: 30, y: 75, color: '#8b5cf6' }
  ];
  
  // --- Data ---
  beatCoverage = [
    { label: 'North Division', val: 94, color: this.COLORS.p },
    { label: 'South Valley', val: 88, color: this.COLORS.blue },
    { label: 'East Plateau', val: 76, color: this.COLORS.amber },
    { label: 'River Buffer', val: 82, color: this.COLORS.ind }
  ];

  private _charts: { [key: string]: Chart } = {};

  // 2. Injected Router into Constructor


  constructor(private router: Router, private cdr: ChangeDetectorRef) {}


  ngOnInit() {
    this.updateTime();
  this.updateVisiblePins(); // Initial load
  setInterval(() => this.updateTime(), 30000);
    // this.updateTime();
    // setInterval(() => this.updateTime(), 30000);
  }

  ngAfterViewInit() {
    this.initHomeCharts();
  }
  updateVisiblePins() {
  this.activePinsDisplay = this.patrolPins.map(p => ({
    label: p.name,
    l: p.x + '%',
    t: p.y + '%',
    color: p.color,
    emoji: p.name.includes('SOS') ? '🚨' : '👤'
  }));
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
    this.currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
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
    g.addColorStop(0, color + "44");
    g.addColorStop(1, color + "00");
    return g;
  }

  private mkChart(id: string, config: ChartConfiguration | any) {
    const prev = this._charts[id];
    if (prev) {
      try { prev.destroy(); } catch (e) {}
    }
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return null;

    const c = new Chart(ctx, config);
    this._charts[id] = c;
    return c;
  }

  private rnd(n: number, max: number, min: number = 5) {
    return Array.from({ length: n }, () => Math.floor(Math.random() * (max - min)) + min);
  }

  initHomeCharts() {
    // Check if element exists before trying to render (prevents errors on other segments)
    const tCanvas = document.getElementById("c-trend") as HTMLCanvasElement;
    if (!tCanvas) return;
    const tCtx = tCanvas.getContext("2d");
    if (!tCtx) return;

    this.mkChart("c-trend", {
      type: "line",
      data: {
        labels: Array.from({ length: 30 }, (_, i) => `D${i + 1}`),
        datasets: [{
          data: this.rnd(30, 60, 15),
          borderColor: this.COLORS.p,
          backgroundColor: this.mkG(tCtx, this.COLORS.p),
          fill: true,
          tension: .4,
          pointRadius: 0,
          borderWidth: 2,
          label: "Incidents"
        }]
      },
      options: {
        ...this.CDAX,
        plugins: { ...this.CDAX.plugins, legend: { display: false } },
        scales: {
          x: { ...this.CDAX.scales.x, display: true, title: { display: true, text: "Days", color: "#94a3b8", font: { size: 9 } } },
          y: { ...this.CDAX.scales.y, title: { display: true, text: "No. of Incidents", color: "#94a3b8", font: { size: 9 } } }
        }
      }
    });

    const pairs: [string, number[], string, string?][] = [
      ["mc-crim", this.rnd(15, 20, 5), this.COLORS.rose],
      ["mc-events", this.rnd(15, 50, 20), this.COLORS.amber],
      ["mc-fire", this.rnd(15, 8, 1), this.COLORS.orange, "bar"],
      ["mc-assets", this.rnd(15, 99, 85), this.COLORS.p],
      ["mc-duty", this.rnd(7, 420, 390), this.COLORS.blue, "bar"]
    ];

    pairs.forEach(([id, data, color, type = "line"]) => {
      const el = document.getElementById(id) as HTMLCanvasElement;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      
      this.mkChart(id, {
        type: type as any,
        data: {
          labels: data.map((_, i) => i),
          datasets: [{
            data,
            borderColor: color,
            backgroundColor: type === "bar" ? color + "99" : this.mkG(ctx, color, 55),
            fill: type === "line",
            tension: .4,
            pointRadius: 0,
            borderWidth: 1.5,
            borderRadius: 3,
            label: "Value"
          }]
        },
        options: this.CD
      });
    });
  }

  initAttChart() {
    const el = document.getElementById("c-att");
    if (!el) return;

    this.mkChart("c-att", {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          { label: "On Duty", data: this.rnd(7, 420, 395), backgroundColor: this.COLORS.p + "CC", borderRadius: 5 },
          { label: "On Leave", data: this.rnd(7, 60, 20), backgroundColor: this.COLORS.amber + "88", borderRadius: 5 }
        ]
      },
      options: this.CDAX
    });
  }

  private randomizeStats() {
    const kpiIds = ['kv-crim', 'kv-events', 'kv-fire', 'kv-assets'];
    kpiIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const v = parseInt(el.textContent?.replace(/,/g, "") || "0");
        el.textContent = (v + Math.floor(Math.random() * 11) - 5).toLocaleString();
      }
    });

    this.beatCoverage = this.beatCoverage.map(item => ({
      ...item,
      val: Math.floor(Math.random() * (98 - 70)) + 70
    }));
  }

  get timeLabel() {
    const labels: any = { today: 'For Today', week: 'Last 7 Days', month: 'Last 30 Days', custom: 'Custom Range' };
    return labels[this.activeDateFilter] || 'Last Month';
  }

 

  // Optional: Add randomization to pins when segment changes to make it look "Live"
  updatePinLocations() {
    this.patrolPins.forEach(p => {
       p.x += (Math.random() - 0.5) * 2;
       p.y += (Math.random() - 0.5) * 2;
    });
  }







toggleComps() {
    this.isCompsActive = !this.isCompsActive;
  }

  toggleLayerPanel() {
    this.isLayerPanelOpen = !this.isLayerPanelOpen;
  }

  // Update toggleLayer to accept an ID as seen in your HTML
  toggleLayer(id?: string) {
    if (id) {
      this.layerStates[id] = !this.layerStates[id];
      this.updateLayerCount();
    } else {
      this.isLayerVisible = !this.isLayerVisible;
    }
  }

  layerAllOn() {
    Object.keys(this.layerStates).forEach(k => this.layerStates[k] = true);
    this.updateLayerCount();
  }

  layerAllOff() {
    Object.keys(this.layerStates).forEach(k => this.layerStates[k] = false);
    this.updateLayerCount();
  }

  private updateLayerCount() {
    this.activeLayerCount = Object.values(this.layerStates).filter(v => v).length;
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
}
