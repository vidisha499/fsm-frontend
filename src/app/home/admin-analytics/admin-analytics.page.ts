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
            return this.renderBarChart(id, d, COLORS.rose, []);
          }
        },
        { 
          title: "Range-wise Felling", id: "ac-f3", 
          render: (id: string, obj: any) => {
            const d = obj.dynamicData || [];
            return this.renderHorizontalBarChart(id, d);
          }
        },
        // { 
        //   title: "Daily Trend", id: "ac-f4", 
        //   render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.rose)
        // }
      ]
    },
    { 
      id: "transport", label: "Timber Transport", emoji: "🚛", color: COLORS.amber, val: 0,
      charts: [
        { 
          title: "30-Day Transport Trend", 
          sub: "Daily timber transport incidents over period",
          id: "ac-t1", 
          render: (id: string, obj: any) => this.renderTransportTrendChart(id, obj.trend30d || [])
        },
        //{ title: "Vehicle Type Analytics", id: "ac-t3", render: (id: string, obj: any) => this.renderBarChart(id, obj.vehicleAnalytics || [], COLORS.amber, []) },
        //{ title: "Top Smuggling Routes", id: "ac-t4", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.topRoutes || []) },
        { title: "Range-wise Transport", id: "ac-t2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
      ]
    },
    { 
      id: "storage", label: "Timber Storage", emoji: "📦", color: COLORS.orange, val: 0,
      charts: [
        { 
          title: "Storage by Species", 
          sub: "Volume stored in godowns vs open spaces",
          id: "ac-s3", 
          render: (id: string, obj: any) => this.renderStackedBarChart(id, obj.storageSpecies || []) 
        },
        { 
          title: "Storage Proportion", 
          sub: "Species-wise share of total seized timber",
          id: "ac-s4", 
          render: (id: string, obj: any) => this.renderStoragePieChart(id, obj.storageProportion || []) 
        }
      ]
    },
    { 
      id: "poaching", label: "Wild Animal Poaching", emoji: "🐾", color: COLORS.red, val: 0, 
      charts: [
        { title: "Species vs Incidents", id: "ac-p3", render: (id: string, obj: any) => this.renderDoubleBarChart(id, obj.poachingSpecies || []) },
        //{ title: "Incident Distribution", id: "ac-p4", render: (id: string, obj: any) => this.renderPieChart(id, obj.poachingDeathCause || []) }
      ]
    },
    { 
      id: "encroach", label: "Encroachment", emoji: "🚫", color: COLORS.pur, val: 0, 
      charts: [
        { title: "Encroachment Trend", id: "ac-e1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.pur) },
        { 
          title: "Type Distribution", 
          sub: "Agriculture vs Construction vs Other", 
          id: "ac-e2", 
          render: (id: string, obj: any) => this.renderEncroachDistributionBarChart(id, obj.dynamicData || []) 
        }
      ]
    },
    { 
      id: "mining", label: "Illegal Mining", emoji: "⛏️", color: COLORS.sl, val: 0, 
      charts: [
       // { title: "Mining Trend", id: "ac-m1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.sl) },
        { title: "Range-wise Mining", id: "ac-m2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
      ]
    }
  ]
},
// --- Updated ANA_CONFIG for Mobile App Options ---
events: {
    label: "🐾 Events & Monitoring",
    subs: [
      { 
        id: "jfmc", label: "JFMC / Social Forestry", emoji: "👥", color: COLORS.green, val: 0,
        charts: [
          { title: "JFMC Trend", id: "ev-jf1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.green) },
          { title: "Range-wise JFMC", id: "ev-jf2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
        ]
      },


{ 
  id: "wild_animal", 
  label: "Wild Animal Sighting", 
  icon: "paw", 
  color: "#2e7d32", 
  val: 0,
  charts: [
    { 
      title: "Sightings by Species", 
      sub: "Wild animal sightings per species this period",
      id: "ev-an1", 

      render: (id: string, obj: any) => {
        if (obj.config) {
          return this.renderCustomChart(id, obj.config); 
        }
        return this.renderBarChart(id, obj.dynamicData || [], "#4caf50", []);
      }
    },
    { 
      title: "Sighting Trend", 
      sub: "Daily sightings over selected period",
      id: "ev-an2", 
      render: (id: string, obj: any) => {
        if (obj.config) {
          return this.renderCustomChart(id, obj.config);
        }
        return this.renderLineChart(id, obj.dynamicData || [], "#4caf50");
      }

    }
  ]
},
      
      { 
        id: "water", label: "Water Source Status", emoji: "💧", color: COLORS.blue, val: 0,
        charts: [
          { title: "Water Source Trend,", id: "ev-wa1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.blue) },
          { title: "Water Sources", id: "ev-wa2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
        ]
      },
      { 
        id: "compensation", label: "Wildlife Compensation", emoji: "💵", color: COLORS.teal, val: 0,
        charts: [
        //  { title: "Compensation Trend", id: "ev-co1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.teal) },
          { title: "Range-wise Compensation", id: "ev-co2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
        ]
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
    this.activeTab = 'criminal';
    this.activeCatId = 'criminal';
    this.activeDateFilter = 'today';
    
    // Unified Data Load
    this.updateUIData();
    this.fetchRealAssetData(); 

    this.route.queryParams.subscribe((params: any) => {
        if (params && params.type) {
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

  renderCustomChart(canvasId: string, config: any) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;
  
  // Purana chart delete karna zaroori hai
  const existingChart = Chart.getChart(canvasId);
  if (existingChart) existingChart.destroy();

  return new Chart(canvas, config);
}

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



  // Replaced individual fetch methods with unified updateUIData()
  

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
      this.ANA_CONFIG.assets.subs = categories.map((cat: any, idx: number) => ({
        id: cat.name.toLowerCase().replace(/\s/g, '_'),
        label: cat.name,
        emoji: "🛡️", 
        icon: cat.icon_name || 'shield-checkmark-outline',
        color: PALETTE[idx % PALETTE.length] || COLORS.p, // Assign color from palette
        val: 0,
        charts: [{ 
          id: "ch-" + cat.id, 
          title: cat.name + " Status", 
          render: (chartId: string, ch: any) => {
            const current = this.displayProgList.find(s => s.label === cat.name);
            return this.renderGenericChart(chartId, cat.name, current?.val || 0, ch);
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

renderGenericChart(chartId: string, label: string, currentVal: number, chData?: any) {
  // 1. Use Real Status Data if available from backend
  if (chData && chData.statusDistribution && chData.statusDistribution.length > 0) {
    const labels = chData.statusDistribution.map((d: any) => d.label);
    const data = chData.statusDistribution.map((d: any) => d.value);
    
    return this.mkChart(chartId, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ 
          data: data, 
          backgroundColor: [COLORS.teal, COLORS.amber, COLORS.rose, COLORS.blue, COLORS.ind] 
        }]
      },
      options: {
        ...CDAX,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  }

  // 2. Fallback Logic (Mock status)
  const maintenance = currentVal > 0 ? Math.ceil(currentVal * 0.15) : 2; 

  return this.mkChart(chartId, {
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
    this.updateUIData(); // Global counts naye karo
    this.fetchRealAssetData();
    
    setTimeout(() => { 
      this.isRefreshing = false; 
      this.setAnaSub(this.activeSubId); // Active sub refresh karo
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
      console.log("🚀 Syncing Real Data [Analytics]:", res); 
      
      // 1. Sync Top-Level KPIs (Visible or used in logic)
      this.criminalCount = res.criminal_count || 0;
      this.eventsCount = res.events_count || 0;
      this.totalEvents = res.total_events || 0;
      this.fireCount = res.fire?.val || res.fire?.count || 0; // Fire handled as sub or total?

      this.destroyCharts();

      this.displayProgList = cat.subs.map((s: any) => {
        // Backend keys check with fallbacks for mapping mismatches
        let rawData = res[s.id] || res[s.id.toLowerCase()];
        
        // Manual Mapping fixes based on backend response structure
        if (!rawData) {
           if (s.id === 'compensation') rawData = res.wildlife_compensation;
           if (s.id === 'water') rawData = res.water_source_status || res.water;
           if (s.id === 'wild_animal') rawData = res.wild_animal || res.animal;
           if (s.id === 'jfmc') rawData = res.jfmc || res.jfmc_social_forestry;
        }

        const countVal = (typeof rawData === 'number') ? rawData : (rawData?.val || 0);

        if (s.charts && Array.isArray(s.charts)) {
          s.charts.forEach((ch: any) => {
            if (s.id === 'wild_animal' && ch.id === 'ev-an1') {
              ch.dynamicData = res.sightings_by_species || []; 
            } else if (ch.id === 'ev-an2' || (s.id === 'wild_animal' && ch.type === 'line')) {
              ch.dynamicData = res.trend_data || [];
            } else {
              ch.dynamicData = (rawData && Array.isArray(rawData.trend)) ? rawData.trend : [countVal];
            }
          });
        }

        return { 
          ...s, 
          val: countVal, 
          pct: 0 // Will calculate after mapping all
        };
      });

      // Calculate percentage relative to a baseline of 50 (or max if higher)
      // This ensures 1 incident looks small, but bars scale up if data grows.
      const vals = this.displayProgList.map(item => item.val);
      const maxInData = Math.max(...vals, 0);
      const visualMax = Math.max(maxInData, 50); // Minimum scale is 50
      
      this.displayProgList.forEach(item => {
        item.pct = Math.round((item.val / visualMax) * 100);
      });

      // REMOVED SORTING to match mock-up order (Felling, Transport, etc.)
      
      // Update total categories count
      this.currentCatSubsCount = this.displayProgList.length;

      this.cdr.detectChanges();
      const currentSub = this.displayProgList.find(sub => sub.id === this.activeSubId);
      this.currentSubCharts = currentSub?.charts || [];
      this.isRefreshing = false;

      // Render charts after DOM update
      setTimeout(() => {
        this.renderSubCharts();
        this.cdr.detectChanges();
      }, 500); 
    },
    error: (err) => {
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  });
}
// updateUIData ke andar jahan renderSubCharts call hota hai wahan ye check kar:
renderSubCharts() {
  if (!this.currentSubCharts) return;

  this.currentSubCharts.forEach((ch: any) => {
    // Agar wildlife ka bar chart hai (ev-an1)
    if (ch.id === 'ev-an1') {
      this.renderBarChart(ch.id, ch.dynamicData, '#16a34a', []); // Photo 1 Green
    } 
    // Agar trend chart hai (ev-an2)
    else if (ch.id === 'ev-an2') {
      this.renderLineChart(ch.id, ch.dynamicData, '#16a34a');
    }
    else if (ch.render) {
      ch.render(ch.id, ch); 
    }
  });
}

renderBarChart(id: string, data: any[], color: string, labels: string[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  const finalLabels = data.map(d => d.label || 'Unknown');
  const finalValues = data.map(d => Number(d.value) || 0);

  this.mkChart(id, {
    type: "bar",
    data: {
      labels: finalLabels,
      datasets: [{ 
        data: finalValues, 
        backgroundColor: '#34A853', // Original Green color
        borderRadius: 6,
        barThickness: 35, // Isse bars patli nahi dikhengi
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { 
          beginAtZero: true,
          suggestedMax: 10, // YE ZAROORI HAI: Taaki 1-2 value pe bars aadhi screen tak hi rahein
          ticks: { stepSize: 2, color: '#94a3b8', font: { size: 10 } },
          grid: { color: '#f1f5f9' }
        },
        x: { 
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        }
      }
    }
  });
}

setAnaSub(id: string) {
  this.activeSubId = id;
  this.destroyCharts();

  // Map frontend sub IDs to database report_type keywords (uses wildcard MATCH on backend)
  const subToReportType: any = {
    'felling': 'felling',
    'transport': 'transport',
    'storage': 'storage',
    'poaching': 'poaching',
    'encroach': 'encroach',
    'mining': 'mining',
    'jfmc': 'jfmc',
    'wild_animal': 'animal',
    'water': 'water',
    'compensation': 'compensation',
    'fire_incidents': 'fire'
  };

  // Map frontend sub IDs to database category
  const subToCategory: any = {
    'felling': 'crimes', 'transport': 'crimes', 'storage': 'crimes',
    'poaching': 'crimes', 'encroach': 'crimes', 'mining': 'crimes',
    'jfmc': 'events', 'wild_animal': 'events', 'water': 'events',
    'compensation': 'events', 'fire_incidents': 'fire'
  };

  const companyId = Number(localStorage.getItem('company_id') || '1');
  const reportType = subToReportType[id] || id;
  const category = subToCategory[id] || this.activeCatId;

  // Call new sub-category API
  this.isRefreshing = true;
  this.cdr.detectChanges();

  this.dataService.getSubCategoryAnalytics(
    companyId, category, reportType,
    this.activeDateFilter,
    this.startDate, this.endDate
  ).subscribe({
    next: (res: any) => {
      console.log(`📊 SubCategory Data [${id}]:`, res);

      // Find the sub in displayProgList or fall back to config
      const currentSub = this.displayProgList.find(s => s.id === id) 
        || this.getCurrentCat()?.subs.find((s: any) => s.id === id);
      
      if (!currentSub) return;

      // Update val count
      currentSub.val = res.total_count || 0;

      // Inject dynamic data into each chart
      if (currentSub.charts && Array.isArray(currentSub.charts)) {
        currentSub.charts.forEach((ch: any) => {
          const chartId = ch.id || '';

          if (chartId === 'ac-t1' && res.trend_30d) {
            ch.trend30d = res.trend_30d;
          } else if (chartId === 'ac-t3' && res.vehicle_analytics) {
            ch.vehicleAnalytics = res.vehicle_analytics;
          } else if (chartId === 'ac-t4' && res.top_routes) {
            ch.topRoutes = res.top_routes;
          } else if (chartId === 'ac-s3' && res.storage_species) {
            ch.storageSpecies = res.storage_species;
          } else if (chartId === 'ac-s4') {
            if (res.storage_proportion) ch.storageProportion = res.storage_proportion;
            else if (res.storage_species) ch.storageProportion = res.storage_species;
          } else if (chartId === 'ac-p4' && res.poaching_death_cause) {
            ch.poachingDeathCause = res.poaching_death_cause;
          }
          
          // Map asset status distribution if available
          if (res.status_distribution) {
            ch.statusDistribution = res.status_distribution;
          }

          
          // 2. Species/Type mapping charts
          if (chartId === 'ac-f1') {
            ch.dynamicData = res.species_volume || [];
          } else if (chartId === 'ac-e2') {
            ch.dynamicData = res.encroachment_types || [];
          } else if (chartId === 'ev-wa2') {
            ch.dynamicData = res.water_types || [];
          }
          // 3. Range-wise distribution charts (Matches all subcategories except e2, wa2)
          else if (chartId.includes('-f3') || chartId.includes('-t2') || chartId.includes('-s2') || 
                   chartId.includes('-p2') || chartId.includes('-m2') ||
                   chartId.includes('-jf2') || chartId.includes('-co2') ||
                   chartId.includes('-an3')) {
            ch.dynamicData = res.range_distribution || [];
          }
          // 4. Sightings by species (wild_animal specific: ev-an1)
          else if (chartId === 'ev-an1') {
            ch.dynamicData = res.sightings_by_species || [];
          }
          // 5. Default Trend charts (line charts)
          else {
            ch.dynamicData = res.trend_data || [];
          }
        });
      }

      this.currentSubCharts = currentSub.charts || [];
      this.isRefreshing = false;
      this.cdr.detectChanges();

      // Render charts after DOM update
      setTimeout(() => {
        this.renderSubCharts();
        this.cdr.detectChanges();
      }, 400);
    },
    error: (err: any) => {
      console.error('SubCategory API Error:', err);
      // Fallback: just show the existing charts without dynamic data
      const currentSub = this.displayProgList.find(s => s.id === id);
      this.currentSubCharts = currentSub?.charts || [];
      this.isRefreshing = false;
      this.cdr.detectChanges();
      setTimeout(() => this.renderSubCharts(), 400);
    }
  });
}


// ngOnInit ya kisi refresh function mein ye call karo
fetchRealAssetData() {
  const companyIdRaw = localStorage.getItem('company_id') || '1';
const companyId = Number(companyIdRaw); // Ya fir use karo: parseInt(companyIdRaw, 10)

  this.dataService.getAssetStats(companyId).subscribe((res: any) => {
    console.log("🛠️ Real Asset Data:", res);
    
    // 1. Update individual counts for standard categories
    this.realNurseryCount = res.nursery || 0;
    this.realPlantationCount = res.plantations || 0;
    this.realOfficeCount = res.offices || 0;
    this.realEcoCount = res.ecoSites || 0;

    // 2. Dynamically update ALL sub-category values in ANA_CONFIG
    if (this.ANA_CONFIG.assets && this.ANA_CONFIG.assets.subs) {
      this.ANA_CONFIG.assets.subs.forEach((s: any) => {
        // Match by ID (nursery, plantations, etc.) or by sanitized category name
        const count = res[s.id] || res[s.id.toLowerCase()] || 0;
        s.val = count;
      });
    }

    // 3. Refresh display list
    this.setAnaCat('assets'); 
  });
}


// --- HELPER FUNCTIONS FOR CHARTS (Add these) ---

private mkG(ctx: CanvasRenderingContext2D, color: string) {
  const g = ctx.createLinearGradient(0, 0, 0, 170);
  g.addColorStop(0, color + '66');
  g.addColorStop(1, color + '00');
  return g;
}

// Is version ko rakho aur doosre ko delete kar do
renderLineChart(id: string, data: any[], color: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  this.mkChart(id, {
    type: 'line',
    data: {
      labels: data.map(d => d.day_label || d.label || 'Today'),
      datasets: [{
        data: data.map(d => d.count || d.value || 0),
        borderColor: color || '#34A853',
        backgroundColor: ctx ? this.mkG(ctx, color || '#34A853') : 'rgba(52, 168, 83, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: color || '#34A853',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { suggestedMax: 10, beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

renderTransportTrendChart(id: string, data: any[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pinkColor = '#f43f5e'; // Pink from Mockup

  this.mkChart(id, {
    type: 'line',
    data: {
      labels: data.length ? data.map(d => d.label) : ['D1', 'D5', 'D10', 'D15', 'D20', 'D25', 'D30'],
      datasets: [{
        label: 'Quantity',
        data: data.length ? data.map(d => d.value) : [0, 0, 0, 0, 0, 0, 0],
        borderColor: pinkColor,
        backgroundColor: ctx ? this.mkG(ctx, pinkColor) : 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: pinkColor,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#1e293b',
          bodyColor: '#1e293b',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          displayColors: false
        }
      },
      scales: {
        y: { 
          title: { display: true, text: 'Timber Quantity', color: '#94a3b8', font: { size: 10 } },
          beginAtZero: true, 
          grid: { color: '#f1f5f9' },
          ticks: { color: '#94a3b8', font: { size: 9 } }
        },
        x: { 
          title: { display: true, text: 'Day', color: '#94a3b8', font: { size: 10 } },
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 9 } }
        }
      }
    }
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

renderStackedBarChart(id: string, data: any[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  const plotData = data || [];

  const labels = plotData.map(d => d.label || d.species || 'Unknown');
  const godownData = plotData.map(d => d.godown || 0);
  const openSpaceData = plotData.map(d => d.openSpace || 0);

  return this.mkChart(id, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Godown',
          data: godownData,
          backgroundColor: '#fba14d', // Godown color (amber/orange)
          barThickness: 35,
          maxBarThickness: 40
        },
        {
          label: 'Open Space',
          data: openSpaceData,
          backgroundColor: '#4abaa0', // Open space color (teal)
          barThickness: 35,
          maxBarThickness: 40
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
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
        } 
      },
      scales: {
        x: { 
          stacked: true,
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: { 
          stacked: true,
          suggestedMax: 150,
          grid: { color: '#f1f5f9' },
          ticks: { stepSize: 50, color: '#94a3b8', font: { size: 10 } }
        }
      }
    }
  });
}

renderStoragePieChart(id: string, data: any[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  const plotData = data || [];

  const labels = plotData.map(d => d.label || d.species || 'Unknown');
  const values = plotData.map(d => d.value || 0);

  return this.mkChart(id, {
    type: 'pie',
    data: {
      labels: labels.length ? labels : ['Pending'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: ['#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: true, 
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
        } 
      }
    }
  });
}

renderDoubleBarChart(id: string, data: any[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  const plotData = data || [];

  const labels = plotData.map(d => d.label || 'Unknown');
  const incidents = plotData.map(d => d.incidents || d.value || 0);
  const carcasses = plotData.map(d => d.carcasses || 0);

  return this.mkChart(id, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Incidents',
          data: incidents,
          backgroundColor: '#fb4f72', // Pink
          borderRadius: 4
        },
        {
          label: 'Carcasses',
          data: carcasses,
          backgroundColor: '#e8868c', // Light Pink
          borderRadius: 4
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
          labels: { usePointStyle: true, boxWidth: 10, font: { size: 10 } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        }
      }
    }
  });
}

renderEncroachDistributionBarChart(id: string, data: any[]) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  if (!canvas) return;

  const plotData = data || [];
  
  const colorMap: any = {
    'Agriculture': '#14b8a6', // Teal
    'Construction': '#8b5cf6', // Purple
    'Other': '#64748b', // Gray
    'Others': '#64748b', // Gray
    'Unknown': '#f59e0b',
  };

  const datasets = plotData.map(d => ({
    label: d.label || 'Unknown',
    data: [d.value || 0],
    backgroundColor: colorMap[d.label] || colorMap['Unknown'],
    borderRadius: 6,
    barThickness: 45,
    maxBarThickness: 50
  }));

  return this.mkChart(id, {
    type: 'bar',
    data: {
      labels: [''], // Single group axis
      datasets: datasets.length ? datasets : [
          { label: 'Pending', data: [0], backgroundColor: '#e2e8f0' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 10, font: { size: 10 } }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          suggestedMax: 5,
          ticks: { stepSize: 1, color: '#94a3b8', font: { size: 10 } },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

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