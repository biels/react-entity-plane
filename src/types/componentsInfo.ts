import {ComponentType} from "react";
import {EntityRenderProps} from "../Entity";

interface EntityComponentProps {
    entity: EntityRenderProps
    [any: string]: any
}

export type EntityComponent = any | ComponentType<EntityComponentProps>;

export interface EntityComponents {
    create?: EntityComponent
    update?: EntityComponent
    show?: EntityComponent
    pick?: EntityComponent //TODO Improve picker interface
}
