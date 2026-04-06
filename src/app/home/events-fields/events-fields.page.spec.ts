import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventsFieldsPage } from './events-fields.page';

describe('EventsFieldsPage', () => {
  let component: EventsFieldsPage;
  let fixture: ComponentFixture<EventsFieldsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EventsFieldsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
