export class ModuleRequest {
  title: string;
  description: string;
  isTemplate: boolean;
  type: string;

  constructor(
      title: string,
      description: string,
      isTemplate: boolean,
      type: string
  ) {
      this.title = title;
      this.description = description;
      this.isTemplate = isTemplate;
      this.type = type;
  }
}