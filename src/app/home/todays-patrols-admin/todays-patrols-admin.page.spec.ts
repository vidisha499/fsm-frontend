import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodaysPatrolsAdminPage } from './todays-patrols-admin.page';

describe('TodaysPatrolsAdminPage', () => {
  let component: TodaysPatrolsAdminPage;
  let fixture: ComponentFixture<TodaysPatrolsAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TodaysPatrolsAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
