import React, {Component} from 'react';
import _ from "lodash";
import EntityContextSpy from "./EntityContextSpy";
import LoadingQuery from "./LoadingQuery";
import {EntityInfo, EntityInfoKey, EntityQuery, RelationInfo} from "./types/entities";
import {Mutation} from "react-apollo";
import {FetchPolicy, PureQueryOptions} from "apollo-client";
import {DocumentNode} from "graphql";
import {NonIdealState} from "@blueprintjs/core";
import {NavigateParams} from "react-navigation-plane/lib/NavigationContext/NavigationContext";
import {Namespace} from "react-namespaces";
import All from "react-namespaces/lib/All";
import {err} from "./errorMessage";


export interface EntityObject {
    id: number | string | null
    [k: string]: any
}
export interface EntityRenderProps {
    items: EntityObject[]
    selectedIndex: number | null,
    editingIndex: number | null
    editingId: number | string | null
    selectedItem: EntityObject
    // handleCreate: () => any
    // handleUpdate: () => any
    // handleDelete: () => any
    remove: (id: number | string | null) => any
    removeSelected: () => any
    create: (body: Object) => any
    update: (id: number | string | null, body: Object) => any
    updateEditing: (body: Object) => any
    selectIndex: (index: number | null) => any,
    startEditing: (index: number | null) => any,
    cancelEdition: () => void
    refetch: () => void
    openInOwnPage: (index: number, params?: Partial<NavigateParams>) => void
}
export interface EntityProps {
    name?: EntityInfoKey //Remove?
    relation?: string
    id?: number | string
    fetchPolicy?: FetchPolicy
    children: (props: EntityRenderProps) => any
}


class Entity extends Component<EntityProps> {
    render() {
        return <Namespace name={this.props.relation || this.props.name}>
            <EntityContextSpy>
                {({entityInfo, parentEntityInfo, relationInfo, state, parentState, onChange, namespace, rootEntityId, navigate, topLevel, isRelation, entities, getEntityInfo}) => { //parentRelationInfo can be added
                    const getInfo = (name: EntityInfoKey) => entities[name]
                    const selectedIndex = state.selectedIndex;
                    const editingIndex = state.editingIndex;

                    let single = false;
                    let query: EntityQuery;
                    let variables = {}
                    if(isRelation){
                        // Is a valid relation
                        if(parentState.selectedIndex == null){
                            return <NonIdealState title={'No hay ' + parentEntityInfo.display.singular.toLowerCase() + ' seleccionado/a'} icon={"select"}/>
                        }
                        // If it is a relation and is not top level
                        //let relation = parentEntityInfo.relations[this.props.relation];
                        let relation: RelationInfo = relationInfo;

                        if(relation.type === "single"){
                            query = relation.queries.one
                            single = true
                        }else{
                            query = relation.queries.all
                        }
                        variables = {id: parentState.selectedId}

                    }else if(topLevel && rootEntityId != null){
                        //Use Single entity (one) query
                        if(entityInfo.queries.one == null){
                            let message = `Entity ${entityInfo.name} does not have a 'one' query`;
                            console.error(message);
                            return message
                        }
                        query = entityInfo.queries.one
                        variables = {id: rootEntityId} // Take it from the page instead?
                        single = true
                    }
                    else{
                        query = entityInfo.queries.all
                    }

                    if(query == null) {
                        return err(`Could not find a query for ${namespace.join('.')}`)
                    }
                    return <LoadingQuery query={query.query} variables={variables} fetchPolicy={this.props.fetchPolicy}>
                        {({data, refetch}) => {
                            let items = _.get(data, query.selector, null)
                            if(items == null){
                                if(this.props.fetchPolicy == "cache-only")
                                    return <div>Waiting...</div>
                                return <div>Bad selector {query.selector}</div>
                            }
                            if(single) {
                                items = [items];
                            }
                            const selectedItem = items[selectedIndex]
                            const editingItem = _.get(items, editingIndex, null);
                            const editingItemId = _.get(editingItem, 'id', null);
                            const selectIndex = (newIndex) => {
                                if(newIndex != selectedIndex){
                                    onChange({...state, selectedIndex: newIndex, selectedId: _.get(items[newIndex], 'id', null)})
                                    this.forceUpdate()
                                }
                            }
                            //If single select 0
                            if(single) selectIndex(0);
                            const fixSelection = () => {
                                if(selectedIndex == null) return;
                                if(items.length === 0){
                                    selectIndex(null)
                                    return
                                }
                                const validIndex = Math.max(0, Math.min(selectedIndex, items.length - 1))
                                selectIndex(validIndex)
                            }
                            fixSelection()
                            const setEditIndex = (newIndex) => {
                                if(newIndex != editingIndex){
                                    onChange({...state, editingIndex: newIndex})
                                    this.forceUpdate()
                                }
                            }
                            const cancelEdition = () => setEditIndex(null)
                            const openInOwnPage = (index: number, params?: Partial<NavigateParams>) => {
                                index = _.clamp(index, 0, items.length -1)
                                const defaultParams: NavigateParams = {
                                    to: entityInfo.name,
                                    args: {entityId: items[index].id},
                                    inNewTab: false,
                                    focusNewTab: true
                                }
                                navigate(Object.assign({}, defaultParams, params))
                            }
                            const handleError = (e) => {
                                console.log('Mutation error', e);
                            }
                            const handleRefetch = () => refetch
                            const refetchQueries: Array<PureQueryOptions> = [{query: query.query, variables: variables}]

                            return <All
                                props={{onError: handleError, refetchQueries}}
                                of={[
                                    [Mutation, {mutation: entityInfo.mutations.create.query}],
                                    [Mutation, {mutation: entityInfo.mutations.update.query}],
                                    [Mutation, {mutation: entityInfo.mutations.delete.query}],
                                ]}>
                                {(createMutation, updateMutation, deleteMutation) => {
                                    let handleCreate = (body) => {
                                        if (body == null || body == {}) return;
                                        createMutation({variables: {input: body}});
                                    }
                                    let handleUpdate = (index = selectedIndex, body) => {
                                        if (index == null || body == null || body == {}) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        updateMutation({variables: {id, input: body}});
                                    }
                                    let handleRemove = (index) => {
                                        if (index == null) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        deleteMutation({variables: {id}});
                                        // If unselect on delete
                                        // selectIndex(null)
                                    }
                                    let handleRemoveSelected = () => handleRemove(selectedIndex)
                                    let handleUpdateEditing = (body: Object) => handleUpdate(editingIndex, body)

                                    return this.props.children({ // TODO Add mutations
                                        items,
                                        selectedIndex,
                                        selectedItem,
                                        editingIndex,
                                        editingId: editingItemId,
                                        selectIndex,
                                        create: handleCreate,
                                        update: handleUpdate,
                                        updateEditing: handleUpdateEditing,
                                        remove: handleRemove,
                                        removeSelected: handleRemoveSelected,
                                        startEditing: setEditIndex,
                                        cancelEdition,
                                        refetch: handleRefetch,
                                        openInOwnPage
                                    })
                                }}
                            </All>
                        }}
                    </LoadingQuery>
                }}
            </EntityContextSpy>
        </Namespace>
    }
}

export default Entity;
