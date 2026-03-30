import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetsListPage } from './assets-list.page';

describe('AssetsListPage', () => {
  let component: AssetsListPage;
  let fixture: ComponentFixture<AssetsListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AssetsListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
