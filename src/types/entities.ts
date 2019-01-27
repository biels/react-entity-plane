import {DocumentNode} from "graphql";
import {EntityFieldInfo} from "./fieldsInfo";
import {EntityComponents} from "./componentsInfo";
import {IconName} from "@blueprintjs/core";

export type EntityInfoKey = string
export type EntityID = string | number

export interface Entity {
    id: EntityID
    name?: string
    shortName?: string
    [other: string]: any
}
export interface EntityQuery {
    query: DocumentNode,
    selector: string,
    type?: 'single' | 'multi'
}
export interface EntityQueries {
    one?: EntityQuery
    all?: EntityQuery
    [key: string]: EntityQuery
}
export interface EntityMutation {
    query: DocumentNode,
}
export interface EntityMutations {
    create?: EntityMutation
    update?: EntityMutation
    delete?: EntityMutation
    [key: string]: EntityMutation
}
export interface RelationInfo {
    entityName: EntityInfoKey,
    type?: 'single' | 'multi'
    refetchParent?: boolean
    queries: EntityQueries
}

export interface EntityInfo {
    name: EntityInfoKey
    type?: 'single' | 'multi'
    fields?: EntityFieldInfo[]
    components?: EntityComponents
    queries: EntityQueries
    mutations: EntityMutations
    display: {
        singular: string
        plural: string,
        gender?: boolean, //T: Masculine, F: Feminine
        icon?: IconName,
        render?: (item: Entity) => any
    },
    relations: {
        [realtionName: string]: RelationInfo
    }
}
export interface EntitiesObject {
    [entityName: string]: EntityInfo
}
