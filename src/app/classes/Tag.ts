import { SimpleModule } from '../interfaces/SimpleModule';

export class Tag {
  id: number;
  name: string;
  modules: SimpleModule[];

  constructor();
  constructor(name: string, modules: SimpleModule[], id?: number);
  constructor(name?: string, modules?: SimpleModule[], id?: number) {
    this.id = id ?? 0;
    this.name = name ?? '';
    this.modules = modules ?? [];
  }
}
