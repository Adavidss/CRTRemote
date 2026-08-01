# Simulation mode

There is no Raspberry Pi yet, and this application is useful without one.
Simulation is the default: a fresh install has nothing to talk to, and opening
onto a connection error would be a poor first impression of something that works
perfectly well on its own.

## What it is

`src/services/simulator/SimulatedHost.ts` is a CRTHost that does not exist. It
speaks the real protocol over a real `LoopbackTransport`, and from the
application's point of view it is indistinguishable from the article: same
handshake, same patches, same acknowledgements, same confirmation flow, same
preview frames. Nothing in the UI knows which one it is talking to.

It is a simulation of a *host*, not of a pet. The rule that the phone owns no
simulation still holds — turn the simulator off and none of this code runs.

## Why not stub the store

Stubbing the state would let the screens be drawn. It would not tell you whether
the system works. Going through the real path means:

- A command the real host would refuse is refused here too, with the same
  message. Feeding a pet that is not hungry says so.
- A display-mode switch still has to be confirmed, through the same
  request/answer pair.
- Turning previews off genuinely stops the frames.
- Latency is real — the loopback adds about 24 ms on purpose — so a control that
  assumed instant round trips looks wrong here rather than in production.

## Preview frames are real

`previewPainter.ts` renders a 320×240 screen through the same eight-level ramp
and the same palette ids the host uses, then hands over a PNG data URL exactly
as the host would. It draws a different screen per application: the launcher
grid, a clock, the pet with its meters, the games library, a starfield, a
dithered photograph, colour bars, a spectrum, a forecast.

It is a different implementation from CRTHost's renderer and does not try to
match it pixel for pixel. It matches it *in kind*, which is what the phone's UI
needs to be designed against — a grey rectangle labelled "preview" would tell
you nothing about whether the layout around it is right.

## Differences from the real thing

- The pet clock runs about forty times faster, so an evening with the simulator
  shows the meters actually moving.
- Button presses are acknowledged but move nothing, since there is no renderer
  with a cursor in it.
- The game library is the same catalogue placeholders CRTHost ships, unavailable
  for the same stated reason. Only the built-in game is playable, and "playing"
  it only changes state.
- Weather is fixed sample data.

## Switching

Settings → Connection → Simulator / WebSocket / HTTP. Changing it reconnects;
`applyConnection` tears down the simulator and builds the real transport.

## What it does not prove

- Anything about the CRT's real appearance, frame rate, or the tube.
- Wi-Fi behaviour: dropouts, roaming, half-open sockets.
- Whether your relay address is right.
