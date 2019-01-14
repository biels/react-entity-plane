import {ComponentType} from "react";
import {IconName, Intent} from "@blueprintjs/core";

export enum EntityFieldType{
    string, textarea, boolean, number, email, date, id, enum, relation //Relation is specail, it uses relation form realtions info
}
export interface EntityFieldValidation {
    min?: number
    max?: number
    decimals?: number
    custom?: (value, allValues) => any
    maxLength?: number
    minLength?: number
    match?: RegExp
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
export interface NumberFormat {

}
export enum EnumStyle {
    select, option, button
}
export interface FieldEnumValues {
    value: any,
    display?: string,
    icon?: IconName
    intent?: Intent
    showThrough?: boolean
}
export interface EntityFieldInfo {
    name: string
    label?: string,
    help?: string,
    icon?: IconName,
    type?: EntityFieldType // Default to string,
    validation?: EntityFieldValidation
    required?: boolean
    mask?: EntityFieldMask
    component?: ComponentType
    default?: any
    create?: boolean
    relation?: false | 'single' | 'multi',
    serial?: boolean
    forceShow?: boolean
    values?: FieldEnumValues[] // For enum
    // format: NumberFormat
}
