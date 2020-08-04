sox -n -r 48000 -c 2 /tmp/silence.wav trim 0.0 5.0
for f in *.wav; do sox "$f" /tmp/silence.wav "${f%.wav}_5s.wav" trim 0 00:05; done
