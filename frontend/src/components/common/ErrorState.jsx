const ErrorState = ({ message, onRetry }) => (
  <main className="state-page" role="alert">
    <div className="state-panel state-panel-error">
      <span className="state-kicker">Connection issue</span>
      <h1>We could not load your account.</h1>
      <p>{message}</p>
      {onRetry && (
        <button className="primary-button" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  </main>
);

export default ErrorState;
