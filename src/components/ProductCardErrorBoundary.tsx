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
          className="rounded-2xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-6 text-center text-xs text-[#6B352A]"
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
