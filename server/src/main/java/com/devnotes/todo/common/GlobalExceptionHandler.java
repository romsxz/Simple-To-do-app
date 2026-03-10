package com.devnotes.todo.common;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.devnotes.todo.task.TaskNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(TaskNotFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(TaskNotFoundException ex) {
		return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
		var errorMessage = ex.getBindingResult()
				.getFieldErrors()
				.stream()
				.map(this::formatFieldError)
				.findFirst()
				.orElse("Validation error");
		return buildResponse(HttpStatus.BAD_REQUEST, errorMessage);
	}

	private ResponseEntity<ApiError> buildResponse(HttpStatus status, String message) {
		return ResponseEntity.status(status)
				.body(new ApiError(LocalDateTime.now(), status.value(), message));
	}

	private String formatFieldError(FieldError error) {
		return "%s %s".formatted(error.getField(), error.getDefaultMessage());
	}

	private record ApiError(LocalDateTime timestamp, int status, String message) {
	}
}

