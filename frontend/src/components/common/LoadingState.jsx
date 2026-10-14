const LoadingState = ({ label = "Loading your idiaMate account..." }) => (
  <main className="state-page" aria-live="polite">
    <div className="state-panel">
      <span className="state-kicker">idiaMate</span>
      <h1>{label}</h1>
    </div>
  </main>
);

export default LoadingState;
