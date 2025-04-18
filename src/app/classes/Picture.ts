import { PictureUsage } from "../enum/PictureUsage";

export class Picture {
  id?: number;
  pictureUsage: PictureUsage;
  pictureUsageId: number;
  title?: string;
  src?: string;
  createdAt?: string; // Format ISO: "yyyy-MM-dd"
  updateAt?: string; // Format ISO: "yyyy-MM-dd"

  constructor(
      pictureUsage: PictureUsage,
      pictureUsageId: number,
      title?: string,
      src?: string,
      createdAt?: string,
      updateAt?: string,
      id?: number
  ) {
      this.id = id;
      this.pictureUsage = pictureUsage;
      this.pictureUsageId = pictureUsageId;
      this.title = title;
      this.src = src;
      this.createdAt = createdAt;
      this.updateAt = updateAt;
  }
}