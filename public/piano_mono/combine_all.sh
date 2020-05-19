sox -n -r 44100 -c 1 /tmp/silence.wav trim 0.0 5
sox $(for f in *.wav; do echo -n "$f /tmp/silence.wav "; done) output.ogg