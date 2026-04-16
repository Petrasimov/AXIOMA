const style = `
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    gap: 20px;
  }

  .loading-dots {
    display: flex;
    gap: 10px;
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    background: var(--accent-bright);
    animation: dot-bounce 1.4s ease-in-out infinite;
  }

  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dot-bounce {
    0%, 80%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    40% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }

  .loading-label {
    color: var(--text-secondary);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
`

export default function LoadingScreen() {
  return (
    <>
      <style>{style}</style>
      <div className="loading-screen">
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <div className="loading-label">Поиск арбитражных возможностей</div>
      </div>
    </>
  )
}
