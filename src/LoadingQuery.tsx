import React, {Component} from 'react';
import styled from "styled-components";
import {Query} from "react-apollo";
import {OperationVariables} from "react-apollo/types";
import {QueryProps} from "react-apollo/Query";
import {Button, NonIdealState, Spinner} from "@blueprintjs/core";
import {NetworkStatus} from "apollo-client";

const SpinnerContainer = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    padding: 16px;
    margin: 16px;
    height: 100%;
    width: 100%;
    //border: 3px solid lightgray;
    box-sizing: padding-box;
`

const ErrorObjectContainer = styled.pre`
    border: 1px solid #ccc;
    background: rgba(0, 0, 0, 0.1);
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.2);
    padding: 16px;
    margin: 8px;
    text-align: left;
    overflow: auto;
`

export interface LoadingQueryProps<TData = any, TVariables = OperationVariables> extends QueryProps<TData, TVariables> {
    size?: number
}


class LoadingQuery<TData = any, TVariables = OperationVariables> extends Component<LoadingQueryProps> {
    render() {
        const {size, ...rest} = this.props
        return <Query {...rest}>
            {({loading, error, ...otherProps}) => {
                if (loading) {
                    return <SpinnerContainer>
                        <Spinner size={size}/>
                    </SpinnerContainer>;
                }
                if (error) {
                    const isNetworkError = error.message.toLowerCase().includes('network')
                    return <NonIdealState
                        title={isNetworkError ? 'You are offline' : error.name}
                        description={error.message}
                        icon={isNetworkError ? 'offline' : 'error'}
                        action={<Button loading={otherProps.networkStatus === NetworkStatus.loading} icon={'repeat'}
                                        onClick={() => otherProps.refetch(otherProps.variables)}>Retry</Button>}
                    >
                        {!isNetworkError &&
                        <ErrorObjectContainer>
                            {JSON.stringify(error, null, 2)}
                        </ErrorObjectContainer>
                        }
                    </NonIdealState>
                }
                return this.props.children({loading, error, ...otherProps});
            }}
        </Query>
    }
}

export default LoadingQuery;
