import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SightingsPage } from './sightings.page';

describe('SightingsPage', () => {
  let component: SightingsPage;
  let fixture: ComponentFixture<SightingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SightingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
