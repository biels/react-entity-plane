import React, {Component} from 'react';
import _ from "lodash";
import EntityContextSpy from "./EntityContextSpy";
import LoadingQuery from "./LoadingQuery";
import {EntityInfo, EntityInfoKey, EntityQuery, RelationInfo} from "./types/entities";
import {Mutation} from "react-apollo";
import {FetchPolicy, MutationOptions, PureQueryOptions} from "apollo-client";
import {DocumentNode} from "graphql";
import {NonIdealState} from "@blueprintjs/core";
import {NavigateParams} from "react-navigation-plane/lib/NavigationContext/NavigationContext";
import {Namespace} from "react-namespaces";
import All from "react-namespaces/lib/All";
import {err} from "./errorMessage";
import {on} from "cluster";
import {selectLimit} from "async";
import ApolloClient from "apollo-client/ApolloClient";
import {EntityPlaneStateNode} from "./EntityContext";
import {Simulate} from "react-dom/test-utils";
import invalid = Simulate.invalid;


export interface EntityObject {
    id: number | string | null

    [k: string]: any
}

export interface EntityRenderProps {
    items: EntityObject[]
    selectedIndex: number | null,
    selectedIndexes: number[],
    selectedIds: number[],
    selectedId: number | string | null,
    editingIndex: number | null
    editingId: number | string | null
    editing: boolean
    editSelected: () => void
    selectedItem: EntityObject
    // handleCreate: () => any
    // handleUpdate: () => any
    // handleDelete: () => any
    mutate: (mutationName: string, id: number | string | null, options: Partial<MutationOptions>) => any
    remove: (index: number, onCompleted?: (data: any) => void) => any
    removeSelected: (onCompleted?: (data: any) => void) => any
    create: (body: Object, onCompleted?: (data: any) => void) => any
    update: (index: number, body: Object, onCompleted?: (data: any) => void) => any
    updateId: (id: number | string | null, body: Object, onCompleted?: (data: any) => void) => any
    updateEditing: (body: Object, onCompleted?: (data: any) => void) => any
    selectIndex: (index: number | null) => any,
    selectIndexes: (indexes: number[], emphasisIndex: number, update: boolean) => any,
    selectId: (id: number | null) => any,
    selectIds: (ids: number[], emphasisId: number, update: boolean) => any,
    startEditing: (index?: number | null) => any,
    cancelEdition: () => void
    refetch: () => void
    single: boolean
    openInOwnPage: (index: number, params?: Partial<NavigateParams>, id?: boolean) => void
    entityState: any,
    setEntityState: (newEntityState: any, update?: boolean) => any
    getLocalState: () => object
    clear: () => any
    entityInfo: EntityInfo
    parentEntityInfo: EntityInfo
    relationInfo: RelationInfo
}

export interface EntityProps {
    name?: EntityInfoKey //Remove?
    relation?: string
    ids?: number | string
    fetchPolicy?: FetchPolicy
    additionalRefetchQueries?: [{ query, variables }]
    children: (props: EntityRenderProps) => any
    root?: boolean
    query?: string
    avoidUnmounting?: boolean
    poll?: boolean

}

let lastCreated = {id: null, path: null};

class Entity extends Component<EntityProps> {
    state = {
        randomPollingOffset: _.random(0, 12000),
        invalid: false
    }

    shouldComponentUpdate() {
        //if(this.state.invalid) return false;
        return true;
    }

