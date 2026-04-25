import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, MenuController, IonModal, LoadingController, ToastController, AlertController } from '@ionic/angular';
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
  isLoading = true;      // ✅ Loader state
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
      this.allAssets = list;
      this.assets = [...this.allAssets];
      this.isLoading = false; // ✅ Hide loader
    },
    error: (err) => {
      this.isLoading = false; // ✅ Hide loader on error
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


  // --- 1. SERVER-SIDE REPORTING ---
  async exportReport(format: 'pdf' | 'excel') {
    const loading = await this.loadingCtrl.create({ message: `Generating ${format.toUpperCase()}...` });
    await loading.present();

    const payload = {
      company_id: this.companyId,
      format: format,
      category: this.filters.category,
      from: this.filters.fromDate.split('T')[0],
      to: this.filters.toDate.split('T')[0]
    };

    this.dataService.downloadAssetReport(payload).subscribe({
      next: (response: any) => {
        const contentType = response.headers.get('content-type');

        // Check for JSON error (same as Reports page)
        if (contentType && contentType.includes('application/json')) {
          const reader = new FileReader();
          reader.onload = () => {
             try {
                const resObj = JSON.parse(reader.result as string);
                if (resObj.status === 'SUCCESS' && resObj.fileurl) {
                  window.open(resObj.fileurl, '_blank');
                } else {
                  this.presentToast('Server Error: ' + (resObj.message || 'Error generating report'));
                }
             } catch (e) {
                this.presentToast('Invalid server response');
             }
          };
          reader.readAsText(response.body);
          loading.dismiss();
          return;
        }

        // Handle direct blob
        const blob = new Blob([response.body], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Asset_Report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        loading.dismiss();
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast('Error downloading report');
      }
    });
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