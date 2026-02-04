import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatrolLogsPage } from './patrol-logs.page';

describe('PatrolLogsPage', () => {
  let component: PatrolLogsPage;
  let fixture: ComponentFixture<PatrolLogsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatrolLogsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
