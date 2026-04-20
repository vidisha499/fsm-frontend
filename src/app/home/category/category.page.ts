

import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../../services/hierarchy.service';
import { AlertController, NavController } from '@ionic/angular';


@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: false,
})
export class CategoryPage implements OnInit {
  // 1. Properties definition
  categories: any[] = [];
  companyId: number = 1; 

  constructor(
    private hierarchyService: HierarchyService,
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) {
    // Constructor mein call karenge taaki initial load par ID mil jaye
    this.syncCompanyId();
  }

  ngOnInit() {
    this.loadCategories();
  }

  /**
   * IMPORTANT: Yeh function LoginPage ke 'user_data' storage se 
   * dynamic company_id nikalta hai.
   */
  syncCompanyId() {
    const rawData = localStorage.getItem('user_data'); // Matches your LoginPage
    if (rawData) {
      const parsed = JSON.parse(rawData);
      // LoginPage mein aap 'company_id' save kar rahi hain
      this.companyId = parsed.company_id || 1;
      console.log('✅ Found Dynamic Company ID from Storage:', this.companyId);
    } else {
      // Fallback agar direct access ho
      this.companyId = parseInt(localStorage.getItem('company_id') || '1');
      console.warn('⚠️ user_data not found, using fallback company_id:', this.companyId);
    }
  }

  // Reloads data from NeonDB
  loadCategories() {
    this.hierarchyService.getHierarchy().subscribe({
      next: (data: any[]) => {
        this.categories = data;
        console.log('Data loaded from NeonDB:', this.categories);
      },
      error: (err) => {
        console.error('Check your Vercel URL or NeonDB connection:', err);
      }
    });
  }

  // Modal for adding a new hierarchy item
  async openAddModal() {
    const addAlert = await this.alertCtrl.create({
      header: 'Add New Hierarchy',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Enter Name' },
        { name: 'layerId', type: 'number', placeholder: 'Level (1-4)', min: 1, max: 4 },
        { name: 'parentId', type: 'number', placeholder: 'Parent ID' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            if (data.name && data.layerId) {
              const pId = data.parentId ? parseInt(data.parentId) : null;
              this.hierarchyService.saveCategory(data.name, parseInt(data.layerId), pId).subscribe({
                next: () => this.loadCategories(),
                error: (err) => console.error('Save failed:', err)
              });
            }
          }
        }
      ]
    });
    await addAlert.present();
  }

  async deleteItem(id: number) {
    const delAlert = await this.alertCtrl.create({
      header: 'Delete Item?',
      message: 'This will remove this item and all its children.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Everything',
          role: 'destructive',
          handler: () => {
            this.hierarchyService.deleteCategory(id).subscribe({
              next: () => this.loadCategories(),
              error: (err) => console.error('Delete failed:', err)
            });
          }
        }
      ]
    });
    await delAlert.present();
  }

  extractBeats(nodes: any[]): any[] {
    let beats: any[] = [];
    for (const node of nodes) {
      if (node.layerId === 4) beats.push(node);
      if (node.children && node.children.length > 0) {
        beats = [...beats, ...this.extractBeats(node.children)];
      }
    }
    return beats;
  }

  // --- MAIN ASSIGNMENT FLOW ---

  async openAssignmentModal() {
    // 1. Pehle ensure karein ki latest Company ID load hui hai
    this.syncCompanyId();
    
    console.log('Opening Modal for Company:', this.companyId);
    const allBeats = this.extractBeats(this.categories);
    
    if (allBeats.length === 0) {
      window.alert("No beats found! Please add a layer 4 item first.");
      return;
    }

    // 2. Dynamic Rangers fetch karein based on Admin's company
    this.hierarchyService.getRangers(this.companyId).subscribe({
      next: async (rangers: any[]) => {
        console.log(`SUCCESS: Found ${rangers.length} rangers for company ${this.companyId}`);

        if (!rangers || rangers.length === 0) {
          window.alert(`No rangers found for Company ID: ${this.companyId}`);
          return;
        }

        // STEP 1: Select Beat
        const beatAlert = await this.alertCtrl.create({
          header: 'Step 1: Select Beat',
          inputs: allBeats.map(beat => ({
            name: 'beat',
            type: 'radio',
            label: beat.name,
            value: beat,
            checked: false
          })),
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Next',
              handler: (selectedBeat) => {
                if (selectedBeat) {
                  this.openRangerSelection(selectedBeat, rangers);
                }
              }
            }
          ]
        });
        await beatAlert.present();
      },
      error: (err) => {
        console.error('API Error while fetching rangers:', err);
        window.alert(`Error ${err.status}: Server se rangers nahi mil paye.`);
      }
    });
  }

  async openRangerSelection(beat: any, rangers: any[]) {
    // STEP 2: Select Ranger from the dynamic list
    const rangerAlert = await this.alertCtrl.create({
      header: `Assigning to ${beat.name}`,
      message: 'Select a Ranger to assign',
      inputs: rangers.map(r => ({
        name: 'ranger',
        type: 'radio',
        label: r.name,
        value: { id: r.id, name: r.name },
        checked: false
      })),
      buttons: [
        { text: 'Back', role: 'cancel' },
        {
          text: 'Assign Now',
          handler: (selectedRanger) => {
            if (selectedRanger) {
              this.confirmAssignment(beat, selectedRanger);
            }
          }
        }
      ]
    });
    await rangerAlert.present();
  }

  async confirmAssignment(beat: any, ranger: any) {
    const payload = {
      beatId: beat.id,
      beatName: beat.name,
      rangerId: ranger.id,
      rangerName: ranger.name,
      companyId: this.companyId
    };

    this.hierarchyService.assignBeat(payload).subscribe({
      next: async () => {
        const success = await this.alertCtrl.create({
          header: 'Success',
          message: `<b>${ranger.name}</b> assigned to <b>${beat.name}</b>.`,
          buttons: ['OK']
        });
        await success.present();
      },
      error: (err) => {
        console.error('Assignment failed:', err);
        window.alert("Assignment save karne mein error aaya.");
      }
    });
  }

  goBack() {
    const roleId = localStorage.getItem('user_role');
    if (roleId === '1' || roleId === '2') {
      this.navCtrl.navigateRoot('/admin');
    } else {
      this.navCtrl.navigateRoot('/home');
    }
  }
}