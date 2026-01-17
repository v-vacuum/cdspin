import { SpinningCDCase } from './components/SpinningCDCase';

function App() {
  const albums = [
    { image: '/image1.jpg', name: 'Lily' },
    { image: '/image2.jpg', name: 'Ocean Wave' },
    { image: '/image3.jpg', name: 'Sunset Dreams' },
    { image: '/image4.jpg', name: 'Midnight Jazz' },
    { image: '/image5.jpg', name: 'Electric Pulse' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#fff',
      }}
    >
      <SpinningCDCase albums={albums} width={200} height={180} autoSpinSpeed={0.3} />
    </div>
  );
}

export default App;
