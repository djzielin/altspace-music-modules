#for f in *.ogg; do mv "$f" "$(echo $f|cut -d_ -f1).ogg"; done
for f in *.ogg; do mv  "$f" "${f%.stereo.ogg}.ogg"; done

