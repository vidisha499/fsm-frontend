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

  selectedRangeId?: number | string;
  selectedSectionId?: number | string;
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
    console.log("📍 [GEOFENCES] ionViewWillEnter called");
    this.loading = true;
    try {
      this.apiToken = localStorage.getItem('api_token') || "";
      const roleStr = localStorage.getItem('user_role');
      this.userRole = roleStr ? parseInt(roleStr, 10) : 0;
      
      // Get Actual Company ID
      const companyId = this.dataService.getUserCompanyId();
      console.log("📍 [GEOFENCES] User Role:", this.userRole, "Company ID:", companyId, "Token Exists:", !!this.apiToken);

      this.loadYears();
      this.loadLayers();
      
      // Initial Load: Use Company ID instead of hardcoded '0'
      this.loadRanges(companyId || '0');

      this.fetchBeatBoundaries();
      
    } catch (e) {
      console.error("📍 [GEOFENCES] Failed to init", e);
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
    console.log("📍 [GEOFENCES] loadLayers called with:", { level, id });
    this.dataService.getLayers(level, id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        console.log("📍 [GEOFENCES] Layers Response:", data);
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
          console.warn("📍 [GEOFENCES] No layers found, using fallbacks");
          this.layers = [
            { key: 'administrative_boundaries', label: 'Administrative Boundaries', color: '#e6c100', visible: true, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#e6c100', 0.1) },
            { key: 'drainage', label: 'Drainage', color: '#3b82f6', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#3b82f6', 0.1) },
            { key: 'roads', label: 'Roads', color: '#ef4444', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#ef4444', 0.1) },
          ];
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("📍 [GEOFENCES] Layers Error:", err);
        this.layers = [
          { key: 'administrative_boundaries', label: 'Administrative Boundaries', color: '#e6c100', visible: true, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#e6c100', 0.1) },
          { key: 'drainage', label: 'Drainage', color: '#3b82f6', visible: false, overlays: [], icon: 'layers-outline', lightColor: this.hexToRgba('#3b82f6', 0.1) },
        ];
        this.cd.detectChanges();
      }
    });
  }

  loadYears() {
    console.log("📍 [GEOFENCES] loadYears called");
    this.dataService.getYears().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        console.log("📍 [GEOFENCES] Years Response:", data);
        const allOption = { id: 'all', name: 'All' };
        if (Array.isArray(data) && data.length > 0) {
          this.availableYears = [allOption, ...data.map((y: any) => ({
            id: y.year || y.id || String(y),
            name: y.year || y.name || String(y)
          }))];
        } else {
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
      error: (err) => {
        console.error("📍 [GEOFENCES] Years Error:", err);
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

  loadRanges(targetCompanyId: string = '0') {
    console.log("📍 [GEOFENCES] loadRanges called using getRanges API");
    this.dataService.getRanges().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        console.log("📍 [GEOFENCES] Ranges Response from getRanges:", data);

        this.ranges = data.map((r: any) => ({
          id: r.id || r.fid || r.range_id || r.ID || r.name, 
          name: r.name || r.range_name || r.Name || 'Unnamed Range',
          level: 'range'
        }));

        if (this.ranges.length === 0) {
          this.ranges = [{ id: 'none', name: 'No Data Found', level: 'none' }];
        }
        
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("📍 [GEOFENCES] Ranges Error:", err);
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

    const selectedRange = this.ranges.find(r => r.id === this.selectedRangeId);
    const levelToFetch = selectedRange?.level || 'range';

    console.log(`📍 [GEOFENCES] onRangeChange: Selected ID ${this.selectedRangeId} has level ${levelToFetch}`);

    // If the selected item is already a BEAT, we don't need to fetch sections
    if (levelToFetch === 'beat') {
      this.selectedBeatId = this.selectedRangeId;
      console.log("📍 [GEOFENCES] Item is already a beat. Skipping section fetch.");
      this.cd.detectChanges();
      return;
    }

    this.dataService.getBoundaryData(levelToFetch, this.selectedRangeId, 'all').subscribe({
      next: (res: any) => {
        const rawData = res?.data || res || {};
        const children = Array.isArray(rawData) ? rawData : (rawData.children || []);

        this.sections = children.map((s: any) => ({
          id: s.id || s.fid || s.section_id || s.ID,
          name: s.name || s.section_name || s.Name || 'Unnamed Section',
          level: s.level || 'section'
        }));
        
        if (this.sections.length === 0) {
          this.sections = [{ id: 'none', name: 'No Data Found', level: 'none' }];
          this.onSectionChange(); 
        }
        this.cd.detectChanges();
      },
      error: (err) => { 
        console.error("📍 [GEOFENCES] Section Error:", err);
        this.sections = []; 
        this.cd.detectChanges(); 
      }
    });
  }

  onSectionChange() {
    this.selectedBeatId = undefined;
    this.beats = [];

    const selectedSection = this.sections.find(s => s.id === this.selectedSectionId);
    const parentLevel = selectedSection ? (selectedSection.level || 'section') : 'range';
    const parentId = this.selectedSectionId || this.selectedRangeId;
    
    if (!parentId) return;

    console.log(`📍 [GEOFENCES] onSectionChange: Fetching beats for ${parentLevel} ID ${parentId}`);

    this.dataService.getBoundaryData(parentLevel, parentId, 'all').subscribe({
      next: (res: any) => {
        const rawData = res?.data || res || {};
        const children = Array.isArray(rawData) ? rawData : (rawData.children || []);
        const allOption = { id: 'all', name: 'All', level: 'beat' }; 
        
        if (children.length > 0) {
          this.beats = [allOption, ...children.map((b: any) => ({
            ...b,
            id: b.id || b.fid || b.beat_id || b.ID,
            name: b.name || b.beat_name || b.Name || 'Unnamed Beat',
            level: b.level || 'beat'
          }))];
          this.selectedBeatId = 'all';
          this.drawBoundary('beat', 'all');
        } else {
          this.beats = [allOption, { id: 'none', name: 'No Data Found', level: 'none' }];
          this.selectedBeatId = 'all';
        }
        this.cd.detectChanges();
      },
      error: (err) => { 
        console.error("📍 [GEOFENCES] Beat Error:", err);
        this.beats = []; 
        this.cd.detectChanges(); 
      }
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
    // Sir's Postman defaults: level='company', id='0', year='all'
    let level = this.selectedBeatId && this.selectedBeatId !== 'all' ? 'beat' : 
                (this.selectedSectionId && this.selectedSectionId !== 'none' ? 'section' : 
                (this.selectedRangeId && this.selectedRangeId !== 'none' ? 'range' : 'company'));
    
    let id: any = (level === 'beat') ? this.selectedBeatId :
                  (level === 'section' ? this.selectedSectionId :
                  (level === 'range' ? this.selectedRangeId : '0'));

    const year = this.selectedYear || 'all';

    console.log("📍 [GEOFENCES] Apply Filters called with:", { level, id, year });
    this.loading = true;
    
    // 1. Fetch Boundary GeoJSON Data using Sir's params
    this.dataService.getBoundaryData(level, id, year).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        console.log("📍 [GEOFENCES] Boundary Data Response:", data);
        this.processMapData(data, level);
        this.loading = false;
        this.showFilters = false; 
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("📍 [GEOFENCES] Failed to fetch boundary data", err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });

    // 2. Refresh Layers based on selection
    this.loadLayers(level, id);
  }

  private processMapData(data: any, level: string) {
    if (!this.map) return;
    console.log(`📍 [GEOFENCES] processMapData starting for level: ${level}`);
    this.clearAll();

    const bounds = L.latLngBounds([]);
    const drawSinglePolygon = (coords: any[], name: string, entityLevel: string) => {
      if (!coords || coords.length === 0) return;
      try {
        const processed = this.formatCoordinates(coords);
        
        if (processed.length === 0) {
          console.warn(`📍 [GEOFENCES] No valid points for ${name} after formatting.`);
          return;
        }

        console.log(`📍 [GEOFENCES] Drawing ${name} with ${processed.length} points`);
        
        const polygon = L.polygon(processed, {
          color: this.getLevelColor(entityLevel),
          fillColor: this.getLevelColor(entityLevel),
          fillOpacity: 0.2,
          weight: 2
        }).addTo(this.layerGroup);
        
        polygon.bindTooltip(name || 'Area', { permanent: false });
        bounds.extend(polygon.getBounds());
      } catch (e) {
        console.error("📍 [GEOFENCES] Error drawing part:", name, e);
      }
    };

    const processEntity = (entity: any) => {
      const entityName = entity.name || 'Area';
      const entityLevel = entity.level || level;
      
      console.log(`📍 [GEOFENCES] Processing: ${entityName}`);

      let rawCoords = entity.coordinates || entity.boundary_coordinates || (entity.geometry ? entity.geometry.coordinates : null);
      
      if (!rawCoords) {
        console.warn(`📍 [GEOFENCES] No coordinates found for ${entityName}`);
        return;
      }

      // 1. If it's a string, parse it
      if (typeof rawCoords === 'string') {
        const parts = rawCoords.split(" | ");
        parts.forEach((part: string) => {
          const allPoints: L.LatLngTuple[] = [];
          const matches = part.match(/-?\d+\.?\d*/g);
          if (matches && matches.length >= 2) {
            const step = (part.includes(',') && part.split(',').length > 5) ? 3 : 2;
            for (let i = 0; i < matches.length; i += step) {
              if (i + 1 < matches.length) {
                const lng = parseFloat(matches[i]);
                const lat = parseFloat(matches[i+1]);
                if (!isNaN(lat) && !isNaN(lng)) allPoints.push([lat, lng]);
              }
            }
          }
          if (allPoints.length > 0) drawSinglePolygon(allPoints, entityName, entityLevel);
        });
      }
      // 2. If it's an array, handle nesting
      else if (Array.isArray(rawCoords)) {
        // If it's a 3D array [[[lng,lat],...]], unwrap it
        if (Array.isArray(rawCoords[0]) && Array.isArray(rawCoords[0][0])) {
          rawCoords.forEach(inner => drawSinglePolygon(inner, entityName, entityLevel));
        } else {
          drawSinglePolygon(rawCoords, entityName, entityLevel);
        }
      }
    };

    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.children && data.children.length > 0) {
      items = data.children;
    } else if (data.features && data.features.length > 0) {
      items = data.features;
    } else if (data && typeof data === 'object') {
      items = [data];
    }

    console.log(`📍 [GEOFENCES] Found ${items.length} items to process.`);
    items.forEach((item: any) => processEntity(item));

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private getLevelColor(level: string): string {
    switch(level?.toLowerCase()) {
      case 'company': return '#e6c100';
      case 'range': return '#3b82f6';
      case 'section': return '#f97316';
      case 'beat': return '#10b981';
      default: return '#3b82f6';
    }
  }

  private formatCoordinates(coords: any[]): L.LatLngTuple[] {
    if (!Array.isArray(coords)) return [];
    
    return coords.map((c: any): L.LatLngTuple | null => {
      let lat: number, lng: number;

      if (Array.isArray(c)) {
        // [lng, lat] format usually has lng > 60 for India
        if (c[0] > 60) {
          lng = Number(c[0]);
          lat = Number(c[1]);
        } else {
          lat = Number(c[0]);
          lng = Number(c[1]);
        }
      } else {
        lat = Number(c.lat || c.latitude || 0);
        lng = Number(c.lng || c.longitude || 0);
      }

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
      return [lat, lng] as L.LatLngTuple;
    }).filter((c): c is L.LatLngTuple => c !== null);
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
