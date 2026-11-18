const LoadingState = ({ label = "Loading your idiaMate account..." }) => (
  <main className="state-page" aria-live="polite">
    <div className="state-panel">
      <span className="state-kicker">idiaMate</span>
      <h1 className="loading-label">{label}</h1>
      <div className="skeleton-stack" aria-hidden="true">
        <span className="skeleton skeleton-wide" />
        <span className="skeleton skeleton-medium" />
        <span className="skeleton skeleton-short" />
      </div>
    </div>
  </main>
);

export default LoadingState;
