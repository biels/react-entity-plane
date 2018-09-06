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
import {on} from "cluster";


export interface EntityObject {
    id: number | string | null
    [k: string]: any
}
export interface EntityRenderProps {
    items: EntityObject[]
    selectedIndex: number | null,
    editingIndex: number | null
    editingId: number | string | null
    editing: boolean
    editSelected: () => void
    selectedItem: EntityObject
    // handleCreate: () => any
    // handleUpdate: () => any
    // handleDelete: () => any
    remove: (index: number) => any
    removeSelected: () => any
    create: (body: Object) => any
    update: (index: number, body: Object) => any
    updateId: (id: number | string | null, body: Object) => any
    updateEditing: (body: Object) => any
    selectIndex: (index: number | null) => any,
    selectId: (id: number | null) => any,
    startEditing: (index?: number | null) => any,
    cancelEdition: () => void
    refetch: () => void
    single: boolean
    openInOwnPage: (index: number, params?: Partial<NavigateParams>, id?: boolean) => void
    entityState: any,
    setEntityState: (newEntityState: any, update?: boolean) => any
    getLocalState: () => object
}
export interface EntityProps {
    name?: EntityInfoKey //Remove?
    relation?: string
    ids?: number | string
    fetchPolicy?: FetchPolicy
    children: (props: EntityRenderProps) => any
    root?: boolean

}


