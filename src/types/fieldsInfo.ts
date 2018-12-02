import {ComponentType} from "react";

enum EntityFieldType{
    string, boolean, number, email, date, id
}
interface EntityFieldValidation {
    required: boolean
}
export type maskArray = Array<string | RegExp>;
interface EntityFieldMask {
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
    mask?: EntityFieldMask
    component?: ComponentType

    relation?: false | 'single' | 'multi'
}
