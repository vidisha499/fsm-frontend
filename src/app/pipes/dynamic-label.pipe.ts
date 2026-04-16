import { Pipe, PipeTransform } from '@angular/core';
import { LabelService } from '../services/label.service';

@Pipe({
  name: 'dynamicLabel',
  pure: false, // Essential to update UI when service values change without pipe input change
  standalone: false
})
export class DynamicLabelPipe implements PipeTransform {

  constructor(private labelService: LabelService) {}

  transform(key: string): string {
    if (!key) return '';
    return this.labelService.getLabel(key);
  }

}
