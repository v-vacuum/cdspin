import { SpinningCDCase } from "./components/SpinningCDCase";

function App() {
  const albums = [
    {
      image: "/clairo-v1.jpg",
      name: "Charm",
      artist: "Clairo",
      note: "favourite song may or may not be juna",
    },
    {
      image: "/lamp-v1.jpg",
      name: "Lamp Genso",
      artist: "Lamp",
      note: "mmmmmmm lamppppp",
    },
    {
      image: "/nujabes-v1.jpg",
      name: "Luv(Sic)",
      artist: "Nujabes",
      note: "samurai champloo ost on top !",
    },
    {
      image: "/themarias-v1.jpg",
      name: "Submarine",
      artist: "The Marias",
      note: "went to their concert in 2025 and did not get the navy blue memo :(",
    },
    {
      image: "/menitrust-v1.jpg",
      name: "Equus Caballus",
      artist: "Men I Trust",
      note: "just went to their concert ! too short to see anything sigh",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#fff",
      }}
    >
      <SpinningCDCase
        albums={albums}
        width={200}
        height={180}
        autoSpinSpeed={0.3}
      />
    </div>
  );
}

export default App;
