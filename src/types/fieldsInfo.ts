import {ComponentType} from "react";

enum EntityFieldType{
    string, boolean, number, email, date, id
}
interface EntityFieldValidation {
    required: boolean
}
interface EntityFieldMask {
    mask: any
    placeholder: string
    guide: boolean
}
export interface EntityFieldInfo {
    name: string
    icon?: string,
    type?: EntityFieldType // Default to string,
    validation?: EntityFieldValidation
    mask?: EntityFieldMask
    component?: ComponentType

    relation?: false | 'single' | 'multi'
}
