import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventsTriggeredAdminPage } from './events-triggered-admin.page';

describe('EventsTriggeredAdminPage', () => {
  let component: EventsTriggeredAdminPage;
  let fixture: ComponentFixture<EventsTriggeredAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EventsTriggeredAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
