for f in *.wav; do ffmpeg -i "$f" -acodec libvorbis "${f%.wav}.ogg"; done
