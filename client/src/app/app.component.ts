import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Task, TaskFormInput, TaskPriority, TaskStatus } from './core/models/task.model';
import { TaskStore } from './core/services/task.store';

type FilterOption = TaskStatus | 'ALL';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly store = inject(TaskStore);
  private readonly fb = inject(FormBuilder);

  readonly statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
  readonly priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  readonly filters: FilterOption[] = ['ALL', ...this.statuses];

  readonly tasks = this.store.filteredTasks;
  readonly stats = this.store.stats;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly activeFilter = this.store.statusFilter;
  readonly searchTerm = this.store.searchTerm;

  readonly editingTaskId = signal<number | null>(null);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    status: ['TODO' as TaskStatus],
    priority: ['MEDIUM' as TaskPriority],
    dueDate: ['']
  });

  readonly formTitle = computed(() =>
    this.editingTaskId() ? 'Update task' : 'Plan a new task'
  );

  constructor() {
    this.store.loadTasks();
  }

  async saveTask(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as TaskFormInput;
    const editingId = this.editingTaskId();

    if (editingId) {
      await this.store.updateTask(editingId, payload);
    } else {
      await this.store.createTask(payload);
    }

    this.resetForm();
  }

  editTask(task: Task): void {
    this.editingTaskId.set(task.id);
    this.form.patchValue({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? ''
    });
  }

  resetForm(): void {
    this.editingTaskId.set(null);
    this.form.reset({
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: ''
    });
  }

  async toggleStatus(task: Task, status: TaskStatus): Promise<void> {
    if (task.status === status) {
      return;
    }
    await this.store.updateTaskStatus(task.id, status);
  }

  async removeTask(taskId: number): Promise<void> {
    await this.store.deleteTask(taskId);
    if (this.editingTaskId() === taskId) {
      this.resetForm();
    }
  }

  async refreshTasks(): Promise<void> {
    await this.store.loadTasks();
  }

  setFilter(option: FilterOption): void {
    this.store.setFilter(option);
  }

  handleSearch(term: string): void {
    this.store.setSearchTerm(term);
  }

  trackByTaskId(_: number, task: Task): number {
    return task.id;
  }

  get titleError(): string | null {
    const control = this.form.controls.title;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Title is required';
    }
    if (control.hasError('maxlength')) {
      return 'Keep it under 120 characters';
    }
    return null;
  }

  statusLabel(option: FilterOption): string {
    if (option === 'ALL') {
      return 'All';
    }
    const pretty = option.toLowerCase().replace(/_/g, ' ');
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  }

  badgeClass(task: Task): string {
    return `status-badge status-${task.status.toLowerCase()}`;
  }

  priorityLabel(priority: TaskPriority): string {
    return priority.charAt(0) + priority.slice(1).toLowerCase();
  }
}
