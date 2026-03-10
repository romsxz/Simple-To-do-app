package com.devnotes.todo.task.web;

import java.time.LocalDate;

import com.devnotes.todo.task.TaskPriority;
import com.devnotes.todo.task.TaskStatus;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskRequest(
		@NotBlank(message = "Title is required")
		@Size(max = 120, message = "Title must be 120 characters or less")
		String title,

		@Size(max = 2000, message = "Description must be 2000 characters or less")
		String description,

		TaskStatus status,

		TaskPriority priority,

		@FutureOrPresent(message = "Due date cannot be in the past")
		LocalDate dueDate
) {
}

