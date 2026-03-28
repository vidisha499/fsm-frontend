import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import { DataService } from 'src/app/data.service';


Chart.register(...registerables);

// ═══════════════════════════════════════════
//  CONSTANTS & CONFIG
// ═══════════════════════════════════════════
const COLORS = { 
  p: '#0d9488', rose: '#f43f5e', amber: '#f59e0b', orange: '#fb923c', 
  red: '#ef4444', pur: '#8b5cf6', sl: '#64748b', teal: '#14b8a6', 
  blue: '#3b82f6', ind: '#6366f1', green: '#10b981' 
};

const SPECIES = ['Teak', 'Sal', 'Sandalwood', 'Rosewood', 'Pine', 'Bamboo', 'Sagaon', 'Beeja'];
const REGIONS = ['North Division', 'South Valley', 'East Plateau', 'River Buffer', 'West Ridge'];
const ANIMALS = ['Tiger', 'Elephant', 'Leopard', 'Deer', 'Bison', 'Wild Boar', 'Sloth Bear'];
const PALETTE = [COLORS.p, COLORS.rose, COLORS.amber, COLORS.ind, COLORS.pur];

const CDAX: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
  }
};

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.page.html',
  styleUrls: ['./admin-analytics.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsPage implements OnInit, OnDestroy {
  // State variables
  activeTab: string = 'criminal';
  activeSubId: string = 'felling';
  activeDateFilter: string = 'today';
  isFilterCollapsed: boolean = true;
  isRefreshing: boolean = false;

  selectedRange: string = 'all';
selectedBeat: string = 'all';
ranges = REGIONS; // Constant se le lo
beats = ['Beat Alpha', 'Beat Beta', 'Beat Gamma'];

  // Display arrays for HTML
  activeCatId: string = 'criminal';
  public displayProgList: any[] = [];
  public currentSubCharts: any[] = [];
  public displayActivity: any[] = [];
  public currentCatSubsCount: number = 0;
  // private api: ApiService

  private chartInstances: Map<string, Chart> = new Map();

  catList = [
    { id: 'criminal', label: '🌲 Criminal' },
    { id: 'events', label: '🐾 Events' },
    { id: 'fire', label: '🔥 Fire' },
    { id: 'assets', label: '🛡️ Assets' }
  ];

  // ═══════════════════════════════════════════
  //  THE MAIN CONFIG OBJECT
  // ═══════════════════════════════════════════
  ANA_CONFIG: any = {
    criminal: {
      label: "🌲 Criminal Activity",
      subs: [
        { id: "felling", label: "Illegal Felling", emoji: "🪓", color: COLORS.rose, val: 20, charts: [
         // ANA_CONFIG ke andar felling chart example
{ 
  title: "Volume by Species", 
  id: "ac-f1", 
  render: (id: string) => {
    // Timeframe ke hisab se labels badlo
    const labels = this.activeDateFilter === 'today' ? ['6 AM', '12 PM', '6 PM'] : SPECIES;
    const data = this.activeDateFilter === 'today' ? [2, 5, 3] : this.rnd(8, 150, 20);

    return this.mkChart(id, { 
      type: "bar", 
      data: { 
        labels: labels, 
        datasets: [{ label: "Qty", data: data, backgroundColor: COLORS.rose }] 
      }, 
      options: CDAX 
    });
  }
},
          { title: "Probable Reason", sub: "Trade / Fuel / Agri / Other", id: "ac-f2", render: (id: string) => this.mkChart(id, { type: "pie", data: { labels: ["Trade", "Fuel", "Agri", "Other"], datasets: [{ data: [45, 25, 20, 10], backgroundColor: PALETTE }] }, options: { ...CDAX, plugins: { legend: { display: true, position: 'bottom' } } } }) },
//           { 
//   title: "Range-wise Felling", 
//   sub: "Incidents per forest range", 
//   id: "ac-f3", 
//   render: (id: string) => this.mkChart(id, { 
//     type: "bar", 
//     data: { 
//       labels: ["North Div", "South Valley", "East Plateau", "River Buffer", "West Ridge"], 
//       datasets: [{ 
//         label: "Incidents", 
//         data: [45, 25, 32, 18, 40], // Example data from your SS
//         backgroundColor: COLORS.teal + "CC", 
//         borderRadius: 4 
//       }] 
//     }, 
//     options: { 
//       ...CDAX, 
//       indexAxis: 'y', // This makes the bar chart horizontal
//       scales: { 
//         x: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } }, 
//         y: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } } 
//       } 
//     } 
//   }) 
// }
//        
// ANA_CONFIG ke andar felling -> ac-f3 ko update karein
{ 
  title: "Range-wise Felling", 
  sub: "Incidents per forest range", 
  id: "ac-f3", 
  render: (id: string) => this.mkChart(id, { 
    type: "bar", 
    data: { 
      labels: REGIONS, 
      datasets: [{ 
        label: "Incidents", 
        data: this.rnd(5, 50, 10), 
        backgroundColor: COLORS.teal, 
        borderRadius: 4 
      }] 
    }, 
    options: { 
      ...CDAX, 
      indexAxis: 'y', // Horizontal bars
      scales: {
        x: { beginAtZero: true, grid: { display: false } },
        y: { grid: { display: false } }
      }
    } 
  }) 
} 
]},
        { id: "transport", label: "Timber Transport", emoji: "🚛", color: COLORS.amber, val: 15, charts: [
          { title: "Vehicle Type Analytics", id: "ac-t1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: ["Truck", "Tractor", "Tempo", "Private"], datasets: [{ data: this.rnd(4, 300, 20), backgroundColor: COLORS.ind + "CC", borderRadius: 4 }] }, options: CDAX }) }
        ]},
        { id: "storage", label: "Timber Storage", emoji: "📦", color: COLORS.orange, val: 12, charts: [
          { title: "Storage by Species", id: "ac-s1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: SPECIES.slice(0, 6), datasets: [{ label: "Godown", data: this.rnd(6, 100, 10), backgroundColor: COLORS.amber + "BB" }, { label: "Open", data: this.rnd(6, 50, 5), backgroundColor: COLORS.p + "BB" }] }, options: { ...CDAX, scales: { x: { stacked: true }, y: { stacked: true } } } }) }
        ]},
        { id: "poaching", label: "Poaching", emoji: "🐾", color: COLORS.red, val: 18, charts: [
          { title: "Species vs Incidents", id: "ac-p1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: ANIMALS.slice(0, 5), datasets: [{ label: "Incidents", data: this.rnd(5, 20, 2), backgroundColor: COLORS.rose + "CC" }] }, options: CDAX }) }
        ]},
        { id: "encroach", label: "Encroachment", emoji: "🚧", color: COLORS.pur, val: 16, charts: [
          { title: "Encroachment Scale", sub: "Area (Ha) per range", id: "ac-e1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: REGIONS, datasets: [{ data: this.rnd(5, 50, 5), backgroundColor: COLORS.pur + "CC" }] }, options: CDAX }) }
        ]},
        { id: "mining", label: "Illegal Mining", emoji: "⛏️", color: COLORS.sl, val: 8, charts: [
          { title: "Mining by Region", id: "ac-m1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: REGIONS, datasets: [{ data: this.rnd(5, 15, 1), backgroundColor: COLORS.sl + "CC" }] }, options: { ...CDAX, indexAxis: 'y' } }) }
        ]}
      ]
    },
    events: {
      label: "🐾 Events & Monitoring",
      subs: [
        { id: "wildlife", label: "Wild Animal Sighting", emoji: "🦌", color: COLORS.green, val: 18, charts: [
          { title: "Sightings Trend", id: "ac-w1", render: (id: string) => this.mkChart(id, { type: "line", data: { labels: ['D1', 'D2', 'D3', 'D4', 'D5'], datasets: [{ data: this.rnd(5, 30, 5), borderColor: COLORS.green, fill: true, tension: 0.4 }] }, options: CDAX }) }
        ]},
        { id: "water", label: "Water Source Status", emoji: "💧", color: COLORS.blue, val: 12, charts: [
          { title: "Water Level %", id: "ac-ws1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: ["Lake A", "River B", "Tank C"], datasets: [{ data: [80, 45, 90], backgroundColor: COLORS.blue }] }, options: CDAX }) }
        ]},
        { id: "compensation", label: "Wildlife Compensation", emoji: "💰", color: COLORS.teal, val: 7, charts: [
          { title: "Cases by Range", id: "ac-c1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: REGIONS, datasets: [{ label: "Cases", data: this.rnd(5, 10, 1), backgroundColor: COLORS.teal }] }, options: CDAX }) }
        ]}
      ]
    },
    fire: {
      label: "🔥 Fire Incidents",
      subs: [
        { id: "fire_incidents", label: "Fire Alerts", emoji: "🔥", color: COLORS.orange, val: 12, charts: [
          { title: "30-Day Fire Trend", id: "ac-fi1", render: (id: string) => this.mkChart(id, { type: "line", data: { labels: ['W1', 'W2', 'W3', 'W4'], datasets: [{ data: [2, 8, 4, 1], borderColor: COLORS.orange }] }, options: CDAX }) }
        ]}
      ]
    },
    assets: {
      label: "🛡️ Assets & Tools",
      subs: [
        { id: "inventory", label: "Asset Inventory", emoji: "🛡️", color: COLORS.p, val: 1450, charts: [
          { title: "Asset Distribution", id: "ac-a1", render: (id: string) => this.mkChart(id, { type: "pie", data: { labels: ["Vehicles", "Gear", "Checks"], datasets: [{ data: [245, 320, 42], backgroundColor: PALETTE }] }, options: CDAX }) }
        ]},
        { id: "vehicles", label: "Vehicles", emoji: "🚙", color: COLORS.teal, val: 245, charts: [
          { title: "Vehicle Status", id: "ac-v1", render: (id: string) => this.mkChart(id, { type: "doughnut", data: { labels: ["Deployed", "Maintenance"], datasets: [{ data: [180, 65], backgroundColor: [COLORS.p, COLORS.amber] }] }, options: CDAX }) }
        ]},
        { id: "checkposts", label: "Checkposts", emoji: "🏠", color: COLORS.ind, val: 42, charts: [
          { title: "Activity", id: "ac-cp1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: ["CP-1", "CP-2", "CP-3"], datasets: [{ data: [120, 95, 200], backgroundColor: COLORS.ind }] }, options: CDAX }) }
        ]}
      ]
    }
  };
  

  constructor(private cdr: ChangeDetectorRef, 
    private http: HttpClient,
  private dataService: DataService,) { }

  ngOnInit() { 
    this.setAnaCat('criminal'); 
    this.activeTab = 'criminal';
    this.activeCatId = 'criminal';
    this.activeDateFilter = 'today';
    this.onFilterChange();
  }

  ngOnDestroy() { 
    this.onFilterChange();
    this.destroyCharts(); 
  }

  // ═══════════════════════════════════════════
  //  LOGIC & RENDERING
  // ═══════════════════════════════════════════

 setAnaCat(id: string) {
  const cat = this.ANA_CONFIG[id];
  if (cat) {
    this.activeTab = id;      // <--- Ye sabse zaroori hai!
    this.activeCatId = id;    // Dono ko same rakho
    this.activeSubId = cat.subs[0]?.id; 
    
    this.destroyCharts();     // Purane charts hatao
    this.updateUIData();      // Naya data lao
  }
}

  setAnaSub(id: string) {
    this.activeSubId = id;
    this.destroyCharts();
    this.updateUIData();
    
    this.cdr.detectChanges(); // Force view update to create canvas elements
    setTimeout(() => {
      this.renderSubCharts();
    }, 150);
  }


  // renderSubCharts() {
  //   const sub = this.getCurrentSub();
  //   if (!sub) return;
  //   sub.charts.forEach((ch: any) => {
  //     ch.render(ch.id);
  //   });
  // }

  getActivity(subId: string) {
    const map: any = {
      felling: [{ d: COLORS.rose, t: "Illegal Felling · Beat Alpha", m: "14 min ago" }, { d: COLORS.amber, t: "Chainsaw seized", m: "3h ago" }],
      transport: [{ d: COLORS.amber, t: "Truck Intercepted · Route 44", m: "2h ago" }],
      poaching: [{ d: COLORS.rose, t: "2 poachers arrested", m: "5h ago" }],
      fire_incidents: [{ d: COLORS.orange, t: "Fire Alert Zone C-4", m: "38 min ago" }],
      wildlife: [{ d: COLORS.green, t: "Tiger sighting near river", m: "1h ago" }]
    };
    return map[subId] || [{ d: COLORS.sl, t: "No recent activity", m: "" }];
  }

  getCurrentCat() { return this.ANA_CONFIG[this.activeTab]; }
  getCurrentSub() { return this.getCurrentCat()?.subs.find((s: any) => s.id === this.activeSubId); }



private mkChart(id: string, config: any) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  // 1. Chart.js ka built-in method use karo instance check karne ke liye
  const existingChart = Chart.getChart(canvas); 
  if (existingChart) {
    existingChart.destroy();
  }

  // 2. Extra safety: Clear the canvas context
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const chart = new Chart(canvas, config);
    this.chartInstances.set(id, chart);
    return chart;
  } catch (e) {
    console.error("Chart Creation Error:", e);
    return null;
  }
}



  private destroyCharts() {
    this.chartInstances.forEach(c => c.destroy());
    this.chartInstances.clear();
  }

  private rnd(len: number, max: number, min: number = 0) {
    return Array.from({ length: len }, () => Math.floor(Math.random() * (max - min + 1) + min));
  }

  doRefresh() {
    this.isRefreshing = true;
    setTimeout(() => { 
      this.isRefreshing = false; 
      this.setAnaSub(this.activeSubId);
    }, 800);
  }

  renderSubCharts() {
  const sub = this.getCurrentSub();
  if (!sub || !sub.charts) return;
  
  // This clears old charts and renders all new ones in the array
  sub.charts.forEach((ch: any) => {
    const el = document.getElementById(ch.id);
    if (el) {
      ch.render(ch.id);
    }
  });
}
// admin-analytics.page.ts

onFilterChange() {
  console.log("Applying Filters:", {
    range: this.selectedRange,
    beat: this.selectedBeat,
    timeframe: this.activeDateFilter
  });

  // 1. SABSE PEHLE: Purane charts memory se hatao (Canvas Error Fix)
  this.destroyCharts(); 

  this.isRefreshing = true;
  
  // Fake delay taaki user ko feel aaye data load ho raha hai
  setTimeout(() => {
    // 2. Data calculate karo
    this.updateUIData(); 
    
    // 3. UI ko refresh karo (Must for Canvas)
    this.cdr.detectChanges();

    // 4. Naye data ke saath charts draw karo
    this.renderSubCharts();

    this.isRefreshing = false;
    this.cdr.detectChanges();
  }, 300);
}


async updateUIData() {
  const cat = this.getCurrentCat();
  if (!cat) return;

  // 1. DYNAMIC COMPANY ID: LocalStorage se uthao, agar nahi hai toh '1' default
  const companyId = localStorage.getItem('companyId') || '1';
  
  // Debugging ke liye console mein check kar sakte ho
  console.log(`Fetching data for Company: ${companyId}, Category: ${this.activeCatId}`);

  this.currentCatSubsCount = cat.subs?.length || 0;

  // 2. Filter Params prepare karo
  const timeframe = this.activeDateFilter;
  const range = this.selectedRange;
  const beat = this.selectedBeat;

  // 3. Category wise Data Call (Criminal vs Fire)
  let dataCall;
  if (this.activeCatId === 'fire') {
    // Agar Fire tab active hai
    dataCall = this.dataService.getFireAnalytics(companyId, timeframe, range, beat);
  } else {
    // Default: Criminal analytics
    dataCall = this.dataService.getCriminalAnalytics(companyId, timeframe, range, beat);
  }

  dataCall.subscribe({
    next: (res: any) => {
      // 4. UI List ko backend data se map karo
      this.displayProgList = cat.subs.map((s: any) => {
        // Backend key check (e.g., res['felling'] ya res['fire-alerts'])
        const dynamicVal = res[s.id] || 0; 

        return {
          ...s,
          val: dynamicVal,
          // Progress bar percentage (Max 50 cases maan kar)
          pct: Math.min(Math.round((dynamicVal / 50) * 100), 100) 
        };
      });

      // 5. Chart aur Activity refresh logic
      const sub = cat.subs.find((s: any) => s.id === this.activeSubId);
      this.currentSubCharts = sub?.charts || [];
      this.displayActivity = this.getActivity(this.activeSubId);
      
      // 6. UI Update aur Chart Re-render
      this.cdr.detectChanges();
      this.renderSubCharts();
    },
    error: (err: any) => {
      console.error(`data fetch error:`, err);
      this.displayProgList = []; // List khali kar do
  this.isRefreshing = false;
  this.cdr.detectChanges();
    }
  });
}
}