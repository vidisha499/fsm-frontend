
import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../../services/hierarchy.service';

@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: false,
})
export class CategoryPage implements OnInit {
  // 1. Define the categories property so the HTML can find it
  categories: any[] = [];

  constructor(private hierarchyService: HierarchyService) {}

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

  // 2. Add this function to stop the TS2339 error
  openAddModal() {
    console.log('Button clicked! Opening modal...');
    // We will add the actual Modal Controller code here next
  }
}