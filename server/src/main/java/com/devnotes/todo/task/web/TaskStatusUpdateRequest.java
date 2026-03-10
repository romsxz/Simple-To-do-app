package com.devnotes.todo.task.web;

import com.devnotes.todo.task.TaskStatus;

import jakarta.validation.constraints.NotNull;

public record TaskStatusUpdateRequest(
		@NotNull(message = "Status is required")
		TaskStatus status
) {
}

