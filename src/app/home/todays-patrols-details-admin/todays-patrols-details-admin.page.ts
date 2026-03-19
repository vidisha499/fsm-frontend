import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-todays-patrols-details-admin',
  templateUrl: './todays-patrols-details-admin.page.html',
  styleUrls: ['./todays-patrols-details-admin.page.scss'],
  standalone: false
})
export class TodaysPatrolsDetailsAdminPage implements OnInit {
  patrolId: string | null = null;
  patrolData: any = null;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.patrolId = this.route.snapshot.paramMap.get('id');
    if (this.patrolId) {
      this.loadPatrolDetails();
    }
  }

  loadPatrolDetails() {

  this.isLoading = true;
  this.dataService.getPatrolById(Number(this.patrolId)).subscribe({
    next: (data: any) => {
      // If the API returns an array, take the first element
      this.patrolData = Array.isArray(data) ? data[0] : data;
      this.isLoading = false;
      console.log('Final Patrol Data assigned to UI:', this.patrolData);
    },
    error: (err) => {
      console.error('Error fetching details:', err);
      this.isLoading = false;
    }
  });
}

  calculateDuration(start: string, end: string) {
    if (!start || !end) return 'Active';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const mins = Math.floor((e - s) / 60000);
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }

  goBack() {
    this.navCtrl.back();
  }
}