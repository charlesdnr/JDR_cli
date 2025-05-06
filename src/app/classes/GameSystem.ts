import { Transform } from "class-transformer";

export class GameSystem {
  id?: number;
  name: string;
  @Transform(({ value }) => {
      if (value instanceof Date) {
        return value.toISOString().replace(/Z$/, '');
      }
      return value;
    })
  createdAt?: string; // Format ISO: "yyyy-MM-dd"
  @Transform(({ value }) => {
      if (value instanceof Date) {
        return value.toISOString().replace(/Z$/, '');
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
