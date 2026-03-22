import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const COLORS = { p: '#0d9488', rose: '#f43f5e', amber: '#f59e0b', orange: '#fb923c', red: '#ef4444', pur: '#8b5cf6', sl: '#64748b', teal: '#14b8a6', blue: '#3b82f6', ind: '#6366f1', green: '#10b981' };
const SPECIES = ['Teak', 'Sal', 'Sandalwood', 'Rosewood', 'Pine', 'Bamboo', 'Sagaon', 'Beeja'];
const REGIONS = ['North Division', 'South Valley', 'East Plateau', 'River Buffer', 'West Ridge'];
const ANIMALS = ['Tiger', 'Elephant', 'Leopard', 'Deer', 'Bison'];
const PALETTE = [COLORS.p, COLORS.rose, COLORS.amber, COLORS.ind, COLORS.pur];

const CDAX: any = {
  responsive: true, maintainAspectRatio: false,
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
  standalone: false
})
export class AdminAnalyticsPage implements OnInit, OnDestroy {
  activeTab: string = 'criminal';
  activeSubId: string = 'felling';
  activeDateFilter: string = 'month';
  isFilterCollapsed: boolean = true;
  isRefreshing: boolean = false;
  private chartInstances: Map<string, Chart> = new Map();

  catList = [
    { id: 'criminal', label: '🌲 Criminal' },
    { id: 'events', label: '🐾 Events' },
    { id: 'fire', label: '🔥 Fire' },
    { id: 'assets', label: '🛡️ Assets' }
  ];

  ANA_CONFIG: any = {
    criminal: {
      label: "🌲 Criminal Activity",
      subs: [
        { id: "felling", label: "Illegal Felling", emoji: "🪓", color: COLORS.rose, val: 20, charts: [
          { title: "Volume by Species", sub: "Quantity of timber illegally felled", id: "ac-f1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: SPECIES, datasets: [{ label: "Qty", data: this.rnd(8, 150, 10), backgroundColor: COLORS.rose + "CC", borderRadius: 4 }] }, options: CDAX }) },
          { title: "Probable Reason", sub: "Trade / Fuel / Agri / Other", id: "ac-f2", render: (id: string) => this.mkChart(id, { type: "pie", data: { labels: ["Trade", "Fuel", "Agri", "Other"], datasets: [{ data: [45, 25, 20, 10], backgroundColor: PALETTE }] }, options: { ...CDAX, plugins: { legend: { display: true, position: 'bottom' } } } }) }
        ]},
        { id: "transport", label: "Timber Transport", emoji: "🚛", color: COLORS.amber, val: 15, charts: [
          { title: "Vehicle Type Analytics", sub: "Timber smuggling by vehicle type", id: "ac-t1", render: (id: string) => this.mkChart(id, { type: "bar", data: { labels: ["Truck", "Tractor", "Tempo", "Private"], datasets: [{ data: this.rnd(4, 300, 20), backgroundColor: COLORS.ind + "CC", borderRadius: 4 }] }, options: CDAX }) }
        ]}
      ]
    },
    // ... Copy the rest of your ANA_CONFIG objects (fire, assets, etc.) here
  };

  constructor() {}

  ngOnInit() { this.setAnaCat('criminal'); }
  ngOnDestroy() { this.destroyCharts(); }

  setAnaCat(id: string) {
    this.activeTab = id;
    const cat = this.ANA_CONFIG[id];
    if (cat?.subs?.length) this.setAnaSub(cat.subs[0].id);
  }

  setAnaSub(id: string) {
    this.activeSubId = id;
    this.destroyCharts();
    setTimeout(() => this.renderSubCharts(), 100);
  }

  renderSubCharts() {
    const sub = this.getCurrentSub();
    if (sub) sub.charts.forEach((ch: any) => ch.render(ch.id));
  }

  getCurrentCat() { return this.ANA_CONFIG[this.activeTab]; }
  getCurrentSub() { return this.getCurrentCat()?.subs.find((s: any) => s.id === this.activeSubId); }

  getProgNorm() {
    const cat = this.getCurrentCat();
    if (!cat) return [];
    const max = Math.max(...cat.subs.map((s: any) => s.val || 0));
    return cat.subs.map((s: any) => ({ ...s, pct: Math.round((s.val / max) * 100) }));
  }

  doRefresh() {
    this.isRefreshing = true;
    setTimeout(() => { this.isRefreshing = false; this.renderSubCharts(); }, 800);
  }

  private mkChart(id: string, config: any) {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    const chart = new Chart(canvas, config);
    this.chartInstances.set(id, chart);
  }

  private destroyCharts() {
    this.chartInstances.forEach(c => c.destroy());
    this.chartInstances.clear();
  }

  private rnd(len: number, max: number, min: number = 0) {
    return Array.from({ length: len }, () => Math.floor(Math.random() * (max - min + 1) + min));
  }

  getActivity() {
    const map: any = {
      felling: [{ d: COLORS.rose, t: "Illegal Felling · Beat Alpha", m: "14 min ago" }],
      transport: [{ d: COLORS.amber, t: "Truck Intercepted · Route 44", m: "2h ago" }]
    };
    return map[this.activeSubId] || [{ d: COLORS.sl, t: "No recent activity", m: "" }];
  }
}