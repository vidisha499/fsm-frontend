import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForestEventsPage } from './forest-events.page';

describe('ForestEventsPage', () => {
  let component: ForestEventsPage;
  let fixture: ComponentFixture<ForestEventsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ForestEventsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
