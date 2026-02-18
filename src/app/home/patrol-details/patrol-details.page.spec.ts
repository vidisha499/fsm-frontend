import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatrolDetailsPage } from './patrol-details.page';

describe('PatrolDetailsPage', () => {
  let component: PatrolDetailsPage;
  let fixture: ComponentFixture<PatrolDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatrolDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
