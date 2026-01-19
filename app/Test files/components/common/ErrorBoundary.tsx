import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In a production app, you would log this to an error-reporting service
    console.error("Uncaught error caught by Error Boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong.</Text>
          <Text style={styles.subtitle}>The application has encountered an unexpected error.</Text>
          {__DEV__ && this.state.error && (
             <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            </View>
          )}
          <Button title="Try Again" onPress={() => this.setState({ hasError: false, error: null })} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
});

export default ErrorBoundary;
