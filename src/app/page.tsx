export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c8ff00', boxShadow: '0 0 10px #c8ff00' }} />
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#c8ff00', letterSpacing: '0.15em' }}>
        CONTEXTLAYER
      </span>
    </div>
  )
}
