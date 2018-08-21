import {EntityInfoKey, EntityQueries} from "./entities";

export interface EntityPlaneInfo {
    [entityName: string]: EntityNodeInfo
}

export interface EntityNodeInfo {
    entityName: EntityInfoKey,
    queries?: EntityQueries, // Is there any use case for that?
    relations: {
        [relationName: string]: EntityNodeInfo
    }
}
