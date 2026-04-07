

import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { HierarchyService } from 'src/app/services/hierarchy.service';

@Component({
  selector: 'app-forest-events',
  templateUrl: './forest-events.page.html',
  styleUrls: ['./forest-events.page.scss'],
  standalone: false
})
export class ForestEventsPage {
  constructor(private navCtrl: NavController , private route: ActivatedRoute,private hierarchyService: HierarchyService) {}
  assignedBeatName: string = 'FETCHING...';

  // constructor(private navCtrl: NavController,
  //    private hierarchyService: HierarchyService
  //   ) {}

    ngOnInit() {
    this.loadBeat();
  }

  loadBeat() {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const rangerId = userData.id;

    if (rangerId) {
      this.hierarchyService.getAssignedBeat(rangerId).subscribe({
        next: (data: any) => {
          // Aapke DB screenshot ke hisaab se key 'beatName' hai
          if (data && data.beatName) {
            this.assignedBeatName = data.beatName.toUpperCase();
          } else {
            this.assignedBeatName = 'GENERAL';
          }
        },
        error: () => {
          this.assignedBeatName = 'PANNA SITE 4.2'; // Error pe fallback
        }
      });
    }
  }
 
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