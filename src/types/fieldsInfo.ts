import {ComponentType} from "react";
import {IconName, Intent} from "@blueprintjs/core";

export enum EntityFieldType{
    string, textarea, boolean, number, email, date, id, enum, relation //Relation is specail, it uses relation form realtions info
}
export interface EntityFieldValidation {

}
export type maskArray = Array<string | RegExp>;
export interface EntityFieldMask {
    mask?: maskArray | ((value: string) => maskArray);
    guide?: boolean;
    placeholderChar?: string;
    keepCharPositions?: boolean;
    pipe?: (
        conformedValue: string,
        config: any
    ) => false | string | { value: string; indexesOfPipedChars: number[] };

    showMask?: boolean;
}
export interface FieldEnumValues {
    value: any,
    display?: string,
    icon?: IconName
    intent?: Intent
}
export interface EntityFieldInfo {
    name: string
    label?: string
    icon?: string,
    type?: EntityFieldType // Default to string,
    validation?: EntityFieldValidation
    required?: boolean
    mask?: EntityFieldMask
    component?: ComponentType
    default?: any
    create?: boolean
    relation?: false | 'single' | 'multi',
    values?: FieldEnumValues[] // For enum
}
