import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicLabelsPage } from './dynamic-labels.page';

describe('DynamicLabelsPage', () => {
  let component: DynamicLabelsPage;
  let fixture: ComponentFixture<DynamicLabelsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DynamicLabelsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
