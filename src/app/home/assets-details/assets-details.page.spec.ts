import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetsDetailsPage } from './assets-details.page';

describe('AssetsDetailsPage', () => {
  let component: AssetsDetailsPage;
  let fixture: ComponentFixture<AssetsDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AssetsDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
