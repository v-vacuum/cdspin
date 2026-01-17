import { SpinningCDCase } from './components/SpinningCDCase';

function App() {
  const albums = [
    {
      image: '/image1.jpg',
      name: 'Lily',
      artist: 'Garden State',
      note: 'Reminds me of spring mornings in the countryside',
    },
    {
      image: '/image2.jpg',
      name: 'Ocean Wave',
      artist: 'Coastal Drift',
      note: 'Best listened to with the windows down on a coastal drive',
    },
    {
      image: '/image3.jpg',
      name: 'Sunset Dreams',
      artist: 'Horizon',
      note: 'The perfect soundtrack for watching the sun go down',
    },
    {
      image: '/image4.jpg',
      name: 'Midnight Jazz',
      artist: 'Blue Note Quartet',
      note: 'Late nights, dim lights, and a glass of wine',
    },
    {
      image: '/image5.jpg',
      name: 'Electric Pulse',
      artist: 'Voltage',
      note: 'Gets me through every workout session',
    },
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
