import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Clipboard } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ERROR BOUNDARY] Caught error:', error);
    console.error('[ERROR BOUNDARY] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? 'Unknown error';
      const stack = this.state.error?.stack ?? '';
      const componentStack = this.state.errorInfo?.componentStack ?? '';
      const fullReport = `ERROR: ${message}\n\nSTACK:\n${stack}\n\nCOMPONENT STACK:\n${componentStack}`;

      return (
        <View style={styles.container}>
          <Text style={styles.title}>🚨 App Crashed</Text>
          <Text style={styles.subtitle}>Error details (copy and share for debugging):</Text>
          <ScrollView style={styles.logBox}>
            <Text style={styles.logText} selectable>{fullReport}</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              try { Clipboard.setString(fullReport); } catch {}
            }}
          >
            <Text style={styles.copyBtnText}>📋 Copy Error to Clipboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F141E',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
  },
  logBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logText: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 18,
  },
  copyBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
