import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAnalyticsPage } from './admin-analytics.page';

describe('AdminAnalyticsPage', () => {
  let component: AdminAnalyticsPage;
  let fixture: ComponentFixture<AdminAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
