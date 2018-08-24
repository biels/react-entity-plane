import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import _ from "lodash";
import {EntityContextConsumer, EntityPlaneStateNode, ProvidedEntityContext} from "./EntityContext";
import {EntityNodeInfo} from "./types/EntityPlaneInfo"; // TODO Remove, put all in global entiity info instead
import {Namespace} from "react-namespaces";
import {EntityPlaneConsumer} from "./EntityPlaneProvider";
import {EntitiesObject, EntityInfo} from "./types/entities";
import {ProvidedNavigationContext} from "react-navigation-plane/lib/NavigationContext/NavigationContext";
import NavigationSpy from "react-navigation-plane/lib/NavigationContext/NavigationSpy";
import PageContextSpy from "react-navigation-plane/lib/PageContext/PageContextSpy";
import All from "react-namespaces/lib/All";


export interface EntityContextSpyRenderProps {
    info: EntityInfo
    state: EntityPlaneStateNode,
    parentInfo: EntityInfo,
    parentState: EntityPlaneStateNode
    onChange: (newValue: EntityPlaneStateNode) => any
    namespace: string[],
    rootEntityId: string | number
    topLevel: boolean
    // getRelation: (relationName: string) => Object
    navigate: ProvidedNavigationContext['navigate']
    entities: EntitiesObject
}

export interface EntityContextSpyProps {
    children: (props: EntityContextSpyRenderProps) => any
}


class EntityContextSpy extends Component<EntityContextSpyProps> {
    render() {
        return <All of={[
            NavigationSpy, PageContextSpy, EntityContextConsumer, Namespace, EntityPlaneConsumer
        ]}>
            {({navigate}, {args}, entityContext: ProvidedEntityContext, namespace, entities: EntitiesObject) => {
                if (entities == null) {
                    console.log('Please use <Entity/> inside an entity context');
                    return null;
                }
                const parentNamespace = _.dropRight(namespace);
                const getFieldPath = (ns) => ns.join('.relations.');
                const fieldPath = getFieldPath(namespace); // Universal path (in info and state)
                const getEntityInfo = (entityName) => entities[entityName];
                // const getLocalInfo = () => _.get(entityContext.value.infoNodes, fieldPath);
                const getLocalInfo = () => getEntityInfo();
                const getLocalState = () => _.get(entityContext.value.stateNodes, fieldPath);
                const parentFieldPath = getFieldPath(parentNamespace); // Universal path (in info and state)
                const getParentLocalInfo = () => _.get(entityContext.value.infoNodes, parentFieldPath);
                const getParentInfo = () => _.get(entities, parentFieldPath);
                const getParentState = () => _.get(entityContext.value.stateNodes, parentFieldPath);
                const onStateChange = (newLocalState) => {
                    //On state change
                    const stateTemplate = _.set({}, fieldPath, newLocalState)
                    let newState = _.merge({}, entityContext.value.stateNodes, stateTemplate);
                    entityContext.onStateChange(newState)
                };
                const topLevel = parentNamespace.length == 0;
                if (getLocalState() == null) {
                    //Initialize local value
                    let entityName = getLocalInfo();
                    if(topLevel){

                    }else {
                        const parentState = getParentState();
                        if (parentState == null) {
                            return fieldPath + ' is not a valid path'
                        }
                    }


                    const entityName = localInfo.entityName
                    console.log({entityName, topLevel});
                    setTimeout(() => onStateChange({
                        entityName,
                        selectedIndex: null,
                        editingIndex: null,
                        relations: {}
                    }))
                    return null;
                }


                return this.props.children({
                    onChange: onStateChange,
                    info: getInfo(),
                    state: getLocalState(),
                    parentInfo: getParentInfo(),
                    parentState: getParentState(),
                    namespace,
                    rootEntityId: args.entityId,
                    topLevel,
                    navigate,
                    entities
                })
            }}
        </All>
    }
}

export default EntityContextSpy;
