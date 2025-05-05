// A class-based implementation of ClientSideOnly that avoids React hooks 
// to prevent "Invalid hook call" errors when multiple React instances exist

import * as React from 'react';

interface ClientSideOnlyProps {
  children: React.ReactNode | null;
}

interface ClientSideOnlyState {
  isClient: boolean;
}

/**
 * A React component wrapper that only renders its contents on the client side.
 * @remarks
 * Works with Next.js or any other SSR framework that do not trigger componentDidMount
 * @public
 */
export class ClientSideOnly extends React.Component<ClientSideOnlyProps, ClientSideOnlyState> {
  constructor(props: ClientSideOnlyProps) {
    super(props);
    // Start with isClient = false
    this.state = { isClient: false };
  }

  componentDidMount() {
    // After mounting (which only happens client-side), set isClient to true
    this.setState({ isClient: true });
  }

  render() {
    // If we're not on the client yet, render an empty div
    if (!this.state.isClient) {
      return React.createElement('div', { suppressHydrationWarning: true });
    }
    
    // Otherwise, render the children
    return React.createElement(
      'div', 
      { suppressHydrationWarning: true },
      this.props.children
    );
  }
}

