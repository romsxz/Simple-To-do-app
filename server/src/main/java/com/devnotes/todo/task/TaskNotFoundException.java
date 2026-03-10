package com.devnotes.todo.task;

public class TaskNotFoundException extends RuntimeException {

	public TaskNotFoundException(Long id) {
		super("Task %d not found".formatted(id));
	}
}

