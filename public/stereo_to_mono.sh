for f in *.wav; do sox "$f" "${f%.wav}_mono.wav" remix 1; done
