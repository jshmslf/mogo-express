import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
  animations: [
  trigger('enter', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-40px)' }),
      animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
    ])
  ])
]
})
export class FormComponent {
  @ViewChild('contactForm') contactForm?: NgForm;
  
  showForm = false;
  submitted = false;
  isSending = false;
  files: { name: string; size: number }[] = [];
  formData = {
    name: '',
    email: '',
    message: ''
  }

  toggleForm(state: boolean) {
    this.showForm = state;

    if (state) {
      this.submitted = false;
      this.formData = { name: '', email: '', message: '' };
      this.files = [];
    }
  }

  resetForm() {
    this.submitted = false;
    this.showForm = false;
    this.isSending = false;
    this.formData = { name: '', email: '', message: '' };
    this.files = [];
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files).map((file) => ({
        name: file.name,
        size: file.size,
      }));

      this.files = [...this.files, ...newFiles];

      input.value = '';
    }
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
  }

  onSubmit() {
    if (!this.contactForm) {
      console.error('Form reference not found');
      return;
    }

    if (this.contactForm.invalid) {
      Object.values(this.contactForm.controls).forEach((control: any) => {
        control.markAsTouched();
      });
      return;
    }
    
    this.isSending = true;
    
    console.log('Form submitted:', this.formData, this.files);
    
    this.isSending = false;
    this.submitted = true;
  }

  onCancel() {
    console.log('Cancelled');
    this.toggleForm(false);
  }
}