import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SightingsDetailsPage } from './sightings-details.page';

describe('SightingsDetailsPage', () => {
  let component: SightingsDetailsPage;
  let fixture: ComponentFixture<SightingsDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SightingsDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
