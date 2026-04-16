import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeofencesPage } from './geofences.page';

describe('GeofencesPage', () => {
  let component: GeofencesPage;
  let fixture: ComponentFixture<GeofencesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GeofencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
