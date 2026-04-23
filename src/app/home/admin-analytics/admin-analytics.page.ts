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

const SPECIES = ['Sal', 'Saja', 'Sagaon', 'Beeja', 'Haldu', 'Dhawda', 'Safed Siris', 'Kala Siris', 'Jamun', 'Aam', 'Semal', 'Mahua', 'Tendu', 'Nilgiri', 'Others'];
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
  refreshInterval: any;

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

  manualSubCounts: any = {};
  manualSpeciesData: any = {};
  manualRangeData: any = {};
  manualStorageData: any = {
    'Sal': { godown: 0, openSpace: 0 }, 'Saja': { godown: 0, openSpace: 0 }, 'Sagaon': { godown: 0, openSpace: 0 },
    'Beeja': { godown: 0, openSpace: 0 }, 'Haldu': { godown: 0, openSpace: 0 }, 'Dhawda': { godown: 0, openSpace: 0 },
    'Safed Siris': { godown: 0, openSpace: 0 }, 'Kala Siris': { godown: 0, openSpace: 0 }, 'Others': { godown: 0, openSpace: 0 }
  };
  manualPoachingData: any = {
    'Sloth Bear': { male: 0, female: 0 }, 'Leopard': { male: 0, female: 0 }, 
    'Hyena': { male: 0, female: 0 }, 'Jackal': { male: 0, female: 0 }, 
    'Wild Bear': { male: 0, female: 0 }, 'Spotted Deer': { male: 0, female: 0 }, 
    'Sambar': { male: 0, female: 0 }, 'Others': { male: 0, female: 0 }
  };
  manualFireCauses: any = {};
  manualTrendData: any = {};
  manualEncroachData: any = { 'Agriculture': 0, 'Construction': 0, 'Other': 0 };
  manualWaterData: any = { 'Check Dam': 0, 'Stop Dam': 0, 'Dam': 0, 'Earthen Pond': 0, 'Concrete Pond': 0, 'Water Stream': 0, 'Well': 0, 'Others': 0 };
  
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
          render: (id: string, obj: any) => this.renderTransportTrendChart(id, obj.dynamicData || obj.trend30d || [])
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
          render: (id: string, obj: any) => this.renderStackedBarChart(id, obj.dynamicData || []) 
        },
        { 
          title: "Storage Proportion", 
          sub: "Species-wise share of total seized timber",
          id: "ac-s4", 
          render: (id: string, obj: any) => this.renderStoragePieChart(id, obj.dynamicData || []) 
        }
      ]
    },
    { 
      id: "poaching", label: "Wild Animal Poaching", emoji: "🐾", color: COLORS.red, val: 0, 
      charts: [
        { title: "Species with Gender", id: "ac-p3", render: (id: string, obj: any) => this.renderPoachingGenderChart(id, obj.dynamicData || []) },
        { title: "Range-wise Poaching", id: "ac-p2", render: (id: string, obj: any) => this.renderHorizontalBarChart(id, obj.dynamicData || []) }
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
          title: "Fire Cause Distribution", 
          sub: "What caused the fire — natural, negligence, intent",
          id: "ac-fc1", 
          render: (id: string, obj: any) => {
            const dataArr = obj?.dynamicData || [];
            
            const getVal = (labelMatch: string) => {
              const found = dataArr.find((d: any) => (d.label || '').toLowerCase().includes(labelMatch));
              return found ? found.count : 0;
            };

            const vals = [
              getVal('natural'),
              getVal('negligence'),
              getVal('intentional'),
              dataArr.filter((d: any) => !['natural', 'negligence', 'intentional'].some(x => (d.label || '').toLowerCase().includes(x)))
                .reduce((acc: number, val: any) => acc + val.count, 0)
            ];

            // Show placeholder if no data yet
            const hasData = vals.some(v => v > 0);
            return this.mkChart(id, { 
              type: "doughnut", 
              data: { 
                labels: ["Natural", "Negligence", "Intentional", "Unknown"],
                datasets: [{ 
                  data: hasData ? vals : [1, 1, 1, 1],
                  backgroundColor: ['#16a34a', '#f59e0b', '#ef4444', '#64748b'],
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
                    labels: { usePointStyle: true, boxWidth: 10, font: { size: 10 } }
                  }
                }
              }
            });
          }
        },
        { 
          title: "30-Day Fire Trend", 
          sub: "Daily fire alerts over the selected period",
          id: "ac-fi1", 
          render: (id: string, obj: any) => {
            // Check if backend provided fire_trend at top level OR in dynamicData
            const data = obj?.dynamicData || [];
            const labels = (obj?.dynamicLabels && obj.dynamicLabels.length > 0) ? obj.dynamicLabels : ['D1', 'D2', 'D3', 'D4'];
            
            const hasData = data.some((v: any) => v > 0);
            return this.mkChart(id, { 
              type: "line", 
              data: { 
                labels: labels,
                datasets: [{ 
                  label: "Fire Alerts",
                  data: hasData ? data : Array(labels.length).fill(0),
                  borderColor: COLORS.orange,
                  backgroundColor: COLORS.orange + '33',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: COLORS.orange,
                  borderWidth: 2
                }] 
              }, 
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'No. of Fire Alerts', font: { size: 10 }, color: '#94a3b8' },
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 9 }, color: '#94a3b8' }
                  },
                  x: {
                    title: { display: true, text: 'Day', font: { size: 10 }, color: '#94a3b8' },
                    grid: { display: false },
                    ticks: { font: { size: 9 }, color: '#94a3b8' }
                  }
                }
              }
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
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    this.companyId = userData.company_id || userData.companyId || 1;
    console.log("📈 Analytics Page Initialized for Company:", this.companyId);
    this.activeTab = 'criminal';
    this.activeCatId = 'criminal';
    this.activeDateFilter = 'today';
    
    // Unified Data Load
    this.updateUIData();
    this.fetchRealAssetData(); 

    // Refresh data every 30 seconds for "Live" experience
    this.refreshInterval = setInterval(() => {
      this.updateUIData();
    }, 30000);

    this.route.queryParams.subscribe((params: any) => {
        if (params && params.type) {
          this.setAnaCat(params.type); 
        } else {
          this.setAnaCat('criminal');
        }
    });
  }

  ngOnDestroy() { 
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
    this.dataService.getCategories(companyId).subscribe((categories: any) => {
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
      // Also trigger sub-category data fetch so charts render with real data
      setTimeout(() => {
        this.setAnaSub(this.activeSubId);
      }, 600);
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

  private isDateInTimeframe(dateStr: string, timeframe: string): boolean {
    if (!dateStr) return false;
    
    // Parse date (Handles YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
    let d: Date;
    if (dateStr.includes('-')) {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts[0].length === 4) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      else d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeframe === 'today') {
      return d.getTime() >= startOfToday.getTime();
    } else if (timeframe === 'week') {
      const lastWeek = new Date(startOfToday);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return d.getTime() >= lastWeek.getTime();
    } else if (timeframe === 'month') {
      const lastMonth = new Date(startOfToday);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return d.getTime() >= lastMonth.getTime();
    }
    
    return true; // 'all'
  }

  private formatTrendDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 10) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = dateStr.split('-');
    const day = parts[2];
    const month = months[parseInt(parts[1]) - 1];
    return `${day} ${month}`;
  }

  private toTitleCase(str: string): string {
    if (!str) return 'Unknown';
    return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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

  const storageData = localStorage.getItem('user_data');
  const user = storageData ? JSON.parse(storageData) : {};
  const companyId = user.company_id || user.companyId || '1';
  
  this.isRefreshing = true;
  this.cdr.detectChanges();

  this.dataService.getEventsAnalytics(
    Number(companyId), 
    this.activeDateFilter, 
    this.startDate, 
    this.endDate
  ).subscribe({
    next: (res: any) => {
      const apiRoot = res.data || res;
      console.log("🚀 Syncing Real Data Root [Analytics]:", apiRoot); 
      
      this.dataService.getForestReports().subscribe({
        next: (raw: any) => {
          const list = Array.isArray(raw) ? raw : (raw.data || []);
          console.log("📊 Direct Database Sync [Analytics]: Found", list.length, "Total Records");
          
          const mSubCounts: { [key: string]: number } = {};
          const mSpeciesData: { [key: string]: { [key: string]: number } } = {};
          const mRangeData: { [key: string]: { [key: string]: number } } = {};
          const mFireCauses: { [key: string]: number } = {};
          const mTrendData: { [key: string]: { [key: string]: number } } = {};
          const mEncroachData: { [key: string]: number } = { 'Agriculture': 0, 'Construction': 0, 'Other': 0 };
          const mWaterData: { [key: string]: number } = {
            'Check Dam': 0, 'Stop Dam': 0, 'Dam': 0, 'Earthen Pond': 0, 'Concrete Pond': 0, 'Water Stream': 0, 'Well': 0, 'Others': 0
          };
          const mStorageData: { [key: string]: { godown: number, openSpace: number } } = {
            'Sal': { godown: 0, openSpace: 0 }, 'Saja': { godown: 0, openSpace: 0 }, 'Sagaon': { godown: 0, openSpace: 0 },
            'Beeja': { godown: 0, openSpace: 0 }, 'Haldu': { godown: 0, openSpace: 0 }, 'Dhawda': { godown: 0, openSpace: 0 },
            'Safed Siris': { godown: 0, openSpace: 0 }, 'Kala Siris': { godown: 0, openSpace: 0 }, 'Others': { godown: 0, openSpace: 0 }
          };
          const mPoachingData: { [key: string]: { male: number, female: number } } = {
            'Sloth Bear': { male: 0, female: 0 }, 'Leopard': { male: 0, female: 0 }, 
            'Hyena': { male: 0, female: 0 }, 'Jackal': { male: 0, female: 0 }, 
            'Wild Bear': { male: 0, female: 0 }, 'Spotted Deer': { male: 0, female: 0 }, 
            'Sambar': { male: 0, female: 0 }, 'Others': { male: 0, female: 0 }
          };

          const manualWildAnimalData: { [key: string]: number } = {
            'Sloth Bear': 0, 'Leopard': 0, 'Hyena': 0, 'Jackal': 0, 'Wild Bear': 0, 'Spotted Deer': 0, 'Sambar': 0, 'Others': 0
          };

          let cCount = 0, fCount = 0, eCount = 0;

          if (list.length > 0) {
            list.forEach((r: any) => {
              const cat = (r.category || '').toLowerCase();
              const type = (r.report_type || r.report_data?.report_type || '').toLowerCase();
              const rDateStr = r.date || r.created_at || r.date_time || '';
              const rRaw = JSON.stringify(r).toLowerCase();

              if (this.selectedRange !== 'all') {
                 const rRange = (r.range_name || r.range || '').toLowerCase();
                 if (!rRange.includes(this.selectedRange.toLowerCase())) return;
              }

              let dateYMD = '';
              const cleanDate = (rDateStr || '').split(' ')[0];
              if (cleanDate.includes('-')) {
                const parts = cleanDate.split('-');
                if (parts[0].length === 4) dateYMD = `${parts[0]}-${parts[1]}-${parts[2]}`; 
                else if (parts[2].length === 4) dateYMD = `${parts[2]}-${parts[1]}-${parts[0]}`; 
              } else if (cleanDate.includes('/')) {
                const parts = cleanDate.split('/');
                if (parts[2].length === 4) dateYMD = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                else if (parts[0].length === 4) dateYMD = `${parts[0]}-${parts[1]}-${parts[2]}`; 
              }

              if (cat.includes('crim')) cCount++;
              else if (cat.includes('fire')) fCount++;
              else if (cat.includes('events') || cat.includes('sight') || cat.includes('monit')) eCount++;

              let subId = '';
              if (type.includes('transport') || type.includes('vehicle') || rRaw.includes('timber transport')) subId = 'transport';
              else if (type.includes('fell') || cat.includes('fell') || rRaw.includes('felling')) subId = 'felling';
              else if (type.includes('storage') || cat.includes('storage') || rRaw.includes('storage')) subId = 'storage';
              else if (type.includes('poach') || cat.includes('poach') || rRaw.includes('poach')) subId = 'poaching';
              else if (type.includes('encroach') || cat.includes('encroach') || rRaw.includes('encroach')) subId = 'encroach';
              else if (type.includes('mining') || cat.includes('mining') || rRaw.includes('mining')) subId = 'mining';
              else if (type.includes('wild') || cat.includes('sight') || cat.includes('animal')) subId = 'wild_animal';
              else if (type.includes('water') || cat.includes('water')) subId = 'water';
              else if (cat.includes('fire') || type.includes('fire') || rRaw.includes('fire')) subId = 'fire_incidents';
              else if (type.includes('compensation') || type.includes('loss')) subId = 'compensation';
              else if (type.includes('jfmc') || type.includes('social')) subId = 'jfmc';
              
              if (subId && dateYMD.length === 10) {
                const d = new Date(dateYMD);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                if (d >= thirtyDaysAgo) {
                  if (!mTrendData[subId]) mTrendData[subId] = {};
                  mTrendData[subId][dateYMD] = (mTrendData[subId][dateYMD] || 0) + 1;
                }
              }

              if (!this.isDateInTimeframe(rDateStr, this.activeDateFilter)) return;

              if (subId) {
                mSubCounts[subId] = (mSubCounts[subId] || 0) + 1;
                const rawSp = r.species || r.plant_species || r.animal_species || r.tree_species || r.report_data?.species || 'Others';
                const species = this.toTitleCase(rawSp);
                
                if (!mSpeciesData[subId]) {
                  mSpeciesData[subId] = {};
                  if (subId === 'wild_animal') Object.assign(mSpeciesData[subId], manualWildAnimalData);
                }
                mSpeciesData[subId][species] = (mSpeciesData[subId][species] || 0) + 1;

                const range = this.toTitleCase(r.range_name || r.range || r.region || 'General');
                if (!mRangeData[subId]) mRangeData[subId] = {};
                mRangeData[subId][range] = (mRangeData[subId][range] || 0) + 1;

                if (subId === 'encroach') {
                  const eType = (r.encroachment_type || r.report_data?.encroachment_type || '').toLowerCase();
                  if (eType.includes('agri')) mEncroachData['Agriculture']++;
                  else if (eType.includes('const') || eType.includes('house')) mEncroachData['Construction']++;
                  else mEncroachData['Other']++;
                }
                
                if (subId === 'storage') {
                  const sType = (r.storage_type || r.report_data?.storage_type || '').toLowerCase();
                  const qty = Number(r.qty_cmt || r.volume || r.report_data?.qty_cmt || r.report_data?.volume || r.amount || 1) || 1;
                  const isGodown = sType.includes('godown') || sType.includes('indoor') || sType.includes('warehouse') || sType.includes('room');
                  
                  // Fuzzy species matching to ensure data maps to the correct baseline labels
                  let matchedKey = 'Others';
                  for (const sName of SPECIES) {
                    if (species.trim().toLowerCase() === sName.trim().toLowerCase() || 
                        species.toLowerCase().includes(sName.toLowerCase()) || 
                        sName.toLowerCase().includes(species.toLowerCase())) {
                      matchedKey = sName;
                      break;
                    }
                  }
                  
                  if (!mStorageData[matchedKey]) mStorageData[matchedKey] = { godown: 0, openSpace: 0 };
                  if (isGodown) mStorageData[matchedKey].godown += qty;
                  else mStorageData[matchedKey].openSpace += qty;
                }

                if (subId === 'poaching') {
                  const gender = (r.gender || r.report_data?.gender || 'Unknown').toLowerCase();
                  if (!mPoachingData[species]) mPoachingData[species] = { male: 0, female: 0 };
                  if (gender.includes('male') && !gender.includes('female')) mPoachingData[species].male++;
                  else if (gender.includes('female')) mPoachingData[species].female++;
                  else mPoachingData[species].male++; // Default to male for incident if unknown but logged
                }

                if (subId === 'fire_incidents') {
                  const fType = (r.fire_cause || r.report_data?.fire_cause || 'Unknown').toLowerCase();
                  const key = this.toTitleCase(fType);
                  mFireCauses[key] = (mFireCauses[key] || 0) + 1;
                }

                if (subId === 'water') {
                  const wType = (r.source_type || r.report_data?.source_type || 'Others').toLowerCase();
                  let key = 'Others';
                  if (wType.includes('chek') || wType.includes('check')) key = 'Check Dam';
                  else if (wType.includes('stop dam')) key = 'Stop Dam';
                  else if (wType.includes('pond')) key = 'Pond';
                  else if (wType.includes('well')) key = 'Well';
                  else key = this.toTitleCase(wType);
                  mWaterData[key] = (mWaterData[key] || 0) + 1;
                }
              }
            });
          }
          
          this.criminalCount = cCount;
          this.fireCount = fCount;
          this.eventsCount = eCount;
          this.manualSubCounts = mSubCounts;
          this.manualSpeciesData = mSpeciesData;
          this.manualRangeData = mRangeData;
          this.manualStorageData = mStorageData;
          this.manualPoachingData = mPoachingData;
          this.manualFireCauses = mFireCauses;
          this.manualEncroachData = mEncroachData;
          this.manualWaterData = mWaterData;
          this.manualTrendData = mTrendData;

          // Centralized function to inject manual data into a sub-category config
          const injectManual = (s: any) => {
             if (s.charts && Array.isArray(s.charts)) {
                s.charts.forEach((ch: any) => {
                   const mSpec = this.manualSpeciesData[s.id] || {};
                   const mRange = this.manualRangeData[s.id] || {};
                   const mTrend = this.manualTrendData[s.id] || {};
                   
                   if (s.id === 'wild_animal' && ch.id === 'ev-an1') {
                       const mSpecArr = this.animalSpecies.map(sName => ({
                         label: sName,
                         value: mSpec[sName] || 0
                       }));
                       
                       Object.keys(mSpec).forEach(k => {
                         if (!this.animalSpecies.includes(k) && k !== 'Unknown') {
                           mSpecArr.push({ label: k, value: mSpec[k] });
                         }
                       });

                       if (mSpec['Unknown']) {
                         mSpecArr.push({ label: 'Unknown', value: mSpec['Unknown'] });
                       }
                       ch.dynamicData = mSpecArr;
                   } 
                   else if (s.id === 'storage') {
                      if (ch.id === 'ac-s3') {
                          ch.dynamicData = SPECIES.map(k => ({ label: k, godown: this.manualStorageData[k]?.godown || 0, openSpace: this.manualStorageData[k]?.openSpace || 0 }));
                      } else if (ch.id === 'ac-s4') {
                          ch.dynamicData = SPECIES.map(sName => ({ label: sName, value: (this.manualStorageData[sName]?.godown || 0) + (this.manualStorageData[sName]?.openSpace || 0) }));
                      }
                   }
                   else if (s.id === "poaching") {
                      if (ch.id === "ac-p3") {
                          ch.dynamicData = Object.keys(this.manualPoachingData).map(k => ({ 
                            label: k, 
                            male: this.manualPoachingData[k].male, 
                            female: this.manualPoachingData[k].female 
                          }));
                      } else if (ch.id === "ac-p2") {
                          ch.dynamicData = Object.keys(mRange).map(k => ({ label: k, value: mRange[k] }));
                      }
                   }
                   else if (s.id === "fire_incidents" && ch.id === "ac-fc1") {
                      const arr = Object.keys(this.manualFireCauses).map(k => ({ label: k, count: this.manualFireCauses[k] }));
                      ch.dynamicData = arr.length ? arr : (apiRoot.fire_causes || []);
                   }
                   else if (ch.id.includes('-f3') || ch.id.includes('-f1') || ch.id.includes('-t2') || ch.id.includes('-s2') || 
                            ch.id.includes('-p2') || ch.id.includes('-m2') || ch.id.includes('-e2') || ch.id.includes('-wa2') ||
                            ch.id.includes('-co2') || ch.id.includes('-jf2') || ch.id.includes('-p3') || ch.id.includes('-an3')) {
                      const src = (ch.id.includes('f1') || ch.id.includes('p3')) ? mSpec : mRange;
                      ch.dynamicData = Object.keys(src).map(k => ({ label: k, value: src[k] }));
                   }
                   
                    // 30-Day Trend for Trends (ac-t1, ac-e1, etc.)
                    if (ch.id === 'ac-t1' || ch.id === 'ac-e1' || ch.id === 'ev-an2' || ch.id === 'ac-fi1' || ch.id === 'ev-wa1' || ch.id === 'ev-jf1') {
                      const trend30 = [];
                      const labels30 = [];
                      const flatValues = [];
                      const today = new Date();
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(today.getDate() - i);
                        const key = d.toISOString().split('T')[0];
                        const label = this.formatTrendDate(key);
                        const val = mTrend[key] || 0;
                        trend30.push({ label: label, value: val });
                        labels30.push(label);
                        flatValues.push(val);
                      }
                      
                      ch.dynamicLabels = labels30;
                      ch.trend30d = trend30;
                      
                      if (ch.id === 'ac-fi1') {
                        ch.dynamicData = flatValues;
                      } else {
                        ch.dynamicData = trend30;
                      }
                    }
                    
                    
                    // Water Sources Distribution (ev-wa2)
                    if (ch.id === 'ev-wa2') {
                       const arr = Object.keys(this.manualWaterData).map(k => ({ label: k, value: this.manualWaterData[k] }));
                       ch.dynamicData = arr;
                    }

                    // Encroachment Type Distribution (ac-e2)
                    if (ch.id === 'ac-e2') {
                       const arr = Object.keys(this.manualEncroachData).map(k => ({ label: k, value: this.manualEncroachData[k] }));
                       ch.dynamicData = arr;
                    }
                    
                });
             }
          };

          // Generate Display List
          this.destroyCharts();
          this.displayProgList = cat.subs.map((s: any) => {
            let apiData = res.data ? (res.data[s.id] || res.data[s.id.toLowerCase()]) : (res[s.id] || res[s.id.toLowerCase()]);
            const manualVal = this.manualSubCounts[s.id] || 0;
            const apiVal = (typeof apiData === 'number') ? apiData : (apiData?.val || 0);
            const countVal = Math.max(apiVal, manualVal);

            // Inject manual charts for this sub
            injectManual(s);

            // Default fallback for trend
            if (s.charts) {
              s.charts.forEach((ch: any) => {
                if (!ch.dynamicData || (Array.isArray(ch.dynamicData) && !ch.dynamicData.length)) {
                   ch.dynamicData = (apiData && Array.isArray(apiData.trend)) ? apiData.trend : [countVal];
                }
              });
            }

            return { ...s, val: countVal, pct: 0 };
          });

          // Calculate visual percentages
          const vals = this.displayProgList.map(item => item.val);
          const visualMax = Math.max(...vals, 50);
          this.displayProgList.forEach(item => {
            item.pct = Math.round((item.val / visualMax) * 100);
          });
          
          // FORCED RE-RENDER: Ensure view updates after manual aggregation finishes
          this.cdr.detectChanges();
          setTimeout(() => {
             this.renderSubCharts();
             this.cdr.detectChanges();
          }, 400);

          this.currentCatSubsCount = this.displayProgList.length;
          this.cdr.detectChanges();

          const currentSub = this.displayProgList.find(sub => sub.id === this.activeSubId);
          this.currentSubCharts = currentSub?.charts || [];

          this.isRefreshing = false;
          setTimeout(() => {
            this.renderSubCharts();
            this.cdr.detectChanges();
          }, 500); 
        },
        error: (err) => {
          console.error("❌ Analytics Direct Sync Failure:", err);
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }
      });
    },
    error: (err) => {
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  });
}
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
        backgroundColor: color || '#34A853',
        borderRadius: 8,
        barThickness: 30,
        categoryPercentage: 0.8
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
          beginAtZero: true,
          suggestedMax: 5,
          ticks: { stepSize: 1, color: '#94a3b8', font: { size: 10 } },
          grid: { color: '#f1f5f9', drawTicks: false }
        },
        x: { 
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10, weight: '600' } }
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

      // Update val count with resilient mapping
      const rawData = res.data || res;
      const apiVal = rawData.total_count ?? rawData.count ?? rawData.total ?? rawData.val ?? rawData.records ?? 0;
      
