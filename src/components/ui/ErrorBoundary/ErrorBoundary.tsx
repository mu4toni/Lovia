import React from 'react';
import { captureException } from '@/lib/posthog';
import { Mascot } from '../Mascot/Mascot';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    captureException(error, {
      component_stack: errorInfo.componentStack,
    });
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen" role="alert">
          <div className="error-boundary-card sketch-card">
            <Mascot name="20_error_dizzy" size={114} eager />
            <h1 className="error-boundary-title font-handwritten">Упс, Бин немного закружился</h1>
            <p className="error-boundary-desc">
              Произошла непредвиденная ошибка при отображении экрана. Попробуйте обновить приложение.
            </p>
            <button
              type="button"
              className="btn btn--primary sketch-pill error-boundary-btn"
              onClick={this.handleReload}
            >
              Обновить приложение
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
