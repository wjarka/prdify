import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SNAKE_CASE_SEGMENT = /_([a-zA-Z0-9])/g;
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;

export function snakeToCamel(value: string): string {
  return value.replace(SNAKE_CASE_SEGMENT, (_match, group: string) => group.toUpperCase());
}

export function camelToSnake(value: string): string {
  return value.replace(CAMEL_CASE_BOUNDARY, "$1_$2").toLowerCase();
}
