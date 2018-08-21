import React, {Component} from 'react';
import styled from "styled-components";
import _ from "lodash";
import {EntityContextConsumer, EntityPlaneStateNode, ProvidedEntityContext} from "./EntityContext";
import {EntityNodeInfo} from "./types/EntityPlaneInfo"; // TODO Remove, put all in global entiity info instead
import All from "react-all-of/lib/All";
import {Namespace} from "react-namespaces";
import {EntityPlaneConsumer} from "./EntityPlaneProvider";
import {EntitiesObject} from "./types/entities";
import {ProvidedNavigationContext} from "react-navigation-plane/lib/NavigationContext/NavigationContext";
import NavigationSpy from "react-navigation-plane/lib/NavigationContext/NavigationSpy";
import PageContextSpy from "react-navigation-plane/lib/PageContext/PageContextSpy";

export interface EntityContextSpyRenderProps {
    info: EntityNodeInfo
    state: EntityPlaneStateNode,
    parentInfo: EntityNodeInfo,
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
                const parentNamespace = _.dropRight(namespace);
                const getFieldPath = (ns) => ns.join('.relations.');
                const fieldPath = getFieldPath(namespace); // Universal path (in info and state)
                const getLocalInfo = () => _.get(entityContext.value.infoNodes, fieldPath);
                const getLocalState = () => _.get(entityContext.value.stateNodes, fieldPath);
                const parentFieldPath = getFieldPath(parentNamespace); // Universal path (in info and state)
                const getParentLocalInfo = () => _.get(entityContext.value.infoNodes, parentFieldPath);
                const getParentState = () => _.get(entityContext.value.stateNodes, parentFieldPath);
                const onStateChange = (newLocalState) => {
                    //On state change
                    const stateTemplate = _.set({}, fieldPath, newLocalState)
                    let newState = _.merge({}, entityContext.value.stateNodes, stateTemplate);
                    entityContext.onStateChange(newState)
                };
                const topLevel = parentNamespace.length == 0;
                if(getLocalState() == null){
                    //Initialize local value
                    const entityName = _.last(namespace);
                    console.log({entityName, topLevel});
                    setTimeout(() => onStateChange({
                        selectedIndex: null,
                        editingIndex: null,
                        relations: {}
                    }))
                    return null;
                }


                return this.props.children({
                    onChange: onStateChange,
                    info: getLocalInfo(),
                    state: getLocalState(),
                    parentInfo: getParentLocalInfo(),
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
