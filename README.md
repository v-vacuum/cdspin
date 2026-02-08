# spinning-cd-case

an interactive 3d cd jewel case react component featuring spinning albums with hover animations and custom shader effects.

[![npm version](https://img.shields.io/npm/v/spinning-cd-case)](https://www.npmjs.com/package/spinning-cd-case)


https://github.com/user-attachments/assets/a602c3c4-b782-4f90-aa3c-a69e0d641929



## features

- **3d cd case rendering** - fully rendered cd jewel case using three.js with realistic lighting
- **interactive album browsing** - drag to spin, click to open, hover for animations
- **custom cd shader** - glsl shaders for realistic iridescent cd surface with groove patterns
- **smooth animations** - auto-rotation, momentum-based dragging, case opening mechanics
- **album metadata** - display album name, artist, year, genre, and personal notes
- **audio feedback** - procedurally generated click sounds for interactions

## install

```bash
npm install spinning-cd-case
```

peer dependencies: `react`, `react-dom`, and `three` (must be installed in your project).

## usage

```typescript
import { SpinningCDCase, Album } from 'spinning-cd-case';

const albums: Album[] = [
  {
    image: '/your-album-art.jpg',
    name: 'album name',
    artist: 'artist name',
    year: 2024,
    genre: 'genre',
    note: 'personal note about the album'
  },
];

function App() {
  return (
    <SpinningCDCase
      albums={albums}
      width={200}           // canvas width
      height={180}          // canvas height
      sensitivity={0.5}     // drag sensitivity
      autoSpinSpeed={0.8}   // auto-rotation speed
      tilt={8}              // case tilt angle (degrees)
    />
  );
}
```

## props

| prop | type | default | description |
|------|------|---------|-------------|
| `albums` | `Album[]` | required | array of albums to display |
| `width` | `number` | `200` | canvas width in pixels |
| `height` | `number` | `180` | canvas height in pixels |
| `sensitivity` | `number` | `0.5` | drag sensitivity |
| `autoSpinSpeed` | `number` | `0.8` | auto-rotation speed |
| `tilt` | `number` | `8` | case tilt angle in degrees |

### `Album` type

```typescript
interface Album {
  image: string;
  name: string;
  artist?: string;
  year?: string | number;
  genre?: string;
  note?: string;
}
```

## how it works

### 3d model
the cd case uses a custom `.glb` model with the following structure:
- case base
- lid that opens
- cd disc with custom shader material

### interaction states

1. **idle** - auto-rotating slowly
2. **hover** - straightens, opens slightly (ajar), tilts toward camera
3. **drag** - manual rotation with momentum
4. **open** - lid rotates to reveal album details
5. **navigate** - smoothly transitions between albums

### shader effects

custom glsl shaders create the cd iridescence effect:
- fresnel-based reflection
- hsv rainbow color shifting
- concentric circular grooves with varying thickness
- viewing angle-dependent coloring

## local development

```bash
npm install
npm run dev
```

### scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run build:lib` - build the library for npm
- `npm run preview` - preview production build
- `npm run lint` - run eslint

## browser support

requires webgl 2.0 support. works on all modern browsers.
