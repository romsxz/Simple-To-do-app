package com.devnotes.todo.task;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.devnotes.todo.task.web.TaskRequest;
import com.devnotes.todo.task.web.TaskResponse;
import com.devnotes.todo.task.web.TaskStatusUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class TaskController {

	private final TaskService service;

	public TaskController(TaskService service) {
		this.service = service;
	}

	@GetMapping
	public List<TaskResponse> findAll() {
		return service.findAll();
	}

	@GetMapping("/{id}")
	public TaskResponse findById(@PathVariable Long id) {
		return service.findById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TaskResponse create(@Valid @RequestBody TaskRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public TaskResponse update(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
		return service.update(id, request);
	}

	@PutMapping("/{id}/status")
	public TaskResponse updateStatus(@PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest request) {
		return service.updateStatus(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}

