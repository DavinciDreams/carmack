// Shared type definitions for the Carmack project.
// This module centralizes reusable, business-logic-agnostic types for use across the codebase.

//
// RecursivePartialNull<T>
// Recursively makes all properties of T optional and nullable.
// Deprecated: Prefer more type-safe partial implementations where possible.
//
export type RecursivePartialNull<T> = T extends object
  ? { [P in keyof T]?: RecursivePartialNull<T[P]> }
  : T | null;

/**
 * Represents a validation check result.
 */
export interface Check {
  name: string;
  expr: string;
  status: "succeeded" | "failed";
}

/**
 * Wraps a value with associated validation checks.
 */
export interface Checked<T, CheckName extends string = string> {
  value: T;
  checks: Record<CheckName, Check>;
}


/**
 * Example: Resume type for demonstration.
 */
export interface Resume {
  name: string;
  email: string;
  experience: string[];
  skills: string[];
}