for f in *.wav; do fconvolver /usr/share/jconvolver/config-files/demo-reverbs/chapel.conf "$f" "${f%.wav}_chapel.wav" ; done
