import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-forest-events',
  templateUrl: './forest-events.page.html',
  styleUrls: ['./forest-events.page.scss'],
  standalone: false
})
export class ForestEventsPage {
  constructor(private navCtrl: NavController) {}

  goBack() {
    const role = localStorage.getItem('user_role');
    if (role === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}