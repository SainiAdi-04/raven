# Raven

A terminal-native YouTube playback interface focused on distraction-free search and direct media rendering.

## Language

**Search Query**:
A natural-language text string supplied by the user to find YouTube content.
_Avoid_: Search term, keyword, prompt

**Search Result**:
A candidate YouTube video entry discovered for a query, presented with summary metadata.
_Avoid_: Video item, search hit, listing

**Picker**:
The interactive terminal fuzzy-selection interface presented to the user to choose a single result.
_Avoid_: Selector, menu, chooser

**Media Stream**:
The playable audiovisual or audio-only target location handed off for playback.
_Avoid_: Video link, stream URL, raw stream

**Player**:
The external media player responsible for decoding and rendering the media stream.
_Avoid_: Video player, media viewer, engine

**Maester**:
The diagnostic verification subsystem that checks the host environment for required external tooling.
_Avoid_: Health check, doctor, validator

**Playback Mode**:
The media output profile selected for rendering, either Audiovisual Mode or Audio Mode.
_Avoid_: Stream format, media mode, playback style

**Audio Mode**:
A Playback Mode where video stream decoding and window rendering are suppressed in favor of audio output.
_Avoid_: Music mode, sound-only, headless

**Audiovisual Mode**:
The default Playback Mode rendering synchronized video display and audio output.
_Avoid_: Video mode, standard playback, default mode

**Direct Target**:
A specific YouTube watch URL or video identifier supplied by the user to trigger immediate playback without search or selection.
_Avoid_: Direct link, URL input, raw video ID
