# Script Capture

A teleprompter you can park anywhere on screen while you record closeup video from your webcam.
The script overlay lives on top of the camera preview and is **never** part of the recording.

## Run it

```sh
./serve.sh          # then open http://localhost:8000
```

Camera access requires a secure context, so open it over `http://localhost` (or https).
Opening `index.html` directly as a `file://` page will not get camera permission in most browsers.

## Using it

- **Edit** on the panel's top bar to type or paste your script. It's saved in the browser.
- Drag the panel by its top bar; resize from the bottom-right corner. Park it just under the lens.
- **Scroll** rolls the script; the red reading line marks where your eyes should sit.
- The big red button records. Stop it and the take opens for review and download.

### Shortcuts

| Key | Action |
| --- | --- |
| `R` | start / stop recording |
| `Space` | scroll / pause |
| `[` `]` (or ↑ ↓) | scroll speed |
| `-` `+` | text size |
| `E` | edit script |
| `H` | hide / show the script panel |
| `U` | hide / show the app controls |
| `Esc` | close panels |

## Notes

- Preview is mirrored by default (it feels natural); the recorded file is not mirrored, so text in frame reads correctly.
- Takes are held in memory for the tab only — download the ones you want before reloading.
- Recording format is MP4 where the browser supports it, otherwise WebM.

## Files

- `index.html` — markup
- `styles.css` — styling
- `app.js` — camera, recording, teleprompter, persistence
