import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatrolActivePage } from './patrol-active.page';

describe('PatrolActivePage', () => {
  let component: PatrolActivePage;
  let fixture: ComponentFixture<PatrolActivePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatrolActivePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
