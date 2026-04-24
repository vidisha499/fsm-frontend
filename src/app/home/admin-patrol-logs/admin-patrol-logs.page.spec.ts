import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPatrolLogsPage } from './admin-patrol-logs.page';

describe('AdminPatrolLogsPage', () => {
  let component: AdminPatrolLogsPage;
  let fixture: ComponentFixture<AdminPatrolLogsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPatrolLogsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
