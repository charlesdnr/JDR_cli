import { ModuleResponse } from "./ModuleResponse";

export class Tag {
  id?: number;
  name: string;
  modules?: ModuleResponse[]; // Simplification, car les modules complets ne sont probablement pas nécessaires côté client

  constructor(
      name: string,
      modules?: ModuleResponse[],
      id?: number
  ) {
      this.id = id;
      this.name = name;
      this.modules = modules;
  }
}