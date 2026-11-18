import { AlertTriangle } from "lucide-react";

const ErrorState = ({ message, onRetry }) => (
  <main className="state-page" role="alert">
    <div className="state-panel state-panel-error">
      <div className="state-icon state-icon-error"><AlertTriangle size={20} /></div>
      <span className="state-kicker">Something went wrong</span>
      <h1>We could not load this view.</h1>
      <p>{message}</p>
      {onRetry && (
        <button className="button button-primary button-md" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  </main>
);

export default ErrorState;
