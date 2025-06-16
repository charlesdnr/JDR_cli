import { ModuleRating } from "./ModuleRating";

export class AggregatedRatings {
    moduleNumberOfRatings = 0;
    versionNumberOfRatings = 0;
    moduleAverageRating = 0;
    versionAverageRating = 0;
    userRating: ModuleRating | null = null;
}