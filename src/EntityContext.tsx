import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {EntityPlaneInfo} from "./types/EntityPlaneInfo";

export interface EntityPlaneStateNode {
    // entityName: EntityInfoKey,
    selectedIndex: number | null,
    editingIndex: number | null,
    selectedId: number | string | null,
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

export type ProvidedEntityContext = { value: EntityContext, onStateChange: (newValue: EntityPlaneStateInfo) => void };
const {Provider: RawProvider, Consumer: EntityContextConsumer} = React.createContext<ProvidedEntityContext>({
    value: {stateNodes: {}, infoNodes: {}},
    onStateChange: () => console.log('Please, use inside an EntityContextProvider')
});
interface EntityContextProviderProps {
    entityPlaneInfo?: EntityPlaneInfo
    rootEntityId?: string | number
}
class EntityContextProvider extends Component<EntityContextProviderProps> {
    state: EntityContext = {stateNodes: {}, infoNodes: {}}
    static getDerivedStateFromProps(props: EntityContextProviderProps, state: EntityContext){
        return {
            stateNodes: state.stateNodes,
            infoNodes: props.entityPlaneInfo || {},
            rootEntityId: props.rootEntityId
        }
    }
    handleStateChange = (newValue) => {
        this.setState({infoNodes: this.state.infoNodes, stateNodes: newValue}) // Merge?
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
