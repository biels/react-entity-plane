import React, {Component} from 'react';
import _ from "lodash";
import {EntitiesObject} from "./types/entities";
import {ProvidedEntityContext} from "./EntityContext";

export interface EntityPlaneProviderProps {
    entities: EntitiesObject
}
const {Provider, Consumer: EntityPlaneConsumer} = React.createContext<EntitiesObject>(null);
class EntityPlaneProvider extends Component<EntityPlaneProviderProps> {
    render() {
        return <Provider value={this.props.entities}>
            {this.props.children}
        </Provider>
    }
}

export default EntityPlaneProvider;
export {EntityPlaneConsumer}
