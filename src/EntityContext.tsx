import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {EntityPlaneInfo} from "./types/EntityPlaneInfo";
import {EntityInfoKey, EntityQuery} from "./types/entities";
import _ from 'lodash';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';
export interface EntityPlaneStateNode {
    entityName: EntityInfoKey,
    selectedIndex: number | null,
    selectedIndexes: number[],
    selectedIds: number[],
    editingIndex: number | null,
    selectedId: number | string | null,
    query?: EntityQuery
    state: any
    relations: {
        [relationName: string]: EntityPlaneStateNode
    }
}

interface EntityPlaneStateInfo {
  [entityName: string]: EntityPlaneStateNode
}

export interface EntityContext{
    stateNodes: EntityPlaneStateInfo
    infoNodes: EntityPlaneInfo
    rootEntityId?: string | number
}

export type ProvidedEntityContext = { value: EntityContext, onStateChange: (newValue: EntityPlaneStateInfo, force?: boolean) => void };
const {Provider: RawProvider, Consumer: EntityContextConsumer} = React.createContext<ProvidedEntityContext>({
    value: {stateNodes: {}, infoNodes: {}},
    onStateChange: () => console.log('Please, use inside an EntityContextProvider')
});
interface EntityContextProviderProps {
    entityPlaneInfo?: EntityPlaneInfo
    rootEntityId?: string | number
}
class EntityContextProvider extends Component<EntityContextProviderProps> {
    count = 0;
    state: EntityContext = {stateNodes: {}, infoNodes: {}}
    static getDerivedStateFromProps(props: EntityContextProviderProps, state: EntityContext){
        return {
            stateNodes: state.stateNodes,
            infoNodes: props.entityPlaneInfo || {},
            rootEntityId: props.rootEntityId
        }
    }
    handleStateChange = (newValue, force: boolean = false) => {
        if(!force && _.isEqual(this.state.stateNodes, newValue)) return;
        this.count++;
        let diff: any = detailedDiff(this.state.stateNodes, newValue);
        // console.log(`Updating ${this.count} times with `, diff.added, diff.deleted, diff.updated, newValue);
        this.setState({infoNodes: this.state.infoNodes, stateNodes: newValue}) // Merge?
        //if(force) this.forceUpdate(() => console.log('Forced update'));
    }
    render() {
        return (
            <RawProvider value={{value: this.state, onStateChange: this.handleStateChange}}>
                {this.props.children}
            </RawProvider>
        );
    }
}

export default EntityContextProvider;

export {EntityContextProvider, EntityContextConsumer}
