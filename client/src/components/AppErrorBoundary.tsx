import { Component, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Keep production UI quiet; the user receives the recovery action below.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center px-5 py-10" dir="rtl">
        <section className="surface-panel w-full max-w-md p-7 text-center">
          <div className="brand-mark mx-auto mb-4">ر</div>
          <h1 className="text-xl font-black text-ink">حدث خطأ غير متوقع</h1>
          <p className="text-muted text-sm leading-relaxed mt-2">
            تعذر عرض هذه الصفحة حالياً. يمكنك إعادة تحميلها والمحاولة من جديد.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="primary-cta mt-5 w-full">
            إعادة تحميل الصفحة
          </button>
        </section>
      </main>
    );
  }
}
