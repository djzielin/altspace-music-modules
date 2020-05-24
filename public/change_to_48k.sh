for f in *.wav; do sox "$f" -r 48k "${f%.wav}_48k.wav" ; done
