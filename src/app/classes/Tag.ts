import { Module } from "./Module";

export class Tag {
  id?: number;
  name: string;
  modules?: Module[]; // Simplification, car les modules complets ne sont probablement pas nécessaires côté client

  constructor(
      name: string,
      modules?: Module[],
      id?: number
  ) {
      this.id = id;
      this.name = name;
      this.modules = modules;
  }
}
