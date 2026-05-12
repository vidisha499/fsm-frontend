import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController } from '@ionic/angular';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-plantations',
  templateUrl: './plantations.page.html',
  styleUrls: ['./plantations.page.scss'],
  standalone: false
})
export class PlantationsPage implements OnInit {
  searchQuery: string = '';
  plantations: any[] = [];
  filteredPlantations: any[] = [];

  loading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.loadPlantations();
  }

  ionViewWillEnter() {
    this.loadPlantations();
  }

  goBack() {
    this.navCtrl.back();
  }

  async loadPlantations() {
    this.loading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Loading plantations...',
      duration: 5000
    });
    await loader.present();

    this.dataService.getPlantations().subscribe({
      next: (res: any) => {
        this.plantations = res?.data || [];
        this.filteredPlantations = [...this.plantations];
        this.loading = false;
        loader.dismiss();
      },
      error: (err) => {
        console.error("Error loading plantations", err);
        this.loading = false;
        loader.dismiss();
      }
    });
  }

  onSearch(event: any) {
    const query = (event.target.value || '').toLowerCase();
    this.filteredPlantations = this.plantations.filter(p => 
      (p.siteName || '').toLowerCase().includes(query) || 
      (p.soilType || '').toLowerCase().includes(query)
    );
  }

  async refreshData(event?: any) {
    await this.loadPlantations();
    if (event) {
      event.target.complete();
    }
  }

  addPlantation() {
    this.navCtrl.navigateForward('/add-plantation');
  }

  viewPlantation(id: any) {
    this.navCtrl.navigateForward(`/plantation-detail/${id}`);
  }
}
