import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import { DataService } from 'src/app/data.service';
import { ActivatedRoute } from '@angular/router';


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
  animalSpecies: string[] = ['Sloth Bear', 'Leopard', 'Hyena', 'Jackal', 'Wild Bear', 'Spotted Deer', 'Sambar', 'Others'];
  companyId: any;
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
  chartData: any[] = [];
  trendChart: any;
  fireCount: number = 0;
  criminalCount: number = 0;
  eventsCount: number = 0;
  assetsCount: number = 0;
  // --- YE 4 LINES ADD KARO ---
  realNurseryCount: number = 0;
  realPlantationCount: number = 0;
  realOfficeCount: number = 0;
  realEcoCount: number = 0;
  totalEvents: number = 0; // Ye missing tha

startDate: string = '';  // Ye missing tha
endDate: string = '';    // Ye missing tha
  // ------------------------

  // Ye dono variables missing the:
  selectedTimeframe: string = 'today'; 

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
    { 
      id: "felling", label: "Illegal Felling", emoji: "🪓", color: COLORS.rose, val: 0,
      charts: [
  { 
    title: "Volume by Species", id: "ac-f1", 
    render: (id: string, obj: any) => {
      const d = obj.dynamicData || [];
      // Yahan check karo ki 'this' accessible hai
      return this.renderBarChart(id, d, COLORS.rose, []);
    }
  },
        { 
          title: "Probable Reason", id: "ac-f2", 
          render: (id: string, obj: any) => this.renderPieChart(id, obj.dynamicData || {}) 
        },
        { 
          title: "Range-wise Felling", id: "ac-f3", 
          render: (id: string, obj: any) => {
            const d = obj.dynamicData || [];
            // Horizontal Bar ke liye indexAxis: 'y' wala logic use karein
            return this.renderHorizontalBarChart(id, d);
          }
        }
      ]
    },
    { 
      id: "transport", label: "Timber Transport", emoji: "🚛", color: COLORS.amber, val: 0,
      charts: [{ title: "Transport Trend", id: "ac-t1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.amber) }]
    },
    { 
      id: "storage", label: "Timber Storage", emoji: "📦", color: COLORS.orange, val: 0,
      charts: [{ title: "Storage Logs", id: "ac-s1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.orange, ["Depot A", "Depot B"]) }]
    },
    { id: "poaching", label: "Wild Animal Poaching", emoji: "🐾", color: COLORS.red, val: 0, charts: [] },
    { id: "encroach", label: "Encroachment", emoji: "🚫", color: COLORS.pur, val: 0, charts: [] },
    { id: "mining", label: "Illegal Mining", emoji: "⛏️", color: COLORS.sl, val: 0, charts: [] }
  ]
},
// --- Updated ANA_CONFIG for Mobile App Options ---
events: {
    label: "🐾 Events & Monitoring",
    subs: [
      { 
        id: "jfmc", label: "JFMC / Social Forestry", emoji: "👥", color: COLORS.green, val: 0,
        charts: [{ title: "Meeting Attendance", id: "ev-jf1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.green, ["Jan", "Feb", "Mar"]) }]
      },
      // { 
      //   id: "animal", label: "Wild Animal Sighting", emoji: "🐾", color: COLORS.orange, val: 0,
      //   charts: [{ title: "Sighting Trend", id: "ev-an1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.orange) }]
      // },
      { 
  id: "wild_animal", 
  label: "Wild Animal Sighting", 
  icon: "paw", // Emoji ki jagah icon use kar raha hoon stylish dikhne ke liye
  color: "#2e7d32", // Photo wala dark green color
  val: 0,
  charts: [
    { 
      title: "Sightings by Species", 
      sub: "Wild animal sightings per species this period",
      id: "ev-an1", 
      render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], "#4caf50", []) 
    },
    { 
      title: "Sighting Trend", 
      sub: "Daily sightings over selected period",
      id: "ev-an2", 
      render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], "#4caf50") 
    }
  ]
},
      
      { 
        id: "water", label: "Water Source Status", emoji: "💧", color: COLORS.blue, val: 0,
       charts: [{ title: "Water Levels", id: "ev-wa1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.blue, ["Full", "Low", "Dry"]) }]
      },
      { 
        id: "compensation", label: "Wildlife Compensation", emoji: "💵", color: COLORS.teal, val: 0,
        charts: [{ title: "Payout Status", id: "ev-co1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.teal, ["Paid", "Pending", "Rejected"]) }]
      }
    ]
  },
 fire: {
  label: "🔥 Fire Incidents",
  subs: [
    { 
      id: "fire_incidents", 
      label: "Fire Alerts", 
      emoji: "🔥", 
      color: COLORS.orange, 
      val: 0, // Hardcoded 12 hata diya
      charts: [
        { 
          title: "30-Day Fire Trend", 
          id: "ac-fi1", 
          render: (id: string, obj: any) => {
            // Backend se aane wala dynamic data lo
            const data = obj?.dynamicData || [];
            
            return this.mkChart(id, { 
              type: "line", 
              data: { 
                labels: ['W1', 'W2', 'W3', 'W4'], // Ye labels backend ke hisab se bhi badal sakte ho
                datasets: [{ 
                  label: "Fire Counts",
                  data: data, // Ab backend data dikhega
                  borderColor: COLORS.orange,
                  backgroundColor: COLORS.orange + '33', // Light fill for line chart
                  fill: true,
                  tension: 0.4 
                }] 
              }, 
              options: CDAX 
            });
          }
        }
      ]
    }
  ]
},

    assets: {
  label: "🛡️ Forest Assets",
  subs: [
    { 
      id: "nursery", 
      label: "Nursery", 
      emoji: "🌱", 
      color: COLORS.green, 
      val: this.realNurseryCount, 
      charts: [
        { 
          title: "Nursery Health Status", 
          id: "ac-n1", 
          render: (id: string) => this.mkChart(id, { 
            type: "pie", 
            data: { 
              labels: ["Healthy", "Maintenance", "New"], 
              datasets: [{ data: [this.realNurseryCount, 5, 2], backgroundColor: PALETTE }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    },
    { 
      id: "plantations", 
      label: "Plantations", 
      emoji: "🌳", 
      color: COLORS.p, 
      val: this.realPlantationCount, 
      charts: [
        { 
          title: "Plantation Growth", 
          id: "ac-pl1", 
          render: (id: string) => this.mkChart(id, { 
            type: "bar", 
            data: { 
              labels: ["Teak", "Bamboo", "Sandalwood"], 
              datasets: [{ label: "Count", data: [this.realPlantationCount, 15, 10], backgroundColor: COLORS.p }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    },
    { 
      id: "offices", 
      label: "Offices/Govt", 
      emoji: "🏢", 
      color: COLORS.blue, 
      val: this.realOfficeCount, 
      charts: [
        { 
          title: "Office Distribution", 
          id: "ac-off1", 
          render: (id: string) => this.mkChart(id, { 
            type: "doughnut", 
            data: { 
              labels: ["Main Office", "Range Office", "Chowki"], 
              datasets: [{ data: [this.realOfficeCount, 3, 8], backgroundColor: [COLORS.blue, COLORS.teal, COLORS.ind] }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    },
    { 
      id: "ecoTourism", 
      label: "Eco Tourism", 
      emoji: "🏞️", 
      color: COLORS.teal, 
      val: this.realEcoCount, 
      charts: [
        { 
          title: "Visitor Activity", 
          id: "ac-eco1", 
          render: (id: string) => this.mkChart(id, { 
            type: "line", 
            data: { 
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], 
              datasets: [{ label: "Visitors", data: [this.realEcoCount, 20, 15, 30, 50], borderColor: COLORS.teal, fill: false }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    }
  ]
}
  };
  

  constructor(private cdr: ChangeDetectorRef, 
    private http: HttpClient,
  private dataService: DataService,
private route: ActivatedRoute,) { }

  ngOnInit() { 
    this.companyId = localStorage.getItem('company_id') || 1;
    this.setAnaCat('criminal'); 
    this.activeTab = 'criminal';
    this.activeCatId = 'criminal';
    this.activeDateFilter = 'today';
    this.onFilterChange();

this.route.queryParams.subscribe((params: any) => {
    if (params && params.type) {
      // Direct call setAnaCat taaki configuration load ho
      this.setAnaCat(params.type); 
    } else {
      this.setAnaCat('criminal');
    }
  });
  }

  ngOnDestroy() { 
    this.onFilterChange();
    this.destroyCharts(); 
  }

  // ═══════════════════════════════════════════
  //  LOGIC & RENDERING
  // ═══════════════════════════════════════════

loadData() {
  const sub = this.getCurrentSub();
  
  // Pehle check karo ki 'sub' mila ya nahi
  if (!sub) {
    console.error("Sub-category not found for tab:", this.activeTab);
    return;
  }

  console.log(`Fetching data for: ${this.activeTab}`);

  // Safe check: pehle dekho charts array exist karta hai ya nahi
  if (sub.charts && Array.isArray(sub.charts)) {
    sub.charts.forEach((ch: any) => {
      if (ch && ch.id) {
        this.mkChart(ch.id, ch.config);
      }
    });
  } else {
    // Agar charts nahi hain, toh purane charts clear kar do aur return ho jao
    console.warn("No charts defined for this sub-category");
    this.destroyCharts(); 
  }
}



// 1. Criminal Data Fetching
fetchCriminalData() {
  // Aapke filters (Range, Beat, Timeframe)
  const timeframe = this.selectedTimeframe || 'today';
  const range = this.selectedRange || 'all';
  const beat = this.selectedBeat || 'all';

  this.dataService.getCriminalAnalytics(this.companyId, timeframe, range, beat).subscribe({
    next: (res: any) => {
      this.criminalCount = res.total_incidents || 0;
      this.chartData = res.graph_data || []; // Backend se graph array
      this.updateChart(); // Graph refresh karne ke liye
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Criminal Fetch Error:', err)
  });
}

// 2. Fire Data Fetching (Jo humne backend fix kiya tha)
fetchFireData() {
  const timeframe = this.selectedTimeframe || 'today';
  const range = this.selectedRange || 'all';
  const beat = this.selectedBeat || 'all';

  this.dataService.getFireAnalytics(this.companyId, timeframe, range, beat).subscribe({
    next: (res: any) => {
      // Backend humein 'fire_incidents' key bhej raha hai
      this.fireCount = res.fire_incidents || 0; 
      this.chartData = res.graph_data || []; 
      this.updateChart(); 
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Fire Fetch Error:', err)
  });
}

// 1. Events & Monitoring Data
fetchEventsData() {
  const timeframe = this.selectedTimeframe || 'today';
  this.dataService.getEventsAnalytics(this.companyId, timeframe).subscribe({
    next: (res: any) => {
      this.eventsCount = res.total_events || 0;
      this.chartData = res.graph_data || [];
      this.updateChart(); // Graph refresh
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Events Fetch Error:', err)
  });
}

// 2. Assets Management Data
fetchAssetsData() {
  this.dataService.getAssetsAnalytics(this.companyId).subscribe({
    next: (res: any) => {
      this.assetsCount = res.total_assets || 0;
      this.chartData = res.graph_data || []; // Agar assets ka graph hai toh
      this.updateChart();
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Assets Fetch Error:', err)
  });
}

updateChart() {
  if (this.trendChart) {
    this.trendChart.destroy();
  }

  const ctx = document.getElementById('c-trend') as HTMLCanvasElement;
  if (!ctx) return;

  this.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: this.chartData.map((d: any) => d.label),
      datasets: [{
        label: 'Incidents',
        data: this.chartData.map((d: any) => d.value),
        borderColor: '#2eb38d',
        backgroundColor: 'rgba(46, 179, 141, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

setAnaCat(id: string) {
  this.activeTab = id; 
  this.activeCatId = id; 
  console.log("Switching Category to:", id);

  this.destroyCharts();

  // --- YE SECTION ADD KARO (Surgical Strike) ---
  if (id === 'assets') {
    const companyId = localStorage.getItem('company_id') || 1;
    // Database se categories fetch karo (Resorts/Safari ke liye)
    this.dataService.get(`assets/categories/${companyId}`).subscribe((categories: any) => {
      this.ANA_CONFIG.assets.subs = categories.map((cat: any) => ({
        id: cat.name.toLowerCase().replace(/\s/g, '_'),
        label: cat.name,
        emoji: "🛡️", 
        icon: cat.icon_name || 'shield-checkmark-outline',
        val: 0,
        charts: [{ 
          id: "ch-" + cat.id, 
          title: cat.name + " Status", 
          render: (chartId: string) => {
            const current = this.displayProgList.find(s => s.label === cat.name);
            return this.renderGenericChart(chartId, cat.name, current?.val || 0);
          }
        }]
      }));
      this.activeSubId = this.ANA_CONFIG.assets.subs[0]?.id;
      this.updateUIData(); // Data load karne ke liye
    });
  } else {
    // Baaki tabs (Criminal, Fire) ke liye wahi purana logic
    const cat = this.ANA_CONFIG[id];
    if (cat) {
      this.activeSubId = cat.subs[0]?.id; 
      this.loadData(); 
      this.updateUIData();
    }
  }
  // --------------------------------------------
  
  this.cdr.detectChanges();
}

renderGenericChart(chartId: string, label: string, currentVal: number) {
  // Logic: Agar value hai toh 15% maintenance dikhao, varna default 2
  const maintenance = currentVal > 0 ? Math.ceil(currentVal * 0.15) : 2; 

  this.mkChart(chartId, {
    type: 'doughnut',
    data: {
      labels: ['Operational', 'Maintenance'],
      datasets: [{ 
        data: [currentVal, maintenance], 
        backgroundColor: [COLORS.teal, COLORS.amber] 
      }]
    },
    options: CDAX
  });
}

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

  // getCurrentCat() { return this.ANA_CONFIG[this.activeTab]; }
  getCurrentCat() { 
  // Agar activeTab update nahi hua toh ye hamesha default 'criminal' hi return karega
  console.log('Current Active Tab:', this.activeTab); 
  return this.ANA_CONFIG[this.activeTab]; 
}
  getCurrentSub() { return this.getCurrentCat()?.subs.find((s: any) => s.id === this.activeSubId); }

private mkChart(id: string, config: any) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas || !config) return null;

  // Pehle check karo ki Chart.js ke internal store mein koi instance hai?
  const existingChart = Chart.getChart(canvas); 
  if (existingChart) {
    existingChart.destroy();
  }

  try {
    const chart = new Chart(canvas, config);
    this.chartInstances.set(id, chart);
    return chart;
  } catch (e) {
    console.error("Chart Render Error for ID:", id, e);
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


// admin-analytics.page.ts
onFilterChange() {
  console.log("Applying Filters:", {
    range: this.selectedRange,
    beat: this.selectedBeat,
    timeframe: this.activeDateFilter
  });

  // 1. UI Status update
  this.isRefreshing = true;
  this.destroyCharts(); // Purane charts clean karein
  this.cdr.detectChanges();

  // 2. Data Fetch (Ensure karein ki ye Promise ya Observable handle kare)
  // Hum updateUIData() ko call kar rahe hain jo internally subscribe karta hai
  this.updateUIData(); 

  // Note: updateUIData ke andar humne already setTimeout aur renderSubCharts lagaya hai,
  // isliye yahan double mehnat ki zaroori nahi hai. 
  
  // Bas ek safety check ke liye Refreshing spinner ko 1 second baad band karein
  setTimeout(() => {
    this.isRefreshing = false;
    this.cdr.detectChanges();
  }, 1000);
}

getIconColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('nursery')) return '#2dd36f';    // Green
  if (l.includes('plantation')) return '#10dc60'; // Dark Green
  if (l.includes('office')) return '#3880ff';     // Blue
  if (l.includes('resort')) return '#ffce00';     // Yellow/Gold
  if (l.includes('safari')) return '#f04141';     // Red
  if (l.includes('tower')) return '#7044ff';      // Purple
  if (l.includes('gate')) return '#92949c';       // Gray
  return '#3dc2ff'; // Default Blue
}

// async updateUIData() {
//   const cat = this.getCurrentCat();
//   if (!cat) return;

//   const companyId = localStorage.getItem('company_id') || '1';
//   const timeframe = this.activeDateFilter || 'today';
  
//   // Custom range handle karne ke liye
//   const startDate = this.startDate; 
//   const endDate = this.endDate;

//   this.isRefreshing = true;
//   this.cdr.detectChanges();

//   // 1. Dynamic API Call based on Active Tab
//   let dataCall;
//   if (this.activeCatId === 'fire') {
//     dataCall = this.dataService.getFireAnalytics(companyId, timeframe, 'all', 'all');
//   } else if (this.activeCatId === 'assets') {
//     dataCall = this.dataService.getAssetsAnalytics(Number(companyId), startDate, endDate);
//   } else {
//     // Ye 'criminal' aur 'events' dono ke liye common analytics call hai
//     dataCall = this.dataService.getEventsAnalytics(Number(companyId), timeframe, startDate, endDate);
//   }

//   dataCall.subscribe({
//     next: (res: any) => {
//       console.log("🚀 Full Backend Response:", res);

//       // 2. Global KPI Cards Update (Header cards sync)
//       this.criminalCount = res.criminal_count || 0;
//       this.eventsCount = res.events_count || 0;
//       this.totalEvents = res.total_events || 0;

//       // 3. Sub-Category List & Chart Data Mapping
//       this.displayProgList = cat.subs.map((s: any) => {
//         // Backend keys match (e.g., res['felling'], res['jfmc_social_forestry'])
//         const rawData = res[s.id] || { val: 0 };
//         const countVal = (typeof rawData === 'number') ? rawData : (rawData.val || 0);

//         // Progress percentage (Max 100 based on target 50)
//         const percentage = Math.min(Math.round((countVal / 50) * 100), 100);

//         // 4. Inject Dynamic Data into Charts
//         if (s.charts && Array.isArray(s.charts)) {
//           s.charts.forEach((ch: any) => {
//             if (s.id === 'felling' && ch.id === 'ac-f1') {
//               // Species volume bar chart logic
//               ch.dynamicData = res.species_volume || [];
//             } else {
//               // Default logic: Agar trend data hai toh wo, warna single point trend dikhao
//               ch.dynamicData = (rawData && Array.isArray(rawData.trend) && rawData.trend.length > 0) 
//                 ? rawData.trend 
//                 : [countVal];
//             }
//           });
//         }

//         return { 
//           ...s, 
//           val: countVal, 
//           pct: percentage,
//           rawData: rawData 
//         };
//       });

//       // 5. DOM Cleanup & Chart Re-rendering
//       this.destroyCharts();
//       this.currentSubCharts = []; // Reset sub-charts for a moment
//       this.cdr.detectChanges();

//       // Find currently selected sub-category to show charts
//       const currentSub = this.displayProgList.find((s: any) => s.id === this.activeSubId);
//       this.currentSubCharts = currentSub?.charts || [];

//       this.isRefreshing = false;
//       this.cdr.detectChanges();

//       // 6. Final Render (Timeout to ensure canvas is ready in DOM)
//       setTimeout(() => {
//         this.renderSubCharts();
//       }, 400); 
//     },
//     error: (err: any) => {
//       console.error("❌ Analytics Fetch Error:", err);
//       this.isRefreshing = false;
//       this.cdr.detectChanges();
//     }
//   });
// }
async updateUIData() {
  const cat = this.getCurrentCat();
  if (!cat) return;

  const companyId = localStorage.getItem('company_id') || '1';
  this.isRefreshing = true;
  this.cdr.detectChanges();

  this.dataService.getEventsAnalytics(
    Number(companyId), 
    this.activeDateFilter, 
    this.startDate, 
    this.endDate
  ).subscribe({
    next: (res: any) => {
      console.log("🚀 FINAL ANALYTICS SYNC:", res); 

      // Pehle purane charts khatam karo taaki naye data ke saath scale refresh ho
      this.destroyCharts();

      this.displayProgList = cat.subs.map((s: any) => {
        const rawData = res[s.id] || res[s.id.toLowerCase()] || { val: 0 };
        const countVal = (typeof rawData === 'number') ? rawData : (rawData.val || 0);

        if (s.charts && Array.isArray(s.charts)) {
          s.charts.forEach((ch: any) => {
            
  // Aapka wala block, thoda aur "safe" version:
if (s.id === 'wild_animal' && ch.id === 'ev-an1') {
  console.log("🔍 Backend Sachai (Raw Data):", res.sightings_by_species);
  
  const apiData = res.sightings_by_species || [];
  
  // Agar API se data nahi aaya, toh seedha empty array set karo
  if (apiData.length === 0) {
    ch.dynamicData = []; 
    console.log("🚫 No data from backend, clearing chart.");
  } else {
    // Sirf tabhi mapping karo jab backend se data ho
    const allMapped = this.animalSpecies.map((spName: string) => {
      const found = apiData.find((d: any) => 
        String(d.label).toLowerCase().trim() === String(spName).toLowerCase().trim()
      );
      return { label: spName, value: found ? Number(found.value) : 0 };
    });

    // Sirf 0 se bade values filter karo
    ch.dynamicData = allMapped.filter(d => d.value > 0);
  }

  console.log("✅ Final Bars to Render:", ch.dynamicData);
}
            
            // DEFAULT TREND LOGIC
            else {
              ch.dynamicData = (rawData && Array.isArray(rawData.trend)) ? rawData.trend : [countVal];
            }
          });
        }

        return { 
          ...s, 
          val: countVal, 
          pct: Math.min(Math.round((countVal / 50) * 100), 100) 
        };
      });

      // UI update trigger
      this.cdr.detectChanges();

      const currentSub = this.displayProgList.find(sub => sub.id === this.activeSubId);
      this.currentSubCharts = currentSub?.charts || [];
      
      this.isRefreshing = false;
      this.cdr.detectChanges();

      // subscribe ke next block mein jahan setTimeout hai:
setTimeout(() => {
  // 1. Data check log
  console.log("📈 Attempting Force Render with:", this.currentSubCharts);
  
  // 2. Clear and Render
  this.renderSubCharts();
  
  // 3. Force Angular to detect change one last time
  this.cdr.markForCheck();
  this.cdr.detectChanges();
}, 1200); // Thoda aur delay taaki DOM ready ho jaye
    },
    error: (err) => {
      console.error("❌ Sync Error:", err);
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  });
}

// updateUIData ke andar jahan renderSubCharts call hota hai wahan ye check kar:
renderSubCharts() {
  if (!this.currentSubCharts || this.currentSubCharts.length === 0) return;

  this.currentSubCharts.forEach((ch: any) => {
    const canvas = document.getElementById(ch.id) as HTMLCanvasElement;
    if (canvas) {
      // 1. Force Destroy (Bina iske Chart.js naya data nahi dikhayega)
      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      // 2. Data Check
      console.log(`Final Render Check for ${ch.id}:`, ch.dynamicData);

      if (ch.render) {
        // YAHAN DHAYAN DE: 
        // Agar renderBarChart direct call ho raha hai, toh use data chahiye
        ch.render(ch.id, ch); 
      }
    }
  });
}

setAnaSub(id: string) {
  this.activeSubId = id;
  const currentSub = this.displayProgList.find(s => s.id === id);
  this.currentSubCharts = currentSub?.charts || [];
  
  this.destroyCharts();
  this.cdr.detectChanges();

  setTimeout(() => {
    this.renderSubCharts();
  }, 400);
}


// ngOnInit ya kisi refresh function mein ye call karo
fetchRealAssetData() {
  const companyIdRaw = localStorage.getItem('company_id') || '1';
const companyId = Number(companyIdRaw); // Ya fir use karo: parseInt(companyIdRaw, 10)

  this.dataService.getAssetStats(companyId).subscribe((res: any) => {
    // Backend se aane wale counts ko variables mein assign karo
    this.realNurseryCount = res.nursery || 0;
    this.realPlantationCount = res.plantations || 0;
    this.realOfficeCount = res.offices || 0;
    this.realEcoCount = res.ecoSites || 0;

    // Data aane ke baad UI refresh karne ke liye config update karo
    this.setAnaCat('assets'); 
  });
}

renderBarChart(id: string, data: any[], color: string, labels: string[]) {
  let finalData: any[] = [];
  let finalLabels: any[] = [];

  if (data && data.length > 0) {
    if (typeof data[0] === 'object') {
      finalLabels = data.map(d => d.label || d.species || 'Unknown');
      finalData = data.map(d => Number(d.value) || 0);
    } else {
      finalData = data.map(v => Number(v));
      finalLabels = labels.length ? labels : data.map((_, i) => `T${i+1}`);
    }
  }

  const isSpecies = id === 'ev-an1';

  return this.mkChart(id, {
    type: "bar",
    data: {
      labels: finalLabels,
      datasets: [{ 
        label: 'Sightings',
        data: finalData, 
        backgroundColor: isSpecies ? '#2dcb73' : (color || '#f43f5e'),
        borderRadius: 4,
        barThickness: 15, // Thoda patla taaki clean lage
        minBarLength: 15   // YE ZAROORI HAI: Agar value 1 hai toh bhi 10px ki bar dikhegi
      }]
    },
    options: {
      ...this.CDAX,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5, // Isse bars thodi "baadi" dikhengi agar data kam hai
          ticks: { 
            stepSize: 1, 
            precision: 0,
            font: { size: 10 } 
          }
        },
        x: {
          grid: { display: false },
          ticks: { 
            maxRotation: 45, 
            minRotation: 45,
            font: { size: 9 } 
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
// --- HELPER FUNCTIONS FOR CHARTS (Add these) ---

renderLineChart(id: string, data: any[], color: string) {
  // Create labels based on data length
  const labels = data.length > 1 
    ? data.map((_, i) => `D${i + 1}`) 
    : ['Today']; 

  return this.mkChart(id, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{ 
        data: data, 
        borderColor: color, 
        backgroundColor: color + '1A', 
        fill: true, 
        tension: 0.4 
      }]
    },
    options: CDAX
  });
}



renderPieChart(id: string, dataMap: any) {
    const labels = Object.keys(dataMap || {});
    const values = Object.values(dataMap || {});
    
    return this.mkChart(id, {
        type: 'pie',
        data: {
            labels: labels.length ? labels : ['Pending'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: ['#14b8a6', '#f59e0b', '#ef4444', '#6366f1'],
                borderWidth: 0
            }]
        },
        options: {
            ...this.CDAX,
            plugins: { 
                legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } 
            }
        }
    });
}

// renderBarChart(id: string, data: any[], color: string, labels: string[]) {
//   // Photo 3 jaisa colorful palette
//   const colors = ['#f43f5e', '#fb923c', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6'];

//   return this.mkChart(id, {
//     type: "bar",
//     data: {
//       labels: labels,
//       datasets: [{ 
//         data: data, 
//         backgroundColor: labels.map((_, i) => colors[i % colors.length]), // Har bar alag color
//         borderRadius: 6,
//         barThickness: 25
//       }]
//     },
//     options: {
//       ...CDAX,
//       scales: {
//         x: { grid: { display: false } },
//         y: { beginAtZero: true }
//       }
//     }
//   });
// }

// renderPieChart(id: string, dataMap: any) {
//   // Check if dataMap is valid, else use fallback
//   const labels = Object.keys(dataMap).length ? Object.keys(dataMap) : ['No Data'];
//   const values = Object.values(dataMap).length ? Object.values(dataMap) : [1];

//   return this.mkChart(id, {
//     type: 'pie',
//     data: {
//       labels: labels,
//       datasets: [{
//         data: values,
//         backgroundColor: ['#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'],
//         borderWidth: 0
//       }]
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: { 
//           position: 'bottom', 
//           labels: { 
//             usePointStyle: true, 
//             pointStyle: 'circle',
//             padding: 15,
//             font: { size: 10, weight: '500' } 
//           } 
//         }
//       }
//     }
//   });
// }


// 1. CDAX Definition (To fix Property 'CDAX' error)
CDAX = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' } } }
  }
};

// 2. Photo 3 Style Pink Bar Chart
// renderBarChart(id: string, data: any[], color: string, labels: string[]) {
//   const photo3Pink = '#f43f5e'; // Exact Pink from Photo 3

//   return this.mkChart(id, {
//     type: "bar",
//     data: {
//       labels: labels,
//       datasets: [{ 
//         data: data, 
//         backgroundColor: photo3Pink, 
//         borderRadius: 6,
//         barThickness: 25
//       }]
//     },
//     options: this.CDAX
//   });
// }


renderHorizontalBarChart(id: string, data: any[]) {
  return this.mkChart(id, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Incidents',
        data: data.map(d => d.value),
        backgroundColor: '#2dd4bf', // Modern Teal
        borderRadius: 4,
        barThickness: 15
      }]
    },
    options: {
      indexAxis: 'y', 
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          beginAtZero: true, 
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 9 } }
        },
        y: { 
          grid: { display: false },
          ticks: { font: { size: 10, weight: 'bold' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}


}