# tidal

Tide heights from harmonic constants. A station's water level is its datum plus one cosine
per tidal constituent, each with the amplitude and phase published for that station.

```ts
import { heightAt, nextHighWater } from 'tidal';

heightAt(station, new Date());        // 4.12
nextHighWater(station, new Date());   // { time, label: '14:36 4.87 m' }
```

`stations/example.json` holds illustrative constants for a harbour that does not exist.
Do not navigate by it.
