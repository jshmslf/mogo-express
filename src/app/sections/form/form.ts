import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
})
export class FormComponent {
  showForm = false;
  files: { name: string; size: number }[] = [];

  toggleForm(state: boolean) {
    this.showForm = state;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files).map((file) => ({
        name: file.name,
        size: file.size,
      }));
    }
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
  }

  onSubmit() {
    console.log('Form submitted');
  }

  onCancel() {
    console.log('Cancelled');
    this.toggleForm(false);
  }
}
