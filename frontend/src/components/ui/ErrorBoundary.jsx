import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AIMDS ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '360px',
            padding: '32px 24px',
            margin: '24px auto',
            maxWidth: '620px',
            background: 'var(--surface, #131923)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={24} strokeWidth={2} />
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-strong, #f1f5f9)',
              margin: '0 0 8px',
            }}
          >
            View Encountered an Unexpected Error
          </h3>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted, #94a3b8)',
              margin: '0 0 20px',
              maxWidth: '480px',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || 'An error occurred while rendering this component.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              Try Again
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={this.handleReload}
            >
              Reload Page
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={this.handleHome}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Home size={14} />
              Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
