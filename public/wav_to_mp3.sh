for f in *.wav; do lame -V 1 "$f" "${f%.wav}.mp3"; done
