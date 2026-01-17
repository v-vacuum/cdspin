import { SpinningCDCase } from './components/SpinningCDCase';

function App() {
  const albums = [
    {
      image: '/clairo-v1.jpg',
      name: 'Lily',
      artist: 'Garden State',
      note: 'Reminds me of spring mornings in the countryside',
    },
    {
      image: '/lamp-v1.jpg',
      name: 'Ocean Wave',
      artist: 'Coastal Drift',
      note: 'Best listened to with the windows down on a coastal drive',
    },
    {
      image: '/nujabes-v1.jpg',
      name: 'Sunset Dreams',
      artist: 'Horizon',
      note: 'The perfect soundtrack for watching the sun go down',
    },
    {
      image: '/themarias-v1.jpg',
      name: 'Midnight Jazz',
      artist: 'Blue Note Quartet',
      note: 'Late nights, dim lights, and a glass of wine',
    },
    {
      image: '/menitrust-v1.jpg',
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
