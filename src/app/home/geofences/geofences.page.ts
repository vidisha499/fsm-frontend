import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-geofences',
  templateUrl: './geofences.page.html',
  styleUrls: ['./geofences.page.scss'],
  standalone: false
})
export class GeofencesPage implements OnInit {
  public sites: any[] = [];
  public statusFilter: string = 'sites'; // 'sites' or 'geofences'
  public isLoading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private dataService: DataService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadSites();
  }

  async loadSites() {
    this.isLoading = true;
    const apiToken = localStorage.getItem('api_token') || '';

    this.dataService.getSites({ api_token: apiToken }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('Sites API Response:', res);
        
        let fetchedData = res && res.data ? res.data : res;

        if (Array.isArray(fetchedData)) {
          this.sites = fetchedData;
        } else if (fetchedData && typeof fetchedData === 'object' && !Array.isArray(fetchedData)) {
          // If it's a single object, wrap it in an array
          this.sites = [fetchedData];
        } else {
          this.sites = [];
        }
      },
      error: async (err) => {
        this.isLoading = false;
        // Silent error to prevent UI break if backend not ready
        console.error('Failed to load sites:', err);
      }
    });
  }

  goBack() {
    this.navCtrl.navigateRoot('/home');
  }
}
