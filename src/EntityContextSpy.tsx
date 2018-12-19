import React, {Component} from 'react';
import _ from "lodash";
import {EntityContextConsumer, EntityPlaneStateNode, ProvidedEntityContext} from "./EntityContext";
import {Namespace} from "react-namespaces";
import {EntityPlaneConsumer, EntityPlaneProvidedObject} from "./EntityPlaneProvider";
import {EntitiesObject, EntityInfo, RelationInfo} from "./types/entities";

import All from "react-namespaces/lib/All";
import {err} from "./errorMessage";
import {diff, addedDiff, deletedDiff, updatedDiff, detailedDiff} from 'deep-object-diff';
import {NavigationSpy, PageContextSpy, ProvidedNavigationContext} from "react-navigation-plane";

export interface EntityContextSpyRenderProps {
    entityInfo: EntityInfo
    parentEntityInfo: EntityInfo,
    relationInfo: RelationInfo
    // parentRelationInfo: RelationInfo, //Implement if needed
    state: EntityPlaneStateNode,
    parentState: EntityPlaneStateNode
    onChange: (newValue: EntityPlaneStateNode, update?: boolean) => any
    getEntityInfo: (entityName: string) => EntityInfo
    namespace: string[],
    rootEntityId: string | number
    topLevel: boolean
    isRelation: boolean
    // getRelation: (relationName: string) => Object
    navigate: ProvidedNavigationContext['navigate']
    entities: EntitiesObject
    onForeignKeyError: (error) => any
    getLocalState: () => object
    clear: () => any
}

export interface EntityContextSpyProps {
    children: (props: EntityContextSpyRenderProps) => any
}


