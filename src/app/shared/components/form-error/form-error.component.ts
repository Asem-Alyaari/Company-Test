import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  imports: [],
  templateUrl: './form-error.component.html',
  styleUrl: './form-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormErrorComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly fieldName = input<string>('This field');

  readonly shouldShowError = computed(() => {
    const ctrl = this.control();
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  });

  readonly errorMessage = computed(() => {
    const ctrl = this.control();
    if (!ctrl || !ctrl.errors) {
      return '';
    }

    const errors = ctrl.errors;
    const name = this.fieldName();

    if (errors['required']) {
      return `${name} is required.`;
    }
    if (errors['email']) {
      return `Please enter a valid email address.`;
    }
    if (errors['minlength']) {
      const requiredLength = (errors['minlength'] as { requiredLength: number }).requiredLength;
      return `${name} must be at least ${requiredLength} characters long.`;
    }
    if (errors['maxlength']) {
      const requiredLength = (errors['maxlength'] as { requiredLength: number }).requiredLength;
      return `${name} cannot exceed ${requiredLength} characters.`;
    }
    if (errors['min']) {
      const min = (errors['min'] as { min: number }).min;
      return `${name} must be greater than or equal to ${min}.`;
    }
    if (errors['max']) {
      const max = (errors['max'] as { max: number }).max;
      return `${name} must be less than or equal to ${max}.`;
    }
    if (errors['pattern']) {
      return `${name} format is invalid.`;
    }
    if (typeof errors['message'] === 'string') {
      return errors['message'];
    }
    if (typeof errors['custom'] === 'string') {
      return errors['custom'];
    }
    if (errors['uniqueCode'] || errors['uniqueName'] || errors['unique']) {
      return `${name} already exists. Please enter a unique ${name.toLowerCase()}.`;
    }

    return `${name} is invalid.`;
  });
}
