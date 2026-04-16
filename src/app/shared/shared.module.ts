import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicLabelPipe } from '../pipes/dynamic-label.pipe';

@NgModule({
  declarations: [
    DynamicLabelPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DynamicLabelPipe
  ]
})
export class SharedModule { }
