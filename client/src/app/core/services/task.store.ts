import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Task, TaskFormInput, TaskPriority, TaskStatus } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/tasks';

  private readonly _tasks = signal<Task[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _statusFilter = signal<TaskStatus | 'ALL'>('ALL');
  private readonly _searchTerm = signal('');

  readonly tasks = this._tasks.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();

  readonly filteredTasks = computed(() => {
    const filter = this._statusFilter();
    const query = this._searchTerm().toLowerCase();

    return this._tasks().filter((task) => {
      const matchesFilter = filter === 'ALL' || task.status === filter;
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description ?? '').toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  });

  readonly stats = computed(() => {
    const all = this._tasks();
    return {
      total: all.length,
      todo: all.filter((task) => task.status === 'TODO').length,
      inProgress: all.filter((task) => task.status === 'IN_PROGRESS').length,
      done: all.filter((task) => task.status === 'DONE').length
    };
  });

  constructor() {
    effect(() => {
      if (this._error()) {
        console.error(this._error());
      }
    });
  }

  async loadTasks(): Promise<void> {
    await this.runWithLoading(async () => {
      const tasks = await firstValueFrom(this.http.get<Task[]>(this.apiUrl));
      this._tasks.set(this.sortTasks(tasks));
    });
  }

  async createTask(formValue: TaskFormInput): Promise<void> {
    const payload = this.mapFormToPayload(formValue);
    const created = await firstValueFrom(this.http.post<Task>(this.apiUrl, payload));
    this._tasks.update((tasks) => this.sortTasks([created, ...tasks]));
  }

  async updateTask(taskId: number, formValue: TaskFormInput): Promise<void> {
    const payload = this.mapFormToPayload(formValue);
    const updated = await firstValueFrom(this.http.put<Task>(`${this.apiUrl}/${taskId}`, payload));
    this._tasks.update((tasks) =>
      this.sortTasks(tasks.map((task) => (task.id === taskId ? updated : task)))
    );
  }

  async updateTaskStatus(taskId: number, status: TaskStatus): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<Task>(`${this.apiUrl}/${taskId}/status`, { status })
    );
    this._tasks.update((tasks) =>
      this.sortTasks(tasks.map((task) => (task.id === taskId ? updated : task)))
    );
  }

  async deleteTask(taskId: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${taskId}`));
    this._tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  setFilter(status: TaskStatus | 'ALL'): void {
    this._statusFilter.set(status);
  }

  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  private mapFormToPayload(form: TaskFormInput) {
    return {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null
    };
  }

  private async runWithLoading(operation: () => Promise<void>): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      await operation();
    } catch (error) {
      this._error.set('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      this._loading.set(false);
    }
  }

  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate && !b.dueDate) {
        return -1;
      }
      if (!a.dueDate && b.dueDate) {
        return 1;
      }
      const priorityWeight = (priority: TaskPriority) =>
        priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1;
      return priorityWeight(b.priority) - priorityWeight(a.priority);
    });
  }
}

