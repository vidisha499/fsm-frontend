import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-events-triggered-admin',
  templateUrl: './events-triggered-admin.page.html',
  styleUrls: ['./events-triggered-admin.page.scss'],
  standalone: false
})
export class EventsTriggeredAdminPage implements OnInit {

  isModalOpen: boolean = false;
  activeTab: string = 'all';
  
  filters = {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

  eventLogs = [
    { title: 'Fence Breach Alert', category: 'SECURITY', location: 'North Sector', time: '10:30 AM', level: 'Critical', icon: 'shield-outline' },
    { title: 'Routine Patrol Start', category: 'PATROL', location: 'East Gate', time: '09:45 AM', level: 'Info', icon: 'walk-outline' },
    { title: 'Temperature Warning', category: 'SENSORS', location: 'Core Forest', time: '08:15 AM', level: 'Warning', icon: 'thermometer-outline' },
    { title: 'Animal Movement', category: 'MONITORING', location: 'Zone B', time: '07:30 AM', level: 'Info', icon: 'paw-outline' },
  ];

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  applyFilters() {
    this.isModalOpen = false;
  }

  resetFilters() {
    this.isModalOpen = false;
  }
}