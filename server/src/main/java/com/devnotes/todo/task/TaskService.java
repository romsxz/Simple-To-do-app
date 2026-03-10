package com.devnotes.todo.task;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devnotes.todo.task.web.TaskRequest;
import com.devnotes.todo.task.web.TaskResponse;
import com.devnotes.todo.task.web.TaskStatusUpdateRequest;

@Service
@Transactional
public class TaskService {

	private final TaskRepository repository;

	public TaskService(TaskRepository repository) {
		this.repository = repository;
	}

	public List<TaskResponse> findAll() {
		return repository.findAllByOrderByDueDateAscPriorityDesc()
				.stream()
				.map(TaskResponse::from)
				.toList();
	}

	public TaskResponse findById(Long id) {
		return TaskResponse.from(loadTask(id));
	}

	public TaskResponse create(TaskRequest request) {
		var task = new Task();
		applyRequest(task, request);
		return TaskResponse.from(repository.save(task));
	}

	public TaskResponse update(Long id, TaskRequest request) {
		var task = loadTask(id);
		applyRequest(task, request);
		return TaskResponse.from(repository.save(task));
	}

	public TaskResponse updateStatus(Long id, TaskStatusUpdateRequest request) {
		var task = loadTask(id);
		task.setStatus(request.status());
		return TaskResponse.from(repository.save(task));
	}

	public void delete(Long id) {
		if (!repository.existsById(id)) {
			throw new TaskNotFoundException(id);
		}
		repository.deleteById(id);
	}

	private Task loadTask(Long id) {
		return repository.findById(id)
				.orElseThrow(() -> new TaskNotFoundException(id));
	}

	private void applyRequest(Task task, TaskRequest request) {
		task.setTitle(request.title());
		task.setDescription(request.description());
		task.setStatus(request.status() != null ? request.status() : TaskStatus.TODO);
		task.setPriority(request.priority() != null ? request.priority() : TaskPriority.MEDIUM);
		task.setDueDate(request.dueDate());
	}
}

