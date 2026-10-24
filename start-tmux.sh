#!/bin/bash

sessionName="nea"

tmux has-session -t $sessionName

if [ $? -eq 0 ]; then
  echo "Attaching to existing session \"$sessionName\"."
  tmux attach -t $sessionName
else
  echo "Creating and attaching to \"$sessionName\"."
  tmux new-session -ds $sessionName -n "nvim" "nvim"
  tmux new-window -dn bash "bash" 
  tmux new-window -dn server "npm run serverstart" 
  tmux new-window -dn testing "npm run watch"
  tmux attach -t $sessionName
fi
