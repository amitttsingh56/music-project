# Bus Wali Playlist v3

Deploy-ready static website for GitHub Pages.

## Modes

90s:
`PLMRKdK25AuPVjHl9Kdb-gkBy0Cm7Zi2xo`

New:
`PLO7-VO1D0_6MnOoKQGmYNY2OoCOP3GRfm`

Bhojpuri:
`PLczcjlYw3G_-x_-e3HhXWuB72811jN2zh`

## Important implementation details

This version:
- keeps the supplied playlist IDs unchanged;
- does not use a negative/off-screen YouTube iframe position;
- uses a normal YouTube IFrame API player container;
- destroys the old player before switching modes;
- uses a generation token so stale callbacks cannot control the new mode;
- does not autoplay on initial page load;
- starts playback only after the user clicks a mode;
- includes custom play/pause/previous/next controls;
- has no backend, API key, database, npm install, or build step.

## GitHub Pages

Replace the existing `index.html`, `style.css`, and `app.js` in the repository root. No Pages settings need to change.

## YouTube limitations

YouTube can still refuse individual videos or playlists because of embedding restrictions, private/unavailable videos, age restrictions, regional restrictions, or other YouTube policies. The website cannot override those restrictions.
