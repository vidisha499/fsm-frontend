import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailyUpdatesPage } from './daily-updates.page';

describe('DailyUpdatesPage', () => {
  let component: DailyUpdatesPage;
  let fixture: ComponentFixture<DailyUpdatesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DailyUpdatesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