// Preserve the manual sync count if it's higher than the API response
      currentSub.val = Math.max(currentSub.val || 0, Number(apiVal));
      console.log(`🔍 Combined Val for [${id}]:`, { api: apiVal, final: currentSub.val, raw: rawData });

      // Inject dynamic data with fallback to manual sync
      const manualSpec = this.manualSpeciesData[id] || {};
      const manualRange = this.manualRangeData[id] || {};

      if (currentSub.charts && Array.isArray(currentSub.charts)) {
        currentSub.charts.forEach((ch: any) => {
          const chartId = ch.id || '';

          if (chartId === 'ac-t1' && rawData.trend_30d) {
            ch.trend30d = rawData.trend_30d;
          } else if (chartId === 'ac-t3' && rawData.vehicle_analytics) {
            ch.vehicleAnalytics = rawData.vehicle_analytics;
          } else if (chartId === 'ac-t4' && rawData.top_routes) {
            ch.topRoutes = rawData.top_routes;
          } else if (chartId === 'ac-s3') {
            const mStorage = SPECIES.map(k => ({ 
              label: k, 
              godown: this.manualStorageData[k]?.godown || 0,
              openSpace: this.manualStorageData[k]?.openSpace || 0
            }));
            ch.dynamicData = mStorage;
          } else if (chartId === 'ac-s4') {
            const mSpecArr = SPECIES.map(sName => {
              const sData = this.manualStorageData[sName] || { godown: 0, openSpace: 0 };
              return {
                label: sName,
                value: sData.godown + sData.openSpace
              };
            });
            ch.dynamicData = mSpecArr;
          } else if (chartId === 'ac-p4' && rawData.poaching_death_cause) {
            ch.poachingDeathCause = rawData.poaching_death_cause;
          }
          
          if (rawData.status_distribution) {
            ch.statusDistribution = rawData.status_distribution;
          }

          // Species/Type mapping
          if (chartId === 'ac-f1') {
            // Volume by Species - Ensure ALL species from the master list are shown
            const mSpecArr = SPECIES.map(sName => ({
              label: sName,
              value: manualSpec[sName] || 0
            }));
            
            // Add any other species found in manualSpec that aren't in the master list
            Object.keys(manualSpec).forEach(k => {
              if (!SPECIES.includes(k) && k !== 'Unknown') {
                mSpecArr.push({ label: k, value: manualSpec[k] });
              }
            });
            
            // If Unknown has value, add it at the end
            if (manualSpec['Unknown']) {
              mSpecArr.push({ label: 'Unknown', value: manualSpec['Unknown'] });
            }

            ch.dynamicData = mSpecArr;
          } else if (chartId === 'ac-e2') {
            const mEncArr = Object.keys(this.manualEncroachData).map(k => ({ label: k, value: this.manualEncroachData[k] }));
            ch.dynamicData = mEncArr.length ? mEncArr : (rawData.encroachment_types || []);
          } else if (chartId === 'ev-wa2') {
            const mWaterArr = Object.keys(this.manualWaterData).map(k => ({ label: k, value: this.manualWaterData[k] }));
            ch.dynamicData = mWaterArr.length ? mWaterArr : (rawData.water_types || []);
          }
          else if (chartId.includes('-f3') || chartId.includes('-t2') || chartId.includes('-s2') || 
                   chartId.includes('-p2') || chartId.includes('-m2') ||
                   chartId.includes('-jf2') || chartId.includes('-co2') ||
                   chartId.includes('-an3')) {
            let mRangeArr = Object.keys(manualRange).map(k => ({ label: k, value: manualRange[k] }));
            
            // For Illegal Felling and Timber Transport, ensure the standard three ranges are always represented
            if (id === 'felling' || id === 'transport') {
              const targetRanges = ['R2 Test', 'R1 Kankher Test', 'General'];
              const finalArr = targetRanges.map(name => ({
                label: name,
                value: manualRange[name] || 0
              }));
              
              // Add any other ranges found in data
              Object.keys(manualRange).forEach(k => {
                if (!targetRanges.includes(k)) {
                  finalArr.push({ label: k, value: manualRange[k] });
                }
              });
              mRangeArr = finalArr;
            }

            // Favor manual real-time range distribution for felling and transport
            if ((id === 'felling' || id === 'transport') && mRangeArr.length > 0) {
              ch.dynamicData = mRangeArr;
            } else {
              ch.dynamicData = rawData.range_distribution && rawData.range_distribution.length ? rawData.range_distribution : mRangeArr;
            }
          }
          else if (chartId === 'ev-an1') {
            const mSpecArr = this.animalSpecies.map(sName => ({
              label: sName,
              value: manualSpec[sName] || 0
            }));
            
            // Add any other animals found in manualSpec
            Object.keys(manualSpec).forEach(k => {
              if (!this.animalSpecies.includes(k) && k !== 'Unknown') {
                mSpecArr.push({ label: k, value: manualSpec[k] });
              }
            });

            if (manualSpec['Unknown']) {
              mSpecArr.push({ label: 'Unknown', value: manualSpec['Unknown'] });
            }

            ch.dynamicData = mSpecArr;
          }
          else if (chartId === 'ac-fc1') {
            const mFireArr = Object.keys(this.manualFireCauses).map(k => ({ label: k, count: this.manualFireCauses[k] }));
            ch.dynamicData = rawData.fire_causes && rawData.fire_causes.length ? rawData.fire_causes : mFireArr;
          }
          else if (chartId === 'ac-t1' || chartId === 'ac-e1' || chartId === 'ev-wa1' || chartId === 'ev-jf1' || chartId === 'ev-an2' || chartId === 'ac-fi1') {
            // Prioritize manually calculated 30-day trend
            if (ch.trend30d && ch.trend30d.length > 0) {
              if (chartId === 'ac-fi1') {
                ch.dynamicData = ch.trend30d.map((d: any) => d.value);
              } else {
                ch.dynamicData = ch.trend30d;
              }
              ch.dynamicLabels = ch.trend30d.map((d: any) => d.label);
            } else {
              ch.dynamicData = rawData.trend_data || [];
            }
          }
          else {
            ch.dynamicData = rawData.trend_data || [];
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
  const storageData = localStorage.getItem('user_data');
  const user = storageData ? JSON.parse(storageData) : {};
  const companyId = Number(user.company_id || user.companyId || 1);

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
    // this.setAnaCat('assets'); // REMOVED: This was forcing the tab switch incorrectly
    this.cdr.detectChanges(); 
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
          suggestedMax: 5,
          grid: { color: '#f1f5f9' },
          ticks: { color: '#94a3b8', font: { size: 9 }, stepSize: 1 }
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
            ...CDAX,
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
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'Open Space',
          data: openSpaceData,
          backgroundColor: '#4abaa0', // Open space color (teal)
          barPercentage: 0.6,
          categoryPercentage: 0.8
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
      labels: labels.length ? labels : SPECIES,
      datasets: [{
        data: values.length && values.some(v => v > 0) ? values : Array(labels.length || SPECIES.length).fill(0),
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

  renderPoachingGenderChart(id: string, data: any[]) {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    const plotData = data || [];
    const labels = plotData.map(d => d.label || 'Unknown');
    const males = plotData.map(d => d.male || 0);
    const females = plotData.map(d => d.female || 0);

    return this.mkChart(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Male',
            data: males,
            backgroundColor: '#3b82f6', // Blue
            borderRadius: 4
          },
          {
            label: 'Female',
            data: females,
            backgroundColor: '#ec4899', // Pink
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
            stacked: true,
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            stacked: true,
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
  if (!data || !data.length) return;
  
  return this.mkChart(id, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Incidents',
        data: data.map(d => d.value),
        backgroundColor: '#2dd4bf', 
        borderRadius: 6,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y', 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: { 
          beginAtZero: true, 
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 9 }, stepSize: 1 }
        },
        y: { 
          grid: { display: false },
          ticks: { 
            font: { size: 11, weight: '600' },
            color: '#334155'
          }
        }
      }
    }
  });
}

}
