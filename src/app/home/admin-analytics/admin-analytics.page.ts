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
      id: "felling", 
      label: "Illegal Felling", 
      emoji: "🪓", 
      color: COLORS.rose, 
      val: 0, 
      charts: [
        { 
          title: "Volume by Species", 
          id: "ac-f1", 
          // 'obj' parameter se hum dynamicData access karenge
          render: (id: string, obj: any) => {
            const data = obj?.dynamicData || [];
            const labels = this.activeDateFilter === 'today' ? ['6 AM', '12 PM', '6 PM'] : SPECIES;
            
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
        { 
          title: "Probable Reason", 
          id: "ac-f2", 
          render: (id: string, obj: any) => this.mkChart(id, { 
            type: "pie", 
            data: { 
              labels: ["Trade", "Fuel", "Agri", "Other"], 
              datasets: [{ data: obj?.dynamicData || [], backgroundColor: PALETTE }] 
            }, 
            options: { ...CDAX, plugins: { legend: { display: true, position: 'bottom' } } } 
          }) 
        },
        { 
          title: "Range-wise Felling", 
          id: "ac-f3", 
          render: (id: string, obj: any) => this.mkChart(id, { 
            type: "bar", 
            data: { 
              labels: REGIONS, 
              datasets: [{ label: "Incidents", data: obj?.dynamicData || [], backgroundColor: COLORS.teal, borderRadius: 4 }] 
            }, 
            options: { ...CDAX, indexAxis: 'y' } 
          }) 
        } 
      ]
    },
    { 
      id: "transport", 
      label: "Timber Transport", 
      emoji: "🚛", 
      color: COLORS.amber, 
      val: 0, 
      charts: [
        { 
          title: "Vehicle Type Analytics", 
          id: "ac-t1", 
          render: (id: string, obj: any) => this.mkChart(id, { 
            type: "bar", 
            data: { 
              labels: ["Truck", "Tractor", "Tempo", "Private"], 
              datasets: [{ data: obj?.dynamicData || [], backgroundColor: COLORS.ind, borderRadius: 4 }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    },
    { 
      id: "storage", 
      label: "Timber Storage", 
      emoji: "📦", 
      color: COLORS.orange, 
      val: 0, 
      charts: [
        { 
          title: "Storage by Species", 
          id: "ac-s1", 
          render: (id: string, obj: any) => this.mkChart(id, { 
            type: "bar", 
            data: { 
              labels: SPECIES.slice(0, 6), 
              datasets: [
                { label: "Storage Data", data: obj?.dynamicData || [], backgroundColor: COLORS.amber }
              ] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    },
    { 
      id: "poaching", 
      label: "Poaching", 
      emoji: "🐾", 
      color: COLORS.red, 
      val: 0, 
      charts: [
        { 
          title: "Species vs Incidents", 
          id: "ac-p1", 
          render: (id: string, obj: any) => this.mkChart(id, { 
            type: "bar", 
            data: { 
              labels: ANIMALS.slice(0, 5), 
              datasets: [{ label: "Incidents", data: obj?.dynamicData || [], backgroundColor: COLORS.rose }] 
            }, 
            options: CDAX 
          }) 
        }
      ]
    }
  ]
},
// --- Updated ANA_CONFIG for Mobile App Options ---
events: {
  label: "🐾 Events & Monitoring",
  subs: [
    { 
      id: "animal", 
      label: "Animal Sighting", 
      emoji: "🐾", 
      color: COLORS.orange, 
      val: 0, 
      charts: [{ title: "Sighting Trend", id: "ev-an1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.orange) }]
    },
    { 
      id: "water", 
      label: "Water Source", 
      emoji: "💧", 
      color: COLORS.blue, 
      val: 0, 
      charts: [{ title: "Water Levels", id: "ev-wa1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.blue, ["Lake", "River", "Tank"]) }]
    },
    { 
      id: "impact", 
      label: "Human Impact", 
      emoji: "🚶", 
      color: COLORS.pur, 
      val: 0, 
      charts: [{ title: "Activity Trend", id: "ev-im1", render: (id: string, obj: any) => this.renderLineChart(id, obj.dynamicData || [], COLORS.pur) }]
    },
    { 
      id: "death", 
      label: "Wildlife Death", 
      emoji: "💀", 
      color: COLORS.red, 
      val: 0, 
      charts: [{ title: "Mortality Cases", id: "ev-de1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.red, ["Z1", "Z2", "Z3"]) }]
    },
    { 
      id: "felling", 
      label: "Illegal Felling", 
      emoji: "🪓", 
      color: COLORS.green, 
      val: 0, 
      charts: [{ title: "Trees Lost", id: "ev-fe1", render: (id: string, obj: any) => this.renderBarChart(id, obj.dynamicData || [], COLORS.green, ["Teak", "Sal", "Other"]) }]
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


// setAnaCat(id: string) {
//   const cat = this.ANA_CONFIG[id];
//   if (cat) {
//     this.activeTab = id; 
//     this.activeCatId = id; 
//     this.activeSubId = cat.subs[0]?.id; 

//     console.log("Switching Category to:", id); // Check karo yahan kya aa raha hai

//     this.destroyCharts(); 
    
//     // Yahan ensure karo ki loadData() ko pata chale ki category change hui hai
//     this.loadData(); 
//     this.updateUIData(); 
    
//     this.cdr.detectChanges();
//   }
// }

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

  // getCurrentCat() { return this.ANA_CONFIG[this.activeTab]; }
  getCurrentCat() { 
  // Agar activeTab update nahi hua toh ye hamesha default 'criminal' hi return karega
  console.log('Current Active Tab:', this.activeTab); 
  return this.ANA_CONFIG[this.activeTab]; 
}
  getCurrentSub() { return this.getCurrentCat()?.subs.find((s: any) => s.id === this.activeSubId); }



// private mkChart(id: string, config: any) {
//   const canvas = document.getElementById(id) as HTMLCanvasElement;
//   if (!canvas) return;

//   // 1. Chart.js ka built-in method use karo instance check karne ke liye
//   const existingChart = Chart.getChart(canvas); 
//   if (existingChart) {
//     existingChart.destroy();
//   }

//   // 2. Extra safety: Clear the canvas context
//   const ctx = canvas.getContext('2d');
//   if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

//   try {
//     const chart = new Chart(canvas, config);
//     this.chartInstances.set(id, chart);
//     return chart;
//   } catch (e) {
//     console.error("Chart Creation Error:", e);
//     return null;
//   }
// }


private mkChart(id: string, config: any) {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  
  // 1. Basic checks
  if (!canvas || !config) {
    console.warn(`Canvas or Config missing for ID: ${id}`);
    return null;
  }

  // 2. Clear Existing Instance (Conflict Fix)
  const existingChart = Chart.getChart(canvas); 
  if (existingChart) {
    existingChart.destroy();
  }

  // 3. Clear Context (Surgical Clean)
  // Kabhi-kabhi destroy() ke baad bhi context mein purana data reh jata hai
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  try {
    // 4. Data Validation before Render
    if (config.data && config.data.datasets && config.data.datasets.length > 0) {
      const chart = new Chart(canvas, config);
      
      // 5. Global state mein store karein taaki ngOnDestroy pe clean kar sakein
      this.chartInstances.set(id, chart);
      return chart;
    } else {
      console.warn(`No data found to render chart for ID: ${id}`);
      return null;
    }
  } catch (e) {
    console.error("Chart Render Error:", e);
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
  
  // Pehle saare purane charts clear honge (optional but good practice)
  this.destroyCharts();

  sub.charts.forEach((ch: any) => {
    const el = document.getElementById(ch.id);
    
    // Check karo ki Canvas element DOM mein aa gaya hai ya nahi
    if (el) {
      console.log(`Rendering Chart: ${ch.id}`, ch);
      
      // SIRF EK BAAR CALL KARO aur 'ch' (object) pass karo
      // Taaki render function ko 'dynamicData' mil sake
      ch.render(ch.id, ch);
    } else {
      console.warn(`Canvas element with ID ${ch.id} not found in DOM yet.`);
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

async updateUIData() {
  const cat = this.getCurrentCat();
  if (!cat) return;

  const companyId = localStorage.getItem('companyId') || '1';
  const timeframe = this.activeDateFilter; 
  const range = this.selectedRange || 'all';
  const beat = this.selectedBeat || 'all';

  this.isRefreshing = true;

  let dataCall;
  if (this.activeCatId === 'fire') {
    dataCall = this.dataService.getFireAnalytics(companyId, timeframe, range, beat);
  } else if (this.activeCatId === 'events') {
    dataCall = this.dataService.getEventsAnalytics(Number(companyId), timeframe);
  } else if (this.activeCatId === 'assets') {
    const cId = localStorage.getItem('company_id') || localStorage.getItem('companyId') || '1';
    dataCall = this.dataService.get(`assets/analytics/dynamic-stats/${cId}?timeframe=${timeframe}`);
  } else {
    dataCall = this.dataService.getCriminalAnalytics(companyId, timeframe, range, beat);
  }

  dataCall.subscribe({
    next: (res: any) => {
      console.log("Backend Response Received:", res);

      // Step 1: Pehle saare counts extract kar lo (Simple + Object types)
      const mappedItems = cat.subs.map((s: any) => {
        let backendKey = s.id;

        // Domain Specific Mapping
        if (this.activeCatId === 'criminal') {
          const crimMap: any = { 'felling': 'felling', 'transport': 'transport', 'storage': 'storage', 'poaching': 'poaching', 'encroach': 'encroach' };
          backendKey = crimMap[s.id] || s.id;
        } else if (this.activeCatId === 'events') {
          const eventMap: any = { 'animal': 'animal_sighting', 'water': 'water_source', 'impact': 'human_impact', 'death': 'wildlife_death', 'felling': 'illegal_felling' };
          backendKey = eventMap[s.id] || s.id;
        } else if (this.activeCatId === 'assets') {
          const assetMap: any = { 'nursery': 'nursery', 'offices': 'offices', 'watchtowers': 'watch_towers', 'plantations': 'plantations' };
          backendKey = assetMap[s.id] || s.id;
        } else if (this.activeCatId === 'fire') {
          backendKey = 'fire_incidents';
        }

        const rawData = res[backendKey];
        let countVal = 0;

        // Dynamic extraction based on your console logs
        if (typeof rawData === 'number') countVal = rawData;
        else if (rawData?.val !== undefined) countVal = rawData.val;
        else if (res[backendKey] !== undefined) countVal = typeof res[backendKey] === 'number' ? res[backendKey] : (res[backendKey].val || 0);

        return { ...s, val: countVal, rawData: rawData };
      });

      // Step 2: DYNAMIC MAX: Pooray list mein se Max value dhoondo
      const maxVal = Math.max(...mappedItems.map((i: any) => i.val), 10); // Default 5 rakha hai taaki line ekdam se full na ho jaye

      // Step 3: Final list create karo PCT calculation ke saath
      this.displayProgList = mappedItems.map((item: any) => {
        // PCT formula jo HTML [style.width.%] ke liye chahiye
        const percentage = item.val > 0 ? Math.min(Math.round((item.val / maxVal) * 100), 100) : 0;

        // Chart dynamic data injection
        let trendArray = [0, 0, 0, item.val];
        if (item.rawData && Array.isArray(item.rawData.trend)) trendArray = item.rawData.trend;

        if (item.charts) {
          item.charts.forEach((ch: any) => { ch.dynamicData = trendArray; });
        }

        return { ...item, pct: percentage };
      });

      // Force UI Update
      this.destroyCharts();
      this.cdr.detectChanges(); 

      const currentSub = cat.subs.find((s: any) => s.id === this.activeSubId);
      this.currentSubCharts = currentSub?.charts || [];
      
      this.isRefreshing = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.renderSubCharts(); 
      }, 600);
    },
    error: (err: any) => {
      console.error(`Fetch Error:`, err);
      this.isRefreshing = false;
      this.destroyCharts();
      this.cdr.detectChanges();
    }
  });
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

// --- HELPER FUNCTIONS FOR CHARTS (Add these) ---

renderLineChart(id: string, data: any[], color: string) {
  return this.mkChart(id, {
    type: "line",
    data: {
      labels: ['D1', 'D2', 'D3', 'D4', 'D5'],
      datasets: [{ 
        data, 
        borderColor: color, 
        fill: true, 
        tension: 0.4, 
        backgroundColor: color + '1A' // 10% opacity for fill
      }]
    },
    options: CDAX
  });
}

renderBarChart(id: string, data: any[], color: string, labels: string[]) {
  return this.mkChart(id, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{ 
        data, 
        backgroundColor: color, 
        borderRadius: 4 
      }]
    },
    options: CDAX
  });
}



}