for f in *.wav; do mv "$f" "$(echo $f|cut -d_ -f1).wav"; done
