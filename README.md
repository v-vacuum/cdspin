# cardspin

an interactive 3d cd jewel case portfolio featuring spinning albums with hover animations and custom shader effects.

## features

- **3d cd case rendering** - fully rendered cd jewel case using three.js with realistic lighting
- **interactive album browsing** - drag to spin, click to open, hover for animations
- **custom cd shader** - glsl shaders for realistic iridescent cd surface with groove patterns
- **smooth animations** - auto-rotation, momentum-based dragging, case opening mechanics
- **album metadata** - display album name, artist, and personal notes
- **audio feedback** - procedurally generated click sounds for interactions

## tech stack

- react 18
- three.js (3d rendering)
- typescript
- vite
- glsl (custom shaders)

## setup

```bash
npm install
npm run dev
```

## scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run preview` - preview production build
- `npm run lint` - run eslint

## adding albums

edit the `albums` array in `src/App.tsx`:

```typescript
const albums: Album[] = [
  {
    image: '/your-album-art.jpg',
    name: 'album name',
    artist: 'artist name',
    note: 'personal note about the album'
  },
  // add more albums...
];
```

place album artwork in the `public/` directory.

## how it works

### 3d model
the cd case uses a custom `.glb` model (`cd_jewelcase_double.glb`) with the following structure:
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

### lighting setup

multiple directional lights positioned for optimal cd reflection:
- main light (front-right)
- back, front, side, rim, and top lights
- ambient light for base illumination
- point light for highlights
- aces filmic tone mapping

## customization

adjust component props in `src/App.tsx`:

```typescript
<SpinningCDCase
  albums={albums}
  width={200}           // canvas width
  height={180}          // canvas height
  sensitivity={0.5}     // drag sensitivity
  autoSpinSpeed={0.3}   // auto-rotation speed
  tilt={8}              // case tilt angle (degrees)
/>
```

## component architecture

```
App.tsx
└── SpinningCDCase.tsx
    ├── three.js scene setup
    ├── gltf model loading
    ├── texture management
    ├── pointer event handling
    ├── animation loop
    └── custom shader materials
```

## browser support

requires webgl 2.0 support. works on all modern browsers.
