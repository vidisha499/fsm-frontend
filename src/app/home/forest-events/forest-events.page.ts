

import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-forest-events',
  templateUrl: './forest-events.page.html',
  styleUrls: ['./forest-events.page.scss'],
  standalone: false
})
export class ForestEventsPage {
  constructor(private navCtrl: NavController , private route: ActivatedRoute) {}

 
//   openEventsFields(title: string) {
//   // Purana tarika: ['/events-fields', { title: title }]
//   // Naya tarika:
//   this.navCtrl.navigateForward(['/events-fields', title]); 
// }

// forest-events.page.ts mein
openEventsFields(title: string, category: string) {
  // Isse URL banega: /events-fields/Illegal%20Mining/Criminal%20Activity
  this.navCtrl.navigateForward(['/events-fields', title, category]); 
}

// Jab Criminal Activity wale section ke icon par click ho
  openCriminalFields(title: string) {
    this.navCtrl.navigateForward(['/events-fields', { 
      title: title, 
      category: 'Criminal Activity' 
    }]);
  }

  // Jab Events wale section ke icon par click ho
  openEventFields(title: string) {
    this.navCtrl.navigateForward(['/events-fields', { 
      title: title, 
      category: 'Events' 
    }]);
  }

  goBack() {
    const role = localStorage.getItem('user_role');
    if (role === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}