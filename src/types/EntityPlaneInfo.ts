import {EntityInfoKey, EntityQueries} from "./entities";
import {EntityComponents} from "./componentsInfo";

export interface EntityPlaneInfo {
    [entityName: string]: EntityNodeInfo
}

export interface EntityNodeInfo {
    entityName: EntityInfoKey,
    components?: EntityComponents
    queries?: EntityQueries, // Is there any use case for that?
    relations: {
        [relationName: string]: EntityNodeInfo
    }
}
