import React from "react";

export const ErrorMessage: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div role="alert" className="error-msg">
    <p>
      <span role="img" aria-label="warning">
        ⚠️
      </span>{" "}
      {message}
    </p>
    {onRetry && <button onClick={onRetry}>Retry</button>}
  </div>
);
