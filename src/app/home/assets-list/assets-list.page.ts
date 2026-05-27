import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, MenuController, IonModal, LoadingController, ToastController, AlertController, IonContent } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-assets-list',
  templateUrl: './assets-list.page.html',
  styleUrls: ['./assets-list.page.scss'],
  standalone: false
})
export class AssetsListPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonModal) modal!: IonModal;
  
  public showScrollTop = false;

  allAssets: any[] = []; // Database se aaya hua pura data
  assets: any[] = [];    // Filtered data jo screen par dikhega
  isModalOpen = false;
  isLoading = true;      // ✅ Loader state
  companyId: any;

  filters = {
    category: 'all',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), // Last 30 days default
    toDate: new Date().toISOString(),
    condition: 'all',
    searchQuery: '',
    guardName: ''
  };

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    public dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.getCompanyInfo();
  }


  // Is function ko AssetsListPage class ke andar kahin bhi paste kar do
openAssetDetails(asset: any) {

  this.dataService.setSelectedAsset(asset);
  this.navCtrl.navigateForward('/assets-details');
}
  // 1. Session se Company ID nikalna
  getCompanyInfo() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      this.companyId = user.company_id;
      this.loadAssets(); // ID milne ke baad data load karo
    } else {
      this.navCtrl.navigateRoot('/login');
    }
  }

  // 2. API se Real Data mangwana
 

  async loadAssets() {
  this.isLoading = true; // ✅ Show skeleton loader

  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const userId = userData.id; // User ki apni ID
  const companyId = userData.company_id;

  // DataService mein hum userId bhi bhejenge
  this.dataService.getMyAssets(companyId, userId).subscribe({
    next: (data: any) => {
      const list = Array.isArray(data) ? data : (data.data || []);
      this.allAssets = list.filter((item: any) => this.dataService.isRecordVisible(item.entity_id || item.site_id || item.beat_id || item.range_id));
      this.assets = [...this.allAssets];
      this.isLoading = false;
      // 🔍 DEBUG: Pehla asset ka raw structure dekho
      if (list.length > 0) {
        console.log('%c🔍 [ASSET DEBUG] Raw First Asset Keys:', 'color: orange; font-weight: bold;', Object.keys(list[0]));
        console.log('%c📦 [ASSET DEBUG] Raw First Asset Data:', 'color: orange; font-weight: bold;', list[0]);
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.presentToast('Error loading your assets');
    }
  });
}

  // 3. Filters Apply karna (Real Data par)
  applyFilters() {
    const start = new Date(this.filters.fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(this.filters.toDate);
    end.setHours(23, 59, 59, 999);

    this.assets = this.allAssets.filter(item => {
      const itemDate = new Date(item.created_at || item.date);
      const matchesDate = itemDate >= start && itemDate <= end;
      
      const matchesCategory = this.filters.category === 'all' || 
        (item.category && item.category.toLowerCase() === this.filters.category.toLowerCase());
      
      const itemCondition = item.condition || item.condition_status || '';
      const matchesCondition = this.filters.condition === 'all' || 
        (itemCondition && itemCondition.toLowerCase() === this.filters.condition.toLowerCase());

      const query = (this.filters.searchQuery || '').trim().toLowerCase();
      const matchesSearch = !query || 
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query));

      const guardQ = (this.filters.guardName || '').trim().toLowerCase();
      const matchesGuard = !guardQ ||
        (item.added_by_name || item.ranger_name || item.officer_name || item.created_by_name || item.user_name || 'Officer').toLowerCase().includes(guardQ);

      return matchesDate && matchesCategory && matchesCondition && matchesSearch && matchesGuard;
    });

    this.isModalOpen = false;
  }

  resetFilters() {
    this.filters = {
      category: 'all',
      fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
      toDate: new Date().toISOString(),
      condition: 'all',
      searchQuery: '',
      guardName: ''
    };
    this.assets = [...this.allAssets];
    this.isModalOpen = false;
  }

  // --- HELPERS ---
  async presentToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000 });
    toast.present();
  }

  openMenu() { this.menuCtrl.open(); }
  
  goToAddAsset() { this.navCtrl.navigateForward('/assets'); }

  editAsset(event: Event, asset: any) {
    event.stopPropagation();
    asset.isEditing = true;
    this.dataService.setSelectedAsset(asset);
    this.navCtrl.navigateForward('/assets');
  }

  // goBack() { this.navCtrl.navigateBack('/home'); }
  goBack() {
    const userRole = localStorage.getItem('user_role');
    if (userRole === '1' || userRole === '2') {
      this.navCtrl.navigateRoot('/admin', {
        animated: true,
        animationDirection: 'back'
      });
    } else {
      this.navCtrl.navigateRoot('/home', {
        animated: true,
        animationDirection: 'back'
      });
    }
  }
  

  // Refresh karne ke liye (Pull to refresh ke liye bhi use kar sakte ho)
  doRefresh(event: any) {
    this.loadAssets().then(() => {
      event.target.complete();
    });
  }

  handleScroll(ev: any) {
    this.showScrollTop = ev.detail.scrollTop > 500;
  }

  scrollToTop() {
    this.content.scrollToTop(600);
  }

  // --- 1. CLIENT-SIDE REPORTING ---
  async exportReport(format: 'pdf' | 'excel') {
    if (this.assets.length === 0) { this.presentToast('No data to export!'); return; }

    const loading = await this.loadingCtrl.create({ message: `Generating ${format.toUpperCase()}...` });
    await loading.present();

    try {
      const companyName = localStorage.getItem('company_name') || 'Company';
      const dateStr = new Date().toLocaleDateString('en-IN');
      const fileName = `Asset_Report_${dateStr.replace(/\//g, '-')}`;
      const catLabel  = this.filters.category === 'all' ? 'All' : this.filters.category;
      const fromLabel = this.filters.fromDate ? new Date(this.filters.fromDate).toLocaleDateString('en-IN') : '—';
      const toLabel   = this.filters.toDate   ? new Date(this.filters.toDate).toLocaleDateString('en-IN')   : '—';
      const filterLine = `Category: ${catLabel} | Date Range: ${fromLabel} to ${toLabel}`;

      // Build rows — location is stored as JSON string {"lat": x, "lng": y}
      const rows = this.assets.map((a: any) => {
        let lat = a.latitude || a.lat;
        let lng = a.longitude || a.lng;

        // Try parsing from location JSON string e.g. '{"lat": 21.14, "lng": 79.08}'
        if ((!lat || !lng) && a.location) {
          try {
            const loc = typeof a.location === 'string' ? JSON.parse(a.location) : a.location;
            lat = loc.lat || loc.latitude;
            lng = loc.lng || loc.longitude;
          } catch (e) { /* not parseable */ }
        }

        const mapUrl = (lat && lng)
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : '';
        const photoUrl = a.photo || a.image || a.photo_url || a.photo_path || '';

        return {
          name:        a.name || 'N/A',
          category:    a.category || 'N/A',
          condition:   a.condition || a.condition_status || 'N/A',
          year:        a.year || 'N/A',
          description: a.description || a.desc || '',
          addedOn:     a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : 'N/A',
          mapUrl,
          photoUrl
        };
      });

      if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Title
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text('Company Asset Report', 14, 14);

        // Subtitle
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text(filterLine, 14, 21);

        // Divider
        doc.setDrawColor(180, 180, 180); doc.line(14, 24, 283, 24);

        // Table rows (text only — links added via didDrawCell)
        const tableBody = rows.map(r => [
          r.name, r.category, r.condition, r.year, r.description, r.addedOn,
          r.mapUrl   ? 'Map'   : '',
          r.photoUrl ? 'Photo' : ''
        ]);

        autoTable(doc, {
          startY: 27,
          head: [['Name', 'Category', 'Condition', 'Year', 'Description', 'Added On', 'Location', 'Photos']],
          body: tableBody,
          headStyles: {
            fillColor: [240, 240, 240], textColor: [30, 30, 30],
            fontStyle: 'bold', fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.2
          },
          bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
          styles: { overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
          columnStyles: {
            0: { cellWidth: 35 }, 1: { cellWidth: 28 }, 2: { cellWidth: 26 },
            3: { cellWidth: 14 }, 4: { cellWidth: 68 }, 5: { cellWidth: 22 },
            6: { cellWidth: 18, textColor: [41, 128, 185] },
            7: { cellWidth: 18, textColor: [41, 128, 185] }
          },
          // ✅ Draw clickable hyperlinks in Location & Photo columns
          didDrawCell: (data: any) => {
            const col = data.column.index;
            const rowIdx = data.row.index;
            if (data.section !== 'body') return;

            const rowData = rows[rowIdx];
            if (!rowData) return;

            if (col === 6 && rowData.mapUrl) {
              // Underline "Map"
              const x = data.cell.x + 1;
              const y = data.cell.y + data.cell.height - 2.5;
              doc.setDrawColor(41, 128, 185);
              doc.line(x, y, x + 8, y);
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: rowData.mapUrl });
            }

            if (col === 7 && rowData.photoUrl) {
              // Underline "Photo"
              const x = data.cell.x + 1;
              const y = data.cell.y + data.cell.height - 2.5;
              doc.setDrawColor(41, 128, 185);
              doc.line(x, y, x + 11, y);
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: rowData.photoUrl });
            }
          },
          didDrawPage: (data: any) => {
            doc.setFontSize(7); doc.setTextColor(150, 150, 150);
            doc.text(`Generated: ${dateStr} | ${companyName}`, 14, doc.internal.pageSize.getHeight() - 8);
          }
        });

        doc.save(`${fileName}.pdf`);

      } else {
        // Excel — use HYPERLINK formula for Map & Photo columns
        const wsData: any[][] = [
          ['Company Asset Report'],
          [filterLine],
          [],
          ['Name', 'Category', 'Condition', 'Year', 'Description', 'Added On', 'Location', 'Photos'],
          ...rows.map(r => [
            r.name, r.category, r.condition, r.year, r.description, r.addedOn,
            r.mapUrl   ? { f: `HYPERLINK("${r.mapUrl}","Map")`   } : '',
            r.photoUrl ? { f: `HYPERLINK("${r.photoUrl}","Photo")` } : ''
          ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
          { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 8 },
          { wch: 50 }, { wch: 16 }, { wch: 14 }, { wch: 14 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Assets');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }

      this.presentToast(`${format.toUpperCase()} downloaded!`);
    } catch (e) {
      console.error('Export error:', e);
      this.presentToast('Failed to generate report. Try again.');
    } finally {
      loading.dismiss();
    }
  }

  // --- 2. ASSET DELETION ---
  async confirmDelete(event: Event, asset: any) {
    event.stopPropagation(); // Card click na trigger ho
    const alert = await this.alertCtrl.create({
      header: 'Delete Asset?',
      message: `Are you sure you want to delete ${asset.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          cssClass: 'delete-btn-alert',
          handler: () => { this.deleteAsset(asset.id); }
        }
      ]
    });
    await alert.present();
  }

  async deleteAsset(id: string | number) {
    const loading = await this.loadingCtrl.create({ message: 'Deleting asset...' });
    await loading.present();

    this.dataService.deleteAsset(id).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.presentToast('Asset deleted successfully');
        this.loadAssets(); // Refresh list
      },
      error: (err) => {
        loading.dismiss();
        console.error('Delete Error:', err);
        this.presentToast('Failed to delete asset');
      }
    });
  }
}