class Entity extends Component<EntityProps> {
    // shouldComponentUpdate(){
    //     return false;
    // }
    render() {
        let processedName = (this.props.name != null ? `/${this.props.name}` : undefined);
        return <Namespace name={this.props.relation || processedName}>
            <EntityContextSpy>
                {({entityInfo, parentEntityInfo, relationInfo, state, getLocalState, parentState, onChange, namespace, rootEntityId, navigate, topLevel, isRelation, entities, getEntityInfo, onForeignKeyError}) => { //parentRelationInfo can be added
                    const selectedIndex = state.selectedIndex;
                    const editingIndex = state.editingIndex;

                    const setEntityState = (newEntityState, update: boolean = true) => {
                        onChange({...state, state: {...state.state, ...newEntityState}}, update)
                    }
                    const entityState = state.state;

                    let single = false;
                    let query: EntityQuery;
                    let variables = {};
                    if(isRelation && this.props.ids == null){
                        // Is a valid relation
                        if(parentState.selectedIndex == null){
                            return <NonIdealState title={'No hay ' + parentEntityInfo.display.singular.toLowerCase() + ' seleccionado/a'} icon={"select"}/>
                        }
                        // If it is a relation and is not top level
                        //let relation = parentEntityInfo.relations[this.props.relation];
                        let relation: RelationInfo = relationInfo;

                        if(relation.type === "single"){
                            query = relation.queries.one;
                            single = true;
                            if(query == null) return err(`Could not find a 'one' query for ${namespace.join('.')}`)
                        }else{
                            query = relation.queries.all;
                            if(query == null) return err(`Could not find an 'all' query for ${namespace.join('.')}`)
                        }
                        variables = {id: parentState.selectedId}

                    }else if(this.props.root && topLevel && rootEntityId != null){
                        //Use Single entity (one) query
                        if(entityInfo.queries.one == null){
                            let message = `Entity ${entityInfo.name} does not have a 'one' query`;
                            console.error(message);
                            return message
                        }
                        query = entityInfo.queries.one;
                        variables = {id: rootEntityId}; // Take it from the page instead?
                        single = true
                    }else if(this.props.ids != null){
                        if(entityInfo.queries.one == null) return err(`Entity ${entityInfo.name} does not have a 'one' query`);
                        query = entityInfo.queries.one;
                        variables = {id: this.props.ids};
                        single = true;
                        console.debug('Singlifying entity with id', this.props.ids);
                    }
                    else{
                        query = entityInfo.queries.all;
                        if(query == null) return err(`Entity ${entityInfo.name} does not have an 'all' query`)
                    }

                    if(query == null) {
                        return err(`Could not find a query for ${namespace.join('.')}`)
                    }
                    return <LoadingQuery query={query.query} variables={variables} fetchPolicy={this.props.fetchPolicy}>
                        {({data, refetch}) => {
                            let items = _.get(data, query.selector, null);

                            // let items = _.sortBy(unsortedItems, ['id']);
                            if(items == null){
                                if(this.props.fetchPolicy == "cache-only")
                                    return <div>Waiting...</div>;
                                return <div>Bad selector {query.selector}, items: {items}</div>
                            }

                            if(single) {
                                items = [items];
                            }

                            items = _.sortBy(items, ['id'])

                            const selectedItem = items[selectedIndex];
                            const editingItem = _.get(items, editingIndex, null);
                            const editingItemId = _.get(editingItem, 'id', null);
                            const selectIndex = (newIndex) => {
                                if(newIndex != selectedIndex){
                                    onChange({...state, selectedIndex: newIndex, selectedId: _.get(items[newIndex], 'id', null)});
                                    this.forceUpdate()
                                }
                            };
                            const selectId = (id: number | null) => {
                                if(id == null){
                                    selectIndex(null);
                                    return
                                }
                                const index = _.findIndex(items, (it: any) => it.id === id);
                                selectIndex(index)
                            };
                            //If single select 0
                            if(single) selectIndex(0);
                            const fixSelection = () => {
                                if(selectedIndex == null) return;
                                if(items.length === 0){
                                    selectIndex(null);
                                    return
                                }
                                const validIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
                                selectIndex(validIndex)
                            };
                            fixSelection();
                            const setEditIndex = (newIndex) => {
                                if(newIndex === undefined) newIndex = selectedIndex;
                                if(newIndex != editingIndex){
                                    onChange({...state, editingIndex: newIndex});
                                    this.forceUpdate()
                                }
                            };
                            const cancelEdition = () => setEditIndex(null);
                            const openInOwnPage = (index: number, params?: Partial<NavigateParams>, id?: boolean) => {
                                if(!id) index = _.clamp(index, 0, items.length -1);
                                const defaultParams: NavigateParams = {
                                    to: entityInfo.name,
                                    args: {entityId: id ? index : items[index].id},
                                    inNewTab: false,
                                    focusNewTab: true
                                };
                                navigate(Object.assign({}, defaultParams, params))
                            };
                            const handleError = (e) => {
                                console.log('Mutation error', e);
                                onForeignKeyError(e)
                            };
                            const handleRefetch = () => refetch;
                            const refetchQueries: Array<PureQueryOptions> = [{query: query.query, variables: variables}];

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
                                    };
                                    let handleUpdate = (index = selectedIndex, body) => {
                                        if (index == null || body == null || body == {}) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        updateMutation({variables: {id, input: body}});
                                    };
                                    let handleUpdateId = (id: number, body) => {
                                        if (id == null || body == null || body == {}) return;
                                        updateMutation({variables: {id, input: body}});
                                    };
                                    let handleRemove = (index) => {
                                        if (index == null) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        deleteMutation({variables: {id}});
                                        this.forceUpdate()
                                        // If unselect on delete
                                        // selectIndex(null)
                                    };
                                    let handleRemoveSelected = () => handleRemove(selectedIndex);
                                    let handleEditSelected = () => setEditIndex(selectedIndex);
                                    let handleUpdateEditing = (body: Object) => handleUpdate(editingIndex, body);

                                    return this.props.children({ // TODO Add mutations
                                        items,
                                        selectedIndex,
                                        selectedItem,
                                        editingIndex,
                                        editingId: editingItemId,
                                        editing: editingIndex === selectedIndex,
                                        editSelected: handleEditSelected,
                                        selectIndex,
                                        selectId,
                                        create: handleCreate,
                                        update: handleUpdate,
                                        updateId: handleUpdateId,
                                        updateEditing: handleUpdateEditing,
                                        remove: handleRemove,
                                        removeSelected: handleRemoveSelected,
                                        startEditing: setEditIndex,
                                        cancelEdition,
                                        refetch: handleRefetch,
                                        single,
                                        openInOwnPage,
                                        setEntityState,
                                        entityState,
                                        getLocalState
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
