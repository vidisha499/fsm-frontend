import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodaysPatrolsDetailsAdminPage } from './todays-patrols-details-admin.page';

describe('TodaysPatrolsDetailsAdminPage', () => {
  let component: TodaysPatrolsDetailsAdminPage;
  let fixture: ComponentFixture<TodaysPatrolsDetailsAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TodaysPatrolsDetailsAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
