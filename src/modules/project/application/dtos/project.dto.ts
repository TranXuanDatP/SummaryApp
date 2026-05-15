export class ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.status = params.status;
    this.version = params.version;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
