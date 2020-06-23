for f in *.aif; do sox "$f" "${f%.aif}.wav"; done

