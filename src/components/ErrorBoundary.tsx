import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div
                    role="alert"
                    aria-live="assertive"
                    style={{
                    padding: '20px',
                    color: '#ef4444',
                    background: '#1a1a1a',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>কিছু একটা সমস্যা হয়েছে!</h1>
                    <pre style={{
                        background: '#000',
                        padding: '15px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        maxWidth: '800px',
                        color: '#ff8888'
                    }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        পেজ রিলোড করুন
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