    render() {
        let processedName = (this.props.name != null ? `/${this.props.name}` : undefined);
        return <Namespace name={this.props.relation || processedName}>
            <EntityContextSpy>
                {({entityInfo, parentEntityInfo, relationInfo, state, getLocalState, parentState, onChange, namespace, rootEntityId, navigate, topLevel, isRelation, entities, getEntityInfo, onForeignKeyError, clear}) => { //parentRelationInfo can be added
                    let {selectedIndex, selectedIndexes, selectedIds, selectedId, editingIndex} = state

                    const setEntityState = (newEntityState: Partial<EntityPlaneStateNode>, update: boolean = true) => {
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
                        if (this.props.query != null) {
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
                        console.log(`Using Ids`);
                        query = entityInfo.queries.one;
                        variables = {id: this.props.ids};
                        single = true;
                        // console.debug('Singlifying entity with id', this.props.ids);
                    } else {
                        query = entityInfo.queries.all;
                        if (query == null) return err(`Entity ${entityInfo.name} does not have an 'all' query`)
                    }

                    //Explicitly set query
                    if (this.props.query != null && !isRelation) {
                        query = entityInfo.queries[this.props.query]
                        variables = {}
                        single = query.type === 'single'
                    }

                    if (query == null) {
                        return err(`Could not find a query for ${namespace.join('.')}`)
                    }
                    // setEntityState({...state, query}, false)
                    let avoidUnmounting = this.props.avoidUnmounting;
                    avoidUnmounting = avoidUnmounting || this.props.fetchPolicy !== 'cache-only'
                    let pollInterval = (!this.props.poll || this.props.fetchPolicy == 'cache-first' || this.props.fetchPolicy == 'cache-only') ? undefined
                        : 11000 + (!single ? 32000 : 0) + this.state.randomPollingOffset;
                    const handleQueryCompleted = () => {

                    }
                    return <LoadingQuery query={query.query} variables={variables} fetchPolicy={this.props.fetchPolicy}
                                         selector={avoidUnmounting ? query.selector : null} pollInterval={pollInterval}
                                         onCompleted={handleQueryCompleted}>
                        {({data, refetch, client}: { data: any, refetch: Function, client: ApolloClient<any> }) => {
                            let items = _.get(data, query.selector, null);

                            // let items = _.sortBy(unsortedItems, ['id']);
                            if (items == null) {
                                if (this.props.fetchPolicy == "cache-only")
                                    return <div>Waiting...</div>;
                                console.log(`Bad selector ${query.selector}, data:`, data);
                                return <div>Bad selector {query.selector}, data: {JSON.stringify(data)}</div>
                            }

                            if (single) {
                                items = [items];
                                // selectedIndex = 0;
                            }

                            items = _.sortBy(items, ['id'])

                            const selectedItem = items[selectedIndex];
                            const editingItem = _.get(items, editingIndex, null);
                            const editingItemId = _.get(editingItem, 'id', null);


                            //Multi selection
                            const selectIndexes = (indexes: number[], emphasisIndex: number, update: boolean) => {
                                if (this.state.invalid) return;
                                if (indexes == null) indexes = [];
                                if (_.isEqual(selectedIndexes, indexes)) return;
                                if (state.selectedIndexes === indexes) update = false; //Remove?
                                const ids = indexes.map(i => _.get(items[i], 'id'))
                                if (emphasisIndex == null) emphasisIndex = _.last(indexes);
                                let emphasisId = _.get(items[emphasisIndex], 'id')
                                //console.log(`Selecting using indexes`, indexes, ids, emphasisId);
                                onChange({
                                    ...state,
                                    selectedIndexes: indexes,
                                    selectedIds: ids,
                                    selectedIndex: emphasisIndex,
                                    selectedId: emphasisId
                                }, update)
                                //FIXME We may need an extra update here
                                if (update) this.forceUpdate();
                            }
                            const selectIds = (ids: number[], emphasisId: number, update: boolean) => {
                                if (this.state.invalid) return;
                                if (ids == null) ids = [];
                                if (state.selectedIds === ids) update = false;
                                const indexes = _.filter(
                                    ids.map(id => _.findIndex(items, (item: any) => item.id === id)),
                                    index => index != -1
                                )
                                if (emphasisId == null || !ids.includes(emphasisId)) emphasisId = _.last(ids);
                                //console.log(`Selecting using ids: ${indexes.toString()}`, emphasisId);
                                let selectedIndex = _.findIndex(items, (it: any) => it.id === emphasisId);
                                if (selectedIndex === -1) selectedIndex = null;
                                onChange({
                                    ...state,
                                    selectedIds: ids,
                                    selectedIndexes: indexes,
                                    selectedId: _.last(ids),
                                    selectedIndex: selectedIndex
                                }, update)
                                //FIXME We may need an extra update here
                                // selectId(_.last(emphasisId), true)
                                if (update) this.forceUpdate();
                            }
                            //TODO Assisted addition / removal from selection
                            const addToSelection = (index) => {

                            }

                            // @deprecated
                            const selectIndex = (newIndex: number, update: boolean = true) => {
                                selectIndexes([newIndex].filter(i => i != null), newIndex, update);

                                //Old impl
                                // if (newIndex != selectedIndex) {
                                //     console.log(`Changing selectedIndex from ${selectedIndex} to ${newIndex}`);
                                //     onChange({
                                //         ...state,
                                //         selectedIndex: newIndex,
                                //         selectedId: _.get(items[newIndex], 'id', null)
                                //     }, update);
                                //     if (update) this.forceUpdate()
                                // }
                            };
                            // @deprecated
                            const selectId = (id: number | null, update: boolean = true) => {
                                selectIds([id].filter(i => i != null), id, update)

                                //Old impl
                                // if (id == null) {
                                //     selectIndex(null);
                                //     return
                                // }
                                // const index = _.findIndex(items, (it: any) => it.id === id);
                                // selectIndex(index, update)
                            };
                            //If single select 0
                            if (single) selectIndex(0);
                            const fixSelection = () => {
                                let lastCreatedId = lastCreated.id;
                                if (selectedIndex == null && lastCreatedId == null) return;
                                if (items.length === 0) {
                                    //selectIndex(null);
                                    return
                                }
                                let thisPath = namespace.join('.');
                                //console.log(`Fixing selection...`, lastCreated, thisPath);
                                if (lastCreatedId != null && lastCreated.path === thisPath) {
                                    if (!items.map(it => it.id).includes(lastCreatedId)) {
                                        console.log(`Canceling update`);
                                        //if (!this.state.invalid) refetch();
                                        //this.state.invalid = true;
                                        return;
                                    }
                                    console.log(`Selecting ID lastCreated`, lastCreatedId);
                                    lastCreated = {id: null, path: null};
                                    // setTimeout(() => {
                                    //      requestAnimationFrame(() => selectId(lastCreatedId, true))
                                    // },1850);
                                    let selectNew = () => {
                                        console.log(`Selected new ${lastCreatedId}`);
                                        this.state.invalid = false
                                        selectIds([lastCreatedId], lastCreatedId, true);
                                        //setTimeout(() => this.forceUpdate(), 1)
                                    };
                                    console.log(`Scheduling selection`);
                                    // setTimeout(selectNew, 600);
                                    selectNew();
                                    //setTimeout(selectNew, 1200);
                                    // requestAnimationFrame(() => {
                                    // setTimeout(selectNew, 1500)
                                    // });
                                    return
                                }
                                // const validIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
                                // selectIndex(validIndex)
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
                            const handleRefetch = () => refetch(variables);
                            let refetchQueries: Array<PureQueryOptions> = [{query: query.query, variables: variables}];
                            // if (parentRefetchQuery != null) refetchQueries.push({query: parentRefetchQuery, variables: {}});
                            if (this.props.additionalRefetchQueries != null) {
                                const additionalRefetchQueriesWithId = this.props.additionalRefetchQueries
                                    .map(arq => {
                                        if (_.get(arq, 'variables.id') == 'id') {
                                            if (selectedItem == null) return null;
                                            return {
                                                query: arq.query,
                                                variables: {...arq.variables, id: selectedItem.id}
                                            };
                                        }
                                        return arq;
                                    })
                                    .filter(arq => arq != null)
                                refetchQueries = refetchQueries.concat(additionalRefetchQueriesWithId);
                            }
                            const handleCompleted = (type) => (data) => {
                                if (type === 'create') {
                                    const idKey = _.keysIn(data).filter(k => k.startsWith('create'))[0]
                                    if (idKey == null) return;
                                    const id = _.get(data, [idKey, 'id'])
                                    //console.log(`Created ID completed `, id);
                                    lastCreated.id = id;
                                    lastCreated.path = namespace.join('.');
                                    //setTimeout(() => selectId(lastCreated.id), 1000)
                                    //setTimeout(() => fixSelection());
                                }
                            }
                            return <All
                                props={{onError: handleError, refetchQueries}}
                                of={[
                                    [Mutation, {
                                        mutation: entityInfo.mutations.create.query,
                                        onCompleted: handleCompleted('create')
                                    }],
                                    [Mutation, {
                                        mutation: entityInfo.mutations.update.query,
                                        onCompleted: handleCompleted('update')
                                    }],
                                    [Mutation, {
                                        mutation: entityInfo.mutations.delete.query,
                                        onCompleted: handleCompleted('delete')
                                    }],
                                ]}>
                                {(createMutation, updateMutation, deleteMutation) => {
                                    let handleCreate = (body, onCompleted?) => {
                                        if (body == null || body == {}) return;
                                        const onCompleted1 = (p1) => {
                                            console.log(`onCompleted1`, p1);
                                        }
                                        createMutation({variables: {input: body}});
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
                                    let handleMutate = async (mutationName, id, options: Partial<MutationOptions>) => {
                                        let mutation = entityInfo.mutations[mutationName];
                                        if (mutation == null) {
                                            console.log(`${mutationName} is not a mutation on ${entityInfo.name}`);
                                            return;
                                        }
                                        const getDefaultVariables = () => {
                                            if (id == null) return {};
                                            return {id};
                                        }
                                        let baseOptions: MutationOptions = {
                                            mutation: mutation.query,
                                            variables: {...getDefaultVariables(), ...variables}
                                        }
                                        await client.mutate(Object.assign(baseOptions, options))
                                    }
                                    let handleRemoveSelected = (onCompleted?: (data: any) => void) => handleRemove(selectedIndex, onCompleted);
                                    let handleEditSelected = () => setEditIndex(selectedIndex);
                                    let handleUpdateEditing = (body: Object, onCompleted) => handleUpdate(editingIndex, body, onCompleted);

                                    return this.props.children({ // TODO Add mutations
                                        items,
                                        selectedIndex,
                                        selectedIndexes,
                                        selectedIds,
                                        selectedId,
                                        selectedItem,
                                        editingIndex,
                                        editingId: editingItemId,
                                        editing: editingIndex === selectedIndex,
                                        editSelected: handleEditSelected,
                                        mutate: handleMutate,
                                        selectIndex,
                                        selectIndexes,
                                        selectId,
                                        selectIds,
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
                                        getLocalState,
                                        clear,
                                        entityInfo,
                                        parentEntityInfo,
                                        relationInfo
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
