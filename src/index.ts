/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useState, useEffect, useReducer} from 'react';
import DEFAULT_CONFIGURATION from './internal/defaultConfiguration';
import State from './internal/state';
import * as Types from './internal/types';

// Stores the currently used configuration
let _configuration: Types.NetInfoConfiguration = DEFAULT_CONFIGURATION;

// Stores the singleton reference to the state manager
let _state: State | null = null;
const createState = (): State => {
  return new State(_configuration);
};

/**
 * Configures the library with the given configuration. Note that calling this will stop all
 * previously added listeners from being called again. It is best to call this right when your
 * application is started to avoid issues.
 *
 * @param configuration The new configuration to set.
 */
export function configure(
  configuration: Partial<Types.NetInfoConfiguration>,
): void {
  _configuration = {
    ...DEFAULT_CONFIGURATION,
    ...configuration,
  };

  if (_state) {
    _state.tearDown();
    _state = createState();
  }
}

/**
 * Returns a `Promise` that resolves to a `NetInfoState` object.
 *
 * @param [requestedInterface] interface from which to obtain the information
 *
 * @returns A Promise which contains the current connection state.
 */
export function fetch(
  requestedInterface?: string,
): Promise<Types.NetInfoState> {
  if (!_state) {
    _state = createState();
  }
  return _state.latest(requestedInterface);
}

/**
 * Subscribe to connection information. The callback is called with a parameter of type
 * [`NetInfoState`](README.md#netinfostate) whenever the connection state changes. Your listener
 * will be called with the latest information soon after you subscribe and then with any
 * subsequent changes afterwards. You should not assume that the listener is called in the same
 * way across devices or platforms.
 *
 * @param listener The listener which is called when the network state changes.
 *
 * @returns A function which can be called to unsubscribe.
 */
export function addEventListener(
  listener: Types.NetInfoChangeHandler,
): Types.NetInfoSubscription {
  if (!_state) {
    _state = createState();
  }

  _state.add(listener);
  return (): void => {
    _state && _state.remove(listener);
  };
}

/**
 * A React Hook which updates when the connection state changes.
 *
 * @returns The connection state.
 */
export function useNetInfo(
  configuration?: Partial<Types.NetInfoConfiguration>,
): Types.NetInfoState {
  if (configuration) {
    configure(configuration);
  }

  const [netInfo, setNetInfo] = useState<Types.NetInfoState>({
    type: Types.NetInfoStateType.unknown,
    isConnected: false,
    isInternetReachable: false,
    details: null,
  });

  useEffect((): (() => void) => {
    return addEventListener(setNetInfo);
  }, []);

  return netInfo;
}
/**
 * A React Hook which updates when the internet connection state changes.
 *
 * @returns The internet connection state.
 */
export function useInternet(): boolean | undefined {
  const [isInternetReachable, setIsInternetReachable] =
    useReducer((currentState: boolean | undefined, newState: boolean | undefined | null) => {
      if (currentState !== newState) {
        if (newState === false) return false;
        else if (newState === true) return true;
        else return currentState;
      }
    }, undefined);

  useEffect(() => {
    fetch().then((state: NetInfoState) => {
      setIsInternetReachable(state.isInternetReachable)
    });
    return addEventListener((state: NetInfoState) => {
      setIsInternetReachable(state.isInternetReachable)
    });
  }, [isInternetReachable]);

  return isInternetReachable;
}

export * from './internal/types';

export default {
  configure,
  fetch,
  addEventListener,
  useNetInfo,
};
