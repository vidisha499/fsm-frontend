import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone:false
})
export class UsersPage implements OnInit {

  constructor(
    private navCtrl: NavController,
    private router: Router
  ) { }

  ngOnInit() {
  }

  goBack() {
    this.navCtrl.back();
  }

  openUserCategory(category: string) {
    // Navigate to the newly created user-list page under users module
    this.router.navigate(['users/user-list'], { 
      queryParams: { category: category } 
    });
  }

}
