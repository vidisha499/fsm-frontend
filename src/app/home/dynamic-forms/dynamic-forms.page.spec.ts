import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicFormsPage } from './dynamic-forms.page';

describe('DynamicFormsPage', () => {
  let component: DynamicFormsPage;
  let fixture: ComponentFixture<DynamicFormsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DynamicFormsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
