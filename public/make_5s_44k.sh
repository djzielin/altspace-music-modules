sox -n -r 44100 -c 2 /tmp/silence_44k.wav trim 0.0 5.0
for f in *.wav; do sox "$f" /tmp/silence_44k.wav "${f%.wav}_5s.wav" trim 0 00:05; done
