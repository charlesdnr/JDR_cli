import { Transform } from 'class-transformer';

export class Picture {
  id?: number;
  title?: string;
  src?: string;
  
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString().replace(/Z$/, '');
    }
    return value;
  })
  createdAt: string;

  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString().replace(/Z$/, '');
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
