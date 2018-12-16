import React, {Component} from 'react';
import styled from "styled-components";
import {Query} from "react-apollo";
import {OperationVariables} from "react-apollo/types";
import {QueryProps} from "react-apollo/Query";
import {Button, Intent, NonIdealState, Spinner} from "@blueprintjs/core";
import {NetworkStatus} from "apollo-client";
import _ from 'lodash';
import Timer = NodeJS.Timer;

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
    selector?: string
}

let debugging = false;

class LoadingQuery<TData = any, TVariables = OperationVariables> extends Component<LoadingQueryProps> {
    state = {
        loaded: false,
        broken: false
    }
    timeout: Timer;

    componentDidMount() {
        this.timeout = setTimeout(() => {
            if (this.state.loaded) return;
            // console.log(`Broken!`);
            this.setState({broken: true});
        }, debugging ? 1900 : 25000)
    }

    componentWillUnmount(): void {
        clearTimeout(this.timeout)
    }

    render() {
        const {size, ...rest} = this.props
        return <Query {...rest}>
            {({loading, error, data, ...otherProps}) => {
                let selectorInvalid = (this.props.selector && _.get(data, this.props.selector) == null);
                if (!error && (data == null || selectorInvalid) && error == null && !this.state.broken) {
                    let intent = loading ? Intent.NONE : Intent.WARNING;
                    return <SpinnerContainer>
                        <Spinner size={size} intent={intent}/>
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
                this.state.loaded = true;
                return this.props.children({loading, error, data, ...otherProps});
            }}
        </Query>
    }
}

export default LoadingQuery;
