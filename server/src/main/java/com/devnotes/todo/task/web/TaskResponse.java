package com.devnotes.todo.task.web;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.devnotes.todo.task.Task;
import com.devnotes.todo.task.TaskPriority;
import com.devnotes.todo.task.TaskStatus;

public record TaskResponse(
		Long id,
		String title,
		String description,
		TaskStatus status,
		TaskPriority priority,
		LocalDate dueDate,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
) {

	public static TaskResponse from(Task task) {
		return new TaskResponse(
				task.getId(),
				task.getTitle(),
				task.getDescription(),
				task.getStatus(),
				task.getPriority(),
				task.getDueDate(),
				task.getCreatedAt(),
				task.getUpdatedAt()
		);
	}
}

