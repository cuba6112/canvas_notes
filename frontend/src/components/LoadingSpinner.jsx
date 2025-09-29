const LoadingSpinner = ({ size = 'medium', color = '#4CAF50', overlay = false }) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  }

  const spinnerSize = sizeMap[size] || 24

  const spinnerStyle = {
    width: spinnerSize,
    height: spinnerSize,
    border: `2px solid ${color}20`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(2px)'
  }

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }

  const Spinner = () => (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle}></div>
    </>
  )

  if (overlay) {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <Spinner />
          <span style={{ color: '#666', fontSize: '14px' }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <Spinner />
    </div>
  )
}

export default LoadingSpinner