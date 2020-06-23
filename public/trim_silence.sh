for f in *.wav; do sox "$f" "${f%.wav}_silence_trimmed.wav" silence 1 1 0.2%; done
