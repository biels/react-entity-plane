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
import {selectLimit} from "async";


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
    remove: (index: number, onCompleted?: (data: any) => void) => any
    removeSelected: (onCompleted?: (data: any) => void) => any
    create: (body: Object, onCompleted?: (data: any) => void) => any
    update: (index: number, body: Object, onCompleted?: (data: any) => void) => any
    updateId: (id: number | string | null, body: Object, onCompleted?: (data: any) => void) => any
    updateEditing: (body: Object, onCompleted?: (data: any) => void) => any
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
    additionalRefetchQueries?: [{query, variables}]
    children: (props: EntityRenderProps) => any
    root?: boolean
    query?: string
}

let lastCreated = {id: null, path: null};
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
                    let parentRefetchQuery = null;
                    if (isRelation && this.props.ids == null) {
                        // Is a valid relation
                        if (parentState.selectedIndex == null) {
                            return <NonIdealState
                                title={'No hay ' + parentEntityInfo.display.singular.toLowerCase() + ' seleccionado/a'}
                                icon={"select"}/>
                        }
                        // If it is a relation and is not top level
                        //let relation = parentEntityInfo.relations[this.props.relation];
                        let relation: RelationInfo = relationInfo;

                        if (relation.type === "single") {
                            query = relation.queries.one;
                            single = true;
                            if (query == null) return err(`Could not find a 'one' query for ${namespace.join('.')}`)
                        } else {
                            query = relation.queries.all;
                            if (query == null) return err(`Could not find an 'all' query for ${namespace.join('.')}`)
                        }
                        variables = {id: parentState.selectedId}
                        if (relation.refetchParent) parentRefetchQuery = parentEntityInfo.type === 'single' ? parentEntityInfo.queries.one : parentEntityInfo.queries.all

                        //Explicitly set query
                        if(this.props.query != null){
                            query = relation.queries[this.props.query]
                        }
                    } else if (this.props.root && topLevel && rootEntityId != null) {
                        //Use Single entity (one) query
                        if (entityInfo.queries.one == null) {
                            let message = `Entity ${entityInfo.name} does not have a 'one' query`;
                            console.error(message);
                            return message
                        }
                        query = entityInfo.queries.one;
                        variables = {id: rootEntityId}; // Take it from the page instead?
                        single = true
                    } else if (this.props.ids != null || entityInfo.type === "single") {
                        if (entityInfo.queries.one == null) return err(`Entity ${entityInfo.name} does not have a 'one' query`);
                        query = entityInfo.queries.one;
                        variables = {id: this.props.ids};
                        single = true;
                        console.debug('Singlifying entity with id', this.props.ids);
                    }
                    else {
                        query = entityInfo.queries.all;
                        if (query == null) return err(`Entity ${entityInfo.name} does not have an 'all' query`)
                    }

                    //Explicitly set query
                    if(this.props.query != null && !isRelation){
                        query = entityInfo.queries[this.props.query]
                    }

                    if (query == null) {
                        return err(`Could not find a query for ${namespace.join('.')}`)
                    }
                    // setEntityState({...state, query}, false)
                    return <LoadingQuery query={query.query} variables={variables} fetchPolicy={this.props.fetchPolicy}>
                        {({data, refetch}) => {
                            let items = _.get(data, query.selector, null);

                            // let items = _.sortBy(unsortedItems, ['id']);
                            if (items == null) {
                                if (this.props.fetchPolicy == "cache-only")
                                    return <div>Waiting...</div>;
                                return <div>Bad selector {query.selector}, items: {items}</div>
                            }

                            if (single) {
                                items = [items];
                            }

                            items = _.sortBy(items, ['id'])

                            const selectedItem = items[selectedIndex];
                            const editingItem = _.get(items, editingIndex, null);
                            const editingItemId = _.get(editingItem, 'id', null);
                            const selectIndex = (newIndex) => {
                                if (newIndex != selectedIndex) {
                                    onChange({
                                        ...state,
                                        selectedIndex: newIndex,
                                        selectedId: _.get(items[newIndex], 'id', null)
                                    });
                                    this.forceUpdate()
                                }
                            };
                            const selectNextId = () => {
                                const nextId = _.max(_.map(items, i => items.id)) + 1
                                selectIndex(nextId)
                            }
                            const selectId = (id: number | null) => {
                                if (id == null) {
                                    selectIndex(null);
                                    return
                                }
                                const index = _.findIndex(items, (it: any) => it.id === id);
                                selectIndex(index)
                            };
                            //If single select 0
                            if (single) selectIndex(0);
                            const fixSelection = () => {
                                if (selectedIndex == null) return;
                                if (items.length === 0) {
                                    selectIndex(null);
                                    return
                                }
                                if(lastCreated.id != null && lastCreated.path === namespace.join('.')){
                                    console.log(`Selecting ID lastCreated`, lastCreated);
                                    selectId(lastCreated.id);
                                    lastCreated = {id: null, path: null};
                                    return
                                }
                                const validIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
                                selectIndex(validIndex)
                            };
                            fixSelection();
                            const setEditIndex = (newIndex) => {
                                if (newIndex === undefined) newIndex = selectedIndex;
                                if (newIndex != editingIndex) {
                                    onChange({...state, editingIndex: newIndex});
                                    this.forceUpdate()
                                }
                            };
                            const cancelEdition = () => setEditIndex(null);
                            const openInOwnPage = (index: number, params?: Partial<NavigateParams>, id?: boolean) => {
                                if (!id) index = _.clamp(index, 0, items.length - 1);
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
                            const handleRefetch = () => refetch({variables: variables});
                            let refetchQueries: Array<PureQueryOptions> = [{query: query.query, variables: variables}];
                            // if (parentRefetchQuery != null) refetchQueries.push({query: parentRefetchQuery, variables: {}});
                            // if (this.props.additionalRefetchQueries != null) refetchQueries = refetchQueries.concat(this.props.additionalRefetchQueries);
                            const handleCompleted = (type) => (data) => {
                                if(type === 'create'){
                                    const idKey = _.keysIn(data).filter(k => k.startsWith('create'))[0]
                                    if (idKey == null) return;
                                    const id = _.get(data, [idKey, 'id'])
                                    console.log(`Created ID completed `, id);
                                    lastCreated.id = id;
                                    lastCreated.path = namespace.join('.');
                                    // setTimeout(() => selectNextId(), 1000)
                                }
                            }
                            return <All
                                props={{onError: handleError, refetchQueries}}
                                of={[
                                    [Mutation, {mutation: entityInfo.mutations.create.query, onCompleted: handleCompleted('create')}],
                                    [Mutation, {mutation: entityInfo.mutations.update.query, onCompleted: handleCompleted('update')}],
                                    [Mutation, {mutation: entityInfo.mutations.delete.query, onCompleted: handleCompleted('delete')}],
                                ]}>
                                {(createMutation, updateMutation, deleteMutation) => {
                                    let handleCreate = (body, onCompleted?) => {
                                        if (body == null || body == {}) return;
                                        const onCompleted1 = (p1) => {
                                            console.log(`onCompleted1`, p1);
                                        }
                                        createMutation({variables: {input: body}, onCompleted: onCompleted1});
                                        // this.forceUpdate()
                                    };
                                    let handleUpdate = (index = selectedIndex, body, onCompleted?) => {
                                        if (index == null || body == null || body == {}) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        updateMutation({variables: {id, input: body}});
                                    };
                                    let handleUpdateId = (id: number, body, onCompleted?) => {
                                        if (id == null || body == null || body == {}) return;
                                        updateMutation({variables: {id, input: body}});
                                    };
                                    let handleRemove = (index, onCompleted?) => {
                                        if (index == null) return;
                                        let id = items[index].id;
                                        if (id == null) return;
                                        deleteMutation({variables: {id}});
                                        // this.forceUpdate()
                                        // If unselect on delete
                                        // selectIndex(null)
                                    };
                                    let handleRemoveSelected = (onCompleted?: (data: any) => void) => handleRemove(selectedIndex, onCompleted);
                                    let handleEditSelected = () => setEditIndex(selectedIndex);
                                    let handleUpdateEditing = (body: Object, onCompleted) => handleUpdate(editingIndex, body, onCompleted);

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
