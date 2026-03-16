import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-todays-patrols-admin',
  templateUrl: './todays-patrols-admin.page.html',
  styleUrls: ['./todays-patrols-admin.page.scss'],
  standalone: false
})
export class TodaysPatrolsAdminPage implements OnInit {
  activeTab: string = 'active';
  isModalOpen: boolean = false; 
 
  
  patrolLogs = [
    { rangerName: 'Ishika', rangerId: 'RN-992', area: 'Sector A', startTime: '08:00 AM', distance: '4.2', progress: 75, status: 'Active' },
    { rangerName: 'Rahul V.', rangerId: 'RN-402', area: 'East Ridge', startTime: '07:30 AM', distance: '6.0', progress: 100, status: 'Completed' },
    { rangerName: 'Amit Shah', rangerId: 'RN-112', area: 'Buffer Zone', startTime: '09:15 AM', distance: '1.5', progress: 30, status: 'Active' },
  ];

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }
}