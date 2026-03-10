import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TaskStore } from './core/services/task.store';
import { AppComponent } from './app.component';

class TaskStoreStub {
  filteredTasks = signal([]);
  stats = signal({ total: 0, todo: 0, inProgress: 0, done: 0 });
  loading = signal(false);
  error = signal(null);
  statusFilter = signal<'ALL'>('ALL');
  searchTerm = signal('');

  loadTasks = jasmine.createSpy('loadTasks');
  createTask = jasmine.createSpy('createTask');
  updateTask = jasmine.createSpy('updateTask');
  deleteTask = jasmine.createSpy('deleteTask');
  updateTaskStatus = jasmine.createSpy('updateTaskStatus');
  setFilter = jasmine.createSpy('setFilter');
  setSearchTerm = jasmine.createSpy('setSearchTerm');
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TaskStore, useClass: TaskStoreStub }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render hero copy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Plan, track and ship');
  });
});