class EntityContextSpy extends Component<EntityContextSpyProps> {
    render() {
        return <All of={[
            NavigationSpy, PageContextSpy, EntityContextConsumer, Namespace, EntityPlaneConsumer
        ]}>
            {({navigate}, {args}, entityContext: ProvidedEntityContext, namespace, entityPlane: EntityPlaneProvidedObject) => {
                const entities = entityPlane.entities;
                if (entities == null) {
                    return err(`Please use <Entity/> inside an entity context`);
                }
                if (namespace.length === 0) {
                    return err(`Used top level <Entity/> without a name`);
                }

                //console.log('[EntityContextSpy] Namespace', namespace.join('.'));
                const getEntityInfo = (entityName): EntityInfo => {
                    if (entityName == null) return null
                    const info = entities[entityName]
                    if (info == null) console.log(`Tried to access unknown entity ${entityName}`);
                    return info

                }
                const parentNamespace = _.dropRight(namespace) as string[];
                const getFieldPath = (ns) => ns.join('.relations.');
                const fieldPath = getFieldPath(namespace); // Universal path (in info and state)
                const getLocalInfo = () => _.get(entityContext.value.infoNodes, fieldPath);
                const getLocalState = () => _.get(entityContext.value.stateNodes, fieldPath);
                const parentFieldPath = getFieldPath(parentNamespace); // Universal path (in info and state)
                const getParentLocalInfo = () => _.get(entityContext.value.infoNodes, parentFieldPath);
                const getParentState = (): EntityPlaneStateNode => _.get(entityContext.value.stateNodes, parentFieldPath);
                const onStateChange = (newLocalState, update: boolean = true) => {
                    //On state change
                    // console.log('Updating local state: ', newLocalState, getLocalState(),
                    // detailedDiff(newLocalState, getLocalState())); const initial = _.get(newLocalState,
                    // 'state.pickerOpen')
                    const stateTemplate = _.set(_.cloneDeep(entityContext.value.stateNodes), fieldPath, newLocalState)
                    let newState = _.merge({}, entityContext.value.stateNodes, stateTemplate);
                    // console.log('onStateChange', newState, stateTemplate);
                    if (!update) {
                        _.set(entityContext.value.stateNodes, fieldPath, newLocalState)
                        // setTimeout(() => entityContext.onStateChange(stateTemplate, true))
                        // TODO Check that it actually works
                    } else {
                        entityContext.onStateChange(stateTemplate, true)
                        // console.log('>>>> onStateChange', stateTemplate);
                    }
                    // const final = _.get(getLocalState(), 'state.pickerOpen')
                    // console.log('State diff', initial, final);
                    // if(!_.isEqual(newLocalState, getLocalState())){
                    //     console.error('Error updating states expected / actual:', newLocalState, getLocalState(),
                    // detailedDiff(newLocalState, getLocalState())); }else { console.info('State updated correctly!');
                    // }
                };
                const topLevel = parentNamespace.length == 0;
                const isRelation = !topLevel;
                const nsFrame: string = _.last(namespace);
                const parentNSFrame: string = _.last(parentNamespace);
                // [e1, r1, r2, r3, ...]
                // entity1.relations.entity2, entity2.relations.entity3
                // entity1.relations.entity2.relations.entity3
                // RelationInfo (null on topLevel) -> entityName, EntityInfo


                const getEntityName = () => {
                    if (isRelation) {
                        let relationInfo = getRelationInfo();
                        if (relationInfo == null) {
                            console.log(`${namespace.join('.')} should be a relation, but could not access it`);
                            return null;
                        }
                        return relationInfo.entityName
                    } else {
                        if (entities[nsFrame] === undefined) {
                            console.log(`${nsFrame} is not an entity name. Using a relation at top level?`,);
                            return null;
                        }
                        return nsFrame;
                    }
                }
                const getParentEntityName = () => {
                    if (topLevel) return null;
                    return getParentState().entityName;
                }
                const getRelationInfo = () => {
                    if (!isRelation) return null;
                    const parentEntityState = getParentState();
                    const parentEntityName = parentEntityState.entityName;
                    const parentEntityInfo = getEntityInfo(parentEntityName);
                    return parentEntityInfo.relations[nsFrame]
                }
                const isValidEntityName = (entityName) => {
                    return _.get(entities, entityName) != null
                }
                let preRelation = getRelationInfo();
                if(isRelation && preRelation == null){
                    return err(`Could not find relationInfo for ${namespace.join('.')}`)
                }
                const entityName = isRelation ? preRelation.entityName : nsFrame;
                const clear = (update) => {
                    onStateChange({
                        entityName,
                        selectedIndex: null,
                        selectedIndexes: [],
                        selectedIds: [],
                        editingIndex: null,
                        creating: false,
                        relations: {},
                        state: {}
                    }, update)
                }

                if (getLocalState() == null) {
                    //Initialize local value

                    if (!isValidEntityName(entityName)) {
                        return err(`${entityName} is not a valid entity name. Valid names are: ${_.keysIn(entities).toString()}`)
                    }
                    // console.log({entityName, topLevel});
                    clear(true);
                    return null;
                }
                const entityInfo = getEntityInfo(getEntityName())
                const parentEntityInfo = getEntityInfo(getParentEntityName())
                const relationInfo = getRelationInfo();
                if (entityInfo == null) {
                    return `${namespace.join('.')}`
                }
                if (isRelation) {
                    if (parentEntityInfo == null) {
                        return err(`parentEntityInfo could not be found for ${namespace.join('.')}`)
                    }
                    if (relationInfo == null) {
                        return err(`Could not find relationInfo for ${namespace.join('.')}`)
                    }
                }
                return this.props.children({
                    entityInfo,
                    parentEntityInfo,
                    relationInfo: getRelationInfo(),

                    state: getLocalState(),
                    getLocalState: getLocalState,
                    parentState: getParentState(),
                    onChange: onStateChange,
                    getEntityInfo: getEntityInfo,
                    namespace,
                    rootEntityId: args.entityId,
                    topLevel,
                    isRelation,
                    navigate,
                    entities,
                    onForeignKeyError: entityPlane.onForeignKeyError,
                    clear
                } as EntityContextSpyRenderProps)
            }}
        </All>
    }
}

export default EntityContextSpy;
