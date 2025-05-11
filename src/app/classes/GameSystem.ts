import { Transform } from "class-transformer";

export class GameSystem {
  id?: number;
  name: string;
  @Transform(({ value }) => {
    if (value instanceof Date) {
        // Format with time component guaranteed
        return value.toISOString().split('T')[0] + 'T00:00:00';
    }
    // Handle existing string values
    if (typeof value === 'string' && value.length === 10) { // Just a date
        return value + 'T00:00:00';
    }
    return value;
})
  createdAt?: string; // Format ISO: "yyyy-MM-dd"
  @Transform(({ value }) => {
    if (value instanceof Date) {
        // Format with time component guaranteed
        return value.toISOString().split('T')[0] + 'T00:00:00';
    }
    // Handle existing string values
    if (typeof value === 'string' && value.length === 10) { // Just a date
        return value + 'T00:00:00';
    }
    return value;
})
  updatedAt?: string; // Format ISO: "yyyy-MM-dd"

  constructor(
      name: string,
      createdAt?: string,
      updatedAt?: string,
      id?: number
  ) {
      this.id = id;
      this.name = name;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
  }
}
