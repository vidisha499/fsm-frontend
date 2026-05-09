import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DataService } from '../../data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-geofences',
  templateUrl: './geofences.page.html',
  styleUrls: ['./geofences.page.scss'],
  standalone: false
})
export class GeofencesPage implements OnInit, OnDestroy {
  public map: any;
  public userMarker: any;
  mapType: string = "satellite";

  showFilters = true;
  isPanelOpen = false;

  ranges: any[] = [];
  sections: any[] = [];
  beats: any[] = [];

  selectedRangeId?: number;
  selectedSectionId?: number;
  selectedBeatId?: number | string;

  loading = false;
  apiToken: string = "";
  userRole: number = 0;

  availableYears: any[] = [];
  selectedYear: string = "all";

  layers: any[] = [];
  boundaryOverlays: any[] = [];
  private langSub?: Subscription;
  private currentBoundary?: { level: string; id: any };
  private layerGroup = L.layerGroup();

  constructor(
    private cd: ChangeDetectorRef,
    public translate: TranslateService,
    private navCtrl: NavController,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.refreshTranslations();
    });
  }

  ngAfterViewInit() {
    this.initLeafletMap();
  }

  ngOnDestroy() {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private refreshTranslations() {
    if (this.userRole === 2 && this.beats.length > 0 && this.beats[0].id === "all") {
      this.beats[0].name = this.translate.instant("COMMON.all");
      this.beats = [...this.beats];
    }
    if (this.currentBoundary && this.currentBoundary.id !== undefined) {
      this.drawBoundary(this.currentBoundary.level, this.currentBoundary.id);
    }
  }

  ionViewWillEnter() {
    this.loading = true;
    try {
      this.apiToken = localStorage.getItem('api_token') || "";
      const roleStr = localStorage.getItem('user_role');
      this.userRole = roleStr ? parseInt(roleStr, 10) : 0;

      this.loadYears();
      this.loadLayers();
      this.loadRanges();

      // Fetch beats from the newly integrated API
      this.fetchBeatBoundaries();
      
    } catch (e) {
      console.error("Geofences: Failed to init", e);
    } finally {
      this.loading = false;
    }
  }

  fetchBeatBoundaries() {
    this.dataService.getBeatBoundaries().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        if (Array.isArray(data)) {
          this.beats = [
            { id: "all", name: this.translate.instant("COMMON.all") || "All Beats" },
            ...data.map((beat: any) => ({
              ...beat,
              id: beat.id || beat.beat_id,
              name: beat.name || beat.beat_name
            }))
          ];
        }
        
        // Auto-select "All" beats and draw boundary if data exists
        if (this.beats.length > 0) {
          this.selectedBeatId = "all";
          this.drawBoundary("beat", "all");
        }
      },
      error: (err) => {
        console.error('Failed to fetch beat boundaries:', err);
        // Fallback to mock data if API is currently unavailable or empty
        this.beats = [
          { id: "all", name: this.translate.instant("COMMON.all") || "All" },
          { id: 1, name: 'Mock Beat 1 (API Error)' }
        ];
        this.selectedBeatId = "all";
        this.drawBoundary("beat", "all");
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  loadLayers(level?: string, id?: any) {
    // GET /layers — from HierarchicalBoundaryController@getLayers
    this.dataService.getLayers(level, id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        const layerColors = ['#e6c100', '#3b82f6', '#ef4444', '#10b981', '#f97316'];
        if (Array.isArray(data) && data.length > 0) {
          this.layers = data.map((l: any, idx: number) => ({
            ...l,
            key: l.key || l.id || `layer_${idx}`,
            label: l.label || l.name || `Layer ${idx + 1}`,
            color: l.color || layerColors[idx % layerColors.length],
            visible: l.is_visible ?? (idx === 0),
            overlays: [],
            icon: 'layers-outline',
            lightColor: this.hexToRgba(l.color || layerColors[idx % layerColors.length], 0.1),
          }));
        } else {
          // Fallback with sensible defaults
          this.layers = [
            { key: 'administrative_boundaries', label: 'Administrative Boundaries', color: '#e6c100', visible: true, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#e6c100', 0.1) },
            { key: 'drainage', label: 'Drainage', color: '#3b82f6', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#3b82f6', 0.1) },
            { key: 'roads', label: 'Roads', color: '#ef4444', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#ef4444', 0.1) },
          ];
        }
        this.cd.detectChanges();
      },
      error: () => {
        this.layers = [
          { key: 'administrative_boundaries', label: 'Administrative Boundaries', color: '#e6c100', visible: true, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#e6c100', 0.1) },
          { key: 'drainage', label: 'Drainage', color: '#3b82f6', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#3b82f6', 0.1) },
        ];
        this.cd.detectChanges();
      }
    });
  }

  loadYears() {
    // GET /years — from HierarchicalBoundaryController@getYears
    this.dataService.getYears().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        const allOption = { id: 'all', name: this.translate.instant('COMMON.all') || 'All' };
        if (Array.isArray(data) && data.length > 0) {
          this.availableYears = [allOption, ...data.map((y: any) => ({
            id: y.year || y.id || String(y),
            name: y.year || y.name || String(y)
          }))];
        } else {
          // Fallback: last 3 years
          const currentYear = new Date().getFullYear();
          this.availableYears = [allOption,
            { id: String(currentYear), name: String(currentYear) },
            { id: String(currentYear - 1), name: String(currentYear - 1) },
            { id: String(currentYear - 2), name: String(currentYear - 2) }
          ];
        }
        if (!this.selectedYear) this.selectedYear = 'all';
        this.cd.detectChanges();
      },
      error: () => {
        const currentYear = new Date().getFullYear();
        this.availableYears = [
          { id: 'all', name: 'All' },
          { id: String(currentYear), name: String(currentYear) },
          { id: String(currentYear - 1), name: String(currentYear - 1) }
        ];
        if (!this.selectedYear) this.selectedYear = 'all';
        this.cd.detectChanges();
      }
    });
  }

  onYearChange() {
    this.clearAll();
    this.loadLayers();
    if (this.currentBoundary) {
      this.drawBoundary(this.currentBoundary.level, this.currentBoundary.id);
    }
  }

  hexToRgba(hex: string, opacity: number) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  initLeafletMap() {
    setTimeout(() => {
        const mapEl = document.getElementById("boundary-map");
        if (!mapEl) return;
        
        if ((mapEl as any)._leaflet_id) {
          (mapEl as any)._leaflet_id = null;
        }

        this.map = L.map('boundary-map', {
          center: [21.84, 84.03],
          zoom: 12,
          zoomControl: true,
          attributionControl: false
        });

        // Add Google Satellite Tiles
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains:['mt0','mt1','mt2','mt3']
        }).addTo(this.map);
        
        this.layerGroup.addTo(this.map);

        this.map.on("click", () => this.closeLayerPanel());

        setTimeout(() => {
          this.map.invalidateSize();
        }, 300);
    }, 100);
  }

  async showMyLocation(forcePan = false) {
    console.log('Fetching location (mock)...');
    if (this.map) {
      this.map.setView([21.84, 84.03], 14);
    }
  }

  toggleMapType() {
    const types = ["roadmap", "satellite", "hybrid", "terrain"];
    const idx = types.indexOf(this.mapType);
    this.mapType = types[(idx + 1) % types.length];
    
    if (!this.map) return;

    // Quick swap of layer
    this.map.eachLayer((layer: any) => {
       if(layer instanceof L.TileLayer) {
           this.map.removeLayer(layer);
       }
    });

    let url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // hybrid
    if (this.mapType === 'roadmap') {
       url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    } else if (this.mapType === 'terrain') {
       url = 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
    } else if (this.mapType === 'satellite') {
       url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    }

    L.tileLayer(url, { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'] }).addTo(this.map);
  }

  loadRanges() {
    this.dataService.getBeatBoundaries(3).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        this.ranges = Array.isArray(data) ? data.map((r: any) => ({
          id: r.id || r.range_id || r.ID,
          name: r.name || r.range_name || r.Name || 'Unnamed Range'
        })) : [];
        this.cd.detectChanges();
      },
      error: () => {
        this.ranges = [];
        this.cd.detectChanges();
      }
    });
  }

  onRangeChange() {
    this.selectedSectionId = undefined;
    this.selectedBeatId = undefined;
    this.sections = [];
    this.beats = [];

    if (!this.selectedRangeId) { this.cd.detectChanges(); return; }

    this.dataService.getBeatBoundaries(4, this.selectedRangeId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        this.sections = Array.isArray(data) ? data.map((s: any) => ({
          id: s.id || s.section_id || s.ID,
          name: s.name || s.section_name || s.Name || 'Unnamed Section'
        })) : [];
        
        // If no sections found, maybe range has beats directly? 
        // This handles Range -> Beat hierarchy
        if (this.sections.length === 0) {
           this.onSectionChange(); // Try fetching beats directly
        }
        this.cd.detectChanges();
      },
      error: () => { this.sections = []; this.cd.detectChanges(); }
    });
  }

  onSectionChange() {
    this.selectedBeatId = undefined;
    this.beats = [];

    // Level 5 is Beats. If Level 4 was empty, we use RangeId as parent to check direct beats.
    const parentId = this.selectedSectionId || this.selectedRangeId;
    if (!parentId) return;

    this.dataService.getBeatBoundaries(5, parentId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        const allOption = { id: 'all', name: 'All' }; // Plain text fallback
        
        if (Array.isArray(data) && data.length > 0) {
          this.beats = [allOption, ...data.map((b: any) => ({
            ...b,
            id: b.id || b.beat_id || b.ID,
            name: b.name || b.beat_name || b.Name || 'Unnamed Beat'
          }))];
          this.selectedBeatId = 'all';
          this.drawBoundary('beat', 'all');
        } else {
          this.beats = [allOption];
          this.selectedBeatId = 'all';
        }
        this.cd.detectChanges();
      },
      error: () => { this.beats = []; this.cd.detectChanges(); }
    });
  }

  onBeatChange() {
    if (this.selectedBeatId) {
      this.drawBoundary('beat', this.selectedBeatId as any);
    }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
    this.cd.detectChanges();
  }

  applyFilters() {
    let level = 'all';
    let id: any = 'all';

    if (this.selectedBeatId && this.selectedBeatId !== 'all') {
      level = 'beat';
      id = this.selectedBeatId;
    } else if (this.selectedSectionId) {
      level = 'section';
      id = this.selectedSectionId;
    } else if (this.selectedRangeId) {
      level = 'range';
      id = this.selectedRangeId;
    }

    this.loading = true;
    
    // 1. Fetch Boundary GeoJSON Data
    this.dataService.getBoundaryData(level, id, this.selectedYear).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        // Handle drawing logic here (similar to drawBoundary but with API results)
        this.processMapData(data, level);
        this.loading = false;
        this.showFilters = false; // Hide card after applying
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("Failed to fetch boundary data", err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });

    // 2. Refresh Layers based on selection
    this.loadLayers(level, id);
  }

  private processMapData(data: any, level: string) {
    if (!this.map) return;
    this.clearAll();

    const items = Array.isArray(data) ? data : (data.features || [data]);
    const bounds = L.latLngBounds([]);

    items.forEach((item: any) => {
      let coords = item.boundary_coordinates || item.geometry?.coordinates || item.coordinates;
      if (!coords) return;

      try {
        if (typeof coords === 'string') coords = JSON.parse(coords);
        
        // Handle GeoJSON format or custom [lat,lng] array
        let latlngs: any;
        if (item.type === 'Feature') {
          latlngs = L.geoJSON(item).getBounds();
          L.geoJSON(item, {
            style: { color: '#e6c100', weight: 2, fillOpacity: 0.2 }
          }).addTo(this.layerGroup);
          bounds.extend(latlngs);
        } else {
          // Traditional coordinates array processing
          const processedCoords = this.formatCoordinates(coords);
          if (processedCoords.length > 0) {
            const polygon = L.polygon(processedCoords, {
              color: '#e6c100', weight: 2, fillOpacity: 0.2
            }).addTo(this.layerGroup);
            polygon.bindTooltip(item.name || 'Area', { permanent: false });
            bounds.extend(polygon.getBounds());
          }
        }
      } catch (e) {
        console.warn("Failed to process coordinates for item", item, e);
      }
    });

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private formatCoordinates(coords: any): L.LatLngTuple[] {
    if (!Array.isArray(coords)) return [];
    if (coords.length === 0) return [];

    return coords.map((c: any): L.LatLngTuple => {
      if (Array.isArray(c) && c.length >= 2) {
        if (c[0] > 60) return [Number(c[1]), Number(c[0])] as L.LatLngTuple;
        return [Number(c[0]), Number(c[1])] as L.LatLngTuple;
      } else if (c && typeof c === 'object') {
        const lat = c.lat || c.latitude || 0;
        const lng = c.lng || c.longitude || 0;
        return [Number(lat), Number(lng)] as L.LatLngTuple;
      }
      return [0, 0] as L.LatLngTuple;
    }).filter(c => c[0] !== 0);
  }

  resetFilters() {
    this.selectedRangeId = undefined;
    this.selectedSectionId = undefined;
    this.selectedBeatId = "all";
    this.selectedYear = "all";
    this.sections = [];
    this.clearAll();

    this.drawBoundary("beat", "all");
    this.cd.detectChanges();
  }

  togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
  }

  private closeLayerPanel() {
    if (this.isPanelOpen) {
      this.isPanelOpen = false;
      this.cd.detectChanges();
    }
  }

  toggleLayer(layer: any) {
    layer.visible = !layer.visible;
  }

  private drawBoundary(level: string, id: any) {
    this.currentBoundary = { level, id };
    
    if (this.map) {
        this.clearAll();
        
        let targetBeats = this.beats;
        if (id !== 'all') {
          targetBeats = this.beats.filter(b => b.id == id);
        }

        const bounds = L.latLngBounds([]);

        targetBeats.forEach(beat => {
            if (!beat.boundary_coordinates) return;
            try {
                // Determine format of boundary_coordinates
                let coordinates = beat.boundary_coordinates;
                if (typeof coordinates === 'string') {
                    coordinates = JSON.parse(coordinates);
                }
                
                // Usually coordinates are an array of [lat, lng] or {lat, lng}
                let latlngs: L.LatLngTuple[] = [];
                if (Array.isArray(coordinates)) {
                    if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
                        // Assuming [lng, lat] from GeoJSON or [lat, lng]
                        // Try to auto-detect if the first value is lng (typically > 30 for India, lat is < 40)
                        latlngs = coordinates.map(c => {
                          if (c[0] > 60) return [c[1], c[0]] as L.LatLngTuple; // It's [lng, lat]
                          return [c[0], c[1]] as L.LatLngTuple; // It's [lat, lng]
                        });
                    } else if (coordinates.length > 0 && typeof coordinates[0] === 'object') {
                        // Assuming {lat: X, lng: Y}
                        latlngs = coordinates.map(c => [c.lat || c.latitude, c.lng || c.longitude] as L.LatLngTuple);
                    }
                }
                
                if (latlngs.length > 0) {
                    const polygon = L.polygon(latlngs, {
                        color: '#e6c100', 
                        fillColor: '#e6c100', 
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(this.layerGroup);
                    
                    // Add label
                    polygon.bindTooltip(beat.name, { permanent: false, direction: 'center' });
                    
                    bounds.extend(polygon.getBounds());
                }
            } catch (e) {
                console.error("Failed to parse beat coordinates for:", beat.name, e);
            }
        });

        // Use mock polygon if no real coordinates found to at least show something
        if (bounds.isValid()) {
            this.map.fitBounds(bounds);
        } else if (level === 'beat' && id === 'all') {
            // Draw dummy polygon for testing if bounds are empty
            const dummyLatLngs: L.LatLngTuple[] = [
                [21.84, 84.03], [21.85, 84.04], [21.85, 84.02]
            ];
            const polygon = L.polygon(dummyLatLngs, {color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.2}).addTo(this.layerGroup);
            this.map.fitBounds(polygon.getBounds());
        }
    }
  }

  private clearAll() {
    this.layerGroup.clearLayers();
    this.boundaryOverlays = [];
    this.layers.forEach((l) => {
      l.overlays = [];
    });
  }

  locateBoundary() {
    // Zoom to bounds logic placeholder
  }
}
