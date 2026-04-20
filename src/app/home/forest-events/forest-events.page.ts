import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { HierarchyService } from 'src/app/services/hierarchy.service';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-forest-events',
  templateUrl: './forest-events.page.html',
  styleUrls: ['./forest-events.page.scss'],
  standalone: false
})
export class ForestEventsPage {
 assignedBeatName: string = 'FETCHING...';
 

  constructor(private navCtrl: NavController , 
    private route: ActivatedRoute,
    private hierarchyService: HierarchyService,
    private loadingCtrl: LoadingController) {}
 

  //   ngOnInit() {
  //   this.loadBeat();
  // }

     ngOnInit() {
    this.loadBeat();
  }

  async doRefresh() {
    const loading = await this.loadingCtrl.create({
      message: 'Refreshing Beat Data...',
      duration: 2000,
      spinner: 'circles'
    });
    await loading.present();

    this.loadBeat();

    setTimeout(() => {
      loading.dismiss();
    }, 1000);
  }



// forest-events.page.ts mein
openEventsFields(title: string, category: string) {
  // Isse URL banega: /events-fields/Illegal%20Mining/Criminal%20Activity
  this.navCtrl.navigateForward(['/events-fields', title, category]); 
}

// Jab Criminal Activity wale section ke icon par click ho
  openCriminalFields(title: string) {
    this.navCtrl.navigateForward(['/events-fields', { 
      title: title, 
      category: 'crimes' 
    }]);
  }

  // Jab Events wale section ke icon par click ho
  openEventFields(title: string) {
    this.navCtrl.navigateForward(['/events-fields', { 
      title: title, 
      category: 'events' 
    }]);
  }

  goBack() {
    const role = localStorage.getItem('user_role');
    if (role === '1' || role === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }

  goToReports() {
    this.navCtrl.navigateForward('/events-reports');
  }

  loadBeat() {
  // 1. Check karein ki user_data mil raha hai ya nahi
  const storageData = localStorage.getItem('user_data');
  console.log('Raw Storage Data:', storageData);

  const userData = JSON.parse(storageData || '{}');
  const rangerId = userData.id;

  console.log('Extracted Ranger ID:', rangerId);

  if (rangerId) {
    this.hierarchyService.getAssignedBeat(rangerId).subscribe({
      next: (data: any) => {
        console.log('Backend Response Data:', data);

        // Aapke AssignmentEntity ke hisaab se backend 'beatName' bhejta hai
        // Hum safe side ke liye teenon variations check karenge
        if (data && (data.beatName || data.beat_name || data.beatId)) {
          this.assignedBeatName = (data.beatName || data.beat_name || 'BEAT: ' + data.beatId).toUpperCase();
        } else {
          this.assignedBeatName = 'GENERAL';
        }
      },
      error: (err) => {
        console.error('API Error details:', err);
        this.assignedBeatName = 'OFFLINE / NO BEAT';
      }
    });
  } else {
    this.assignedBeatName = 'ID NOT FOUND';
    console.error('Ranger ID is missing in localStorage');
  }
}
}