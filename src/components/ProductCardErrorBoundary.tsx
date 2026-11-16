import React from 'react';

interface ProductCardErrorBoundaryProps {
  children: React.ReactNode;
  productTitle: string;
}

interface ProductCardErrorBoundaryState {
  hasError: boolean;
}

export class ProductCardErrorBoundary extends React.Component<
  ProductCardErrorBoundaryProps,
  ProductCardErrorBoundaryState
> {
  state: ProductCardErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ProductCardErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Product card failed to render', {
      productTitle: this.props.productTitle,
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <article
          className="rounded-2xl border border-amber-200 bg-white px-3 py-6 text-center text-xs text-slate-600"
          role="alert"
          aria-label={`Unable to display ${this.props.productTitle}`}
        >
          This product could not be displayed.
        </article>
      );
    }

    return this.props.children;
  }
}
