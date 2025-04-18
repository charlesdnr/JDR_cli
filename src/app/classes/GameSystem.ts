export class GameSystem {
  id?: number;
  name: string;
  createdAt?: string; // Format ISO: "yyyy-MM-dd"
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
