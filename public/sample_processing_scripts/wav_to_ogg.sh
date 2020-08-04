for f in *.wav; do oggenc "$f" -o "${f%.wav}.ogg"; done
