import React from 'react';

const errorResponse = {
  code: "rate-limited",
  message: "You have hit the rate limit. Please upgrade to keep chatting.",
  providerLimitHit: false,
  isRetryable: true
};

const PublicProjects = () => {
  return (
    <div>
      <h1>Mensagem de Erro</h1>
      <p>{errorResponse.message}</p>
    </div>
  );
};

export default PublicProjects;
