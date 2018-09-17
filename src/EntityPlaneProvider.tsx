import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import _ from "lodash";
import {EntitiesObject} from "./types/entities";
import {ProvidedEntityContext} from "./EntityContext";

export interface EntityPlaneProviderProps {
    entities: EntitiesObject
    onForeignKeyError: (error) => any
}
export interface EntityPlaneProvidedObject {
    entities: EntitiesObject
    onForeignKeyError: (error) => any
}
const {Provider, Consumer: EntityPlaneConsumer} = React.createContext<EntityPlaneProvidedObject>(null);

/**
 * Provides application-level info for entities and error handlers
 */
class EntityPlaneProvider extends Component<EntityPlaneProviderProps> {
    render() {
        return <Provider value={{entities: this.props.entities, onForeignKeyError: this.props.onForeignKeyError}}>
            {this.props.children}
        </Provider>
    }
}

export default EntityPlaneProvider;
export {EntityPlaneConsumer}
