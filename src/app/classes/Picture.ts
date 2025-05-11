import { Transform } from 'class-transformer';

export class Picture {
  id?: number;
  title?: string;
  src?: string;

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
  createdAt: string;

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
  updateAt?: string;

  constructor();
  constructor(
      title?: string,
      src?: string,
      createdAt?: string,
      updateAt?: string,
      id?: number
  );
  constructor(
      title?: string,
      src?: string,
      createdAt?: string,
      updateAt?: string,
      id?: number
  ) {
      this.id = id;
      this.title = title;
      this.src = src;
      this.createdAt = createdAt ?? '';
      this.updateAt = updateAt ?? '';
  }
}
