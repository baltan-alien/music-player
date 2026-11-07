NEON PIANO PWA - prototype

Contents
- index.html: screen structure
- style.css: responsive layout and neon touch states
- app.js: note mapping, chord selection, transposition, Web Audio synthesis
- manifest.webmanifest: installable PWA metadata
- sw.js: offline cache

How to run on Android
1. Extract this ZIP on a computer or Android device.
2. Upload the folder contents to an HTTPS static host (GitHub Pages is suitable).
3. Open the published HTTPS address in Chrome on Android.
4. Tap Chrome menu > Add to Home screen / Install app.
5. Launch from the home screen and tap any note once to unlock audio.

Important prototype notes
- This is a first playable implementation, not a finished commercial piano sound engine.
- The sound is synthesized additively with inharmonic partials, a short hammer-like transient, decay and release, plus a lightweight synthetic reverb.
- It is not a multisampled concert-grand piano recording. For substantially more realistic timbre, replace the oscillator engine with velocity-layered piano samples (SFZ/SoundFont or custom WAV samples) while keeping the UI and note/chord controller.
- The wheel uses seven natural-note sectors per octave (C, D, E, F, G, A, B), matching the supplied drawing. Semitone transposition updates pitches and labels.
- "7" and "M7♭7" are currently mapped to the same dominant-seventh voicing. The label M7♭7 is interpreted literally as a major triad with a flattened seventh.
- Slash mode: first selected note becomes the bass note one octave lower; next note tap plays the slash chord. This behavior can be refined to a separate bass selection gesture.
- Add7 and tension buttons are currently momentary controls. Add7 maps to a dominant seventh; 9/11/13 add the corresponding chord extension.
- Browser audio performance varies by device. For a production version, test latency, simultaneous touches and audio behavior on the target Android phone.
