import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-sightings-details',
  templateUrl: './sightings-details.page.html',
  styleUrls: ['./sightings-details.page.scss'],
  standalone: false
})
export class SightingsDetailsPage implements OnInit {
  sighting: any = null;

  constructor(
    private router: Router,
    private navCtrl: NavController
  ) {
    // Initial check for data
    this.extractData();
  }

  ngOnInit() {}

  // Ionic lifecycle hook that runs every time the page is viewed
  ionViewWillEnter() {
    this.extractData();
  }

  private extractData() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['data']) {
      this.sighting = navigation.extras.state['data'];
      console.log('Dynamic Sighting Loaded:', this.sighting.category);
    } else if (!this.sighting) {
      // Fallback if state is lost on refresh
      this.goBack();
    }
  }

  getIcon(category: string): string {
    if (!category) return 'fa-circle-plus';
    
    const cat = category.toLowerCase();
    const icons: { [key: string]: string } = {
      animal: 'fa-paw',
      water: 'fa-droplet',
      impact: 'fa-person-hiking',
      death: 'fa-skull',
      felling: 'fa-hammer',
      other: 'fa-circle-plus'
    };
    return icons[cat] || 'fa-circle-plus';
  }

  goBack() {
    // Using back() provides a smoother native transition
    this.navCtrl.back();
  }
}