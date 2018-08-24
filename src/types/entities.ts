import {DocumentNode} from "graphql";

export type EntityInfoKey = string
export type EntityID = string | number

export interface Entity {
    id: EntityID
    name?: string
}
export interface EntityQuery {
    query: DocumentNode,
    selector: string
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
    queries: EntityQueries
}
export interface EntityInfo {
    name: EntityInfoKey
    queries: EntityQueries
    mutations: EntityMutations
    display: {
        singular: string
        plural: string
    },
    relations: {
        [realtionName: string]: RelationInfo
    }
}
export interface EntitiesObject {
    [entityName: string]: EntityInfo
}
