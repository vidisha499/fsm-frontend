import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, MenuController, IonModal, LoadingController, ToastController } from '@ionic/angular';
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
  @ViewChild(IonModal) modal!: IonModal;

  allAssets: any[] = []; // Database se aaya hua pura data
  assets: any[] = [];    // Filtered data jo screen par dikhega
  isModalOpen = false;
  companyId: any;

  filters = {
    category: 'all',
    fromDate:  new Date().toISOString() , // Last 30 days default
    toDate: new Date().toISOString()
  };

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.getCompanyInfo();
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
  const loading = await this.loadingCtrl.create({
    message: 'Fetching your assets...',
    spinner: 'crescent'
  });
  await loading.present();

  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const userId = userData.id; // User ki apni ID
  const companyId = userData.company_id;

  // DataService mein hum userId bhi bhejenge
  this.dataService.getMyAssets(companyId, userId).subscribe({
    next: (data: any) => {
      this.allAssets = data;
      this.assets = [...this.allAssets];
      loading.dismiss();
    },
    error: (err) => {
      loading.dismiss();
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
      const matchesCategory = this.filters.category === 'all' || item.category === this.filters.category;
      
      return matchesDate && matchesCategory;
    });

    this.isModalOpen = false;
  }

  resetFilters() {
    this.filters = {
      category: 'all',
      fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
      toDate: new Date().toISOString()
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

  goBack() { this.navCtrl.navigateBack('/home'); }

  // Refresh karne ke liye (Pull to refresh ke liye bhi use kar sakte ho)
  doRefresh(event: any) {
    this.loadAssets().then(() => {
      event.target.complete();
    });
  }

  // --- 1. GENERATE PDF ---
  exportToPDF() {
    const doc = new jsPDF();
    const tableColumn = ["Name", "Category", "Condition", "Year", "Date"];
    const tableRows: any[] = [];

    this.assets.forEach(asset => {
      const assetData = [
        asset.name,
        asset.category,
        asset.condition_status || asset.condition,
        asset.year,
        new Date(asset.created_at || asset.date).toLocaleDateString()
      ];
      tableRows.push(assetData);
    });

    // Styling the PDF
    doc.text("PugArch Assets Report", 14, 15);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`Assets_Report_${new Date().getTime()}.pdf`);
  }

  // --- 2. GENERATE EXCEL ---
  exportToExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.assets);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');

    /* save to file */
    XLSX.writeFile(wb, `Assets_Data_${new Date().getTime()}.xlsx`);
  }

}