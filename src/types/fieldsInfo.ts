import {ComponentType} from "react";

export enum EntityFieldType{
    string, textarea, boolean, number, email, date, id
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
    relation?: false | 'single' | 'multi'
}
