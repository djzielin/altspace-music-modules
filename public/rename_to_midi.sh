#!/bin/bash
while read -r midinumber notename; do
	 echo $notename
	 potentialFile=$(ls *$notename*)
	 echo $potentialFile
	 mv $potentialFile $midinumber.ogg
     
done < midi_notes.txt
