
import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../../services/hierarchy.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: false,
})
export class CategoryPage implements OnInit {
  // 1. Define the categories property so the HTML can find it
  categories: any[] = [];

  constructor(private hierarchyService: HierarchyService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  // Reloads data to ensure it persists from NeonDB
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

// category.page.ts mein ye function update karein
async onAddCategory() {
  const name = "Nagpur Circle"; // Ye aap input box se lenge
  const layerId = 1; // Level (Circle=1, Division=2, etc.)
  const parentId = null; // Top level ke liye null

  this.hierarchyService.saveCategory(name, layerId, parentId).subscribe({
    next: (res) => {
      console.log('Category Saved!', res);
      this.loadCategories(); // 👈 Isse list turant refresh ho jayegi
    },
    error: (err) => {
      console.error('Save Error:', err);
    }
  });
}
  async openAddModal() {
  const alert = await this.alertCtrl.create({
    header: 'Add New Hierarchy',
    inputs: [
      {
        name: 'name',
        type: 'text',
        placeholder: 'Enter Name (e.g. Nagpur Circle)'
      },
      {
        name: 'layerId',
        type: 'number',
        placeholder: 'Layer Level (1=Circle, 2=Div, 3=Range)',
        min: 1,
        max: 5
      }
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Save',
        handler: (data) => {
          if (data.name && data.layerId) {
            // Hum yahan saveCategory call karenge
            // ParentId abhi manually pucha ja sakta hai ya default null
            this.hierarchyService.saveCategory(data.name, parseInt(data.layerId), null).subscribe({
              next: () => this.loadCategories(),
              error: (err) => console.error(err)
            });
          }
        }
      }
    ]
  });

  await alert.present();
}
async addHierarchyItem() {
  const newItem = {
    name: 'Nagpur Circle', // Ye aap input se lenge
    layerId: 1,           // Circle level
    parentId: null        // Top level has no parent
  };

  this.hierarchyService.saveCategory(newItem.name, newItem.layerId, newItem.parentId)
    .subscribe({
      next: (res) => {
        console.log('Success!', res);
        this.loadCategories(); // List ko refresh karega
      },
      error: (err) => console.error('Error saving:', err)
    });
}
}