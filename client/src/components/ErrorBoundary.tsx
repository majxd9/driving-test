import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep production output quiet; the visible fallback handles the failure.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center px-5" role="alert">
        <section className="surface-panel w-full max-w-md p-7 text-center">
          <div className="brand-mark mx-auto mb-4">ر</div>
          <h1 className="text-xl font-black text-ink mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-muted text-sm leading-relaxed">
            لم نستطع عرض هذه الصفحة بشكل صحيح. أعد فتح الموقع للمحاولة مرة أخرى.
          </p>
          <a href="/" className="primary-cta inline-flex w-full mt-5 justify-center">
            إعادة فتح الموقع
          </a>
        </section>
      </main>
    );
  }
}
