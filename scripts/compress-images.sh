#!/bin/bash

# Define the target directory
IMAGE_DIR="assets/images"

# Ensure the directory exists
if [ ! -d "$IMAGE_DIR" ]; then
  echo "Error: Directory $IMAGE_DIR does not exist."
  exit 1
fi

# Find all common image files and process them
find "$IMAGE_DIR" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) | while read -r img_path; do
  # Extract file components
  dir_name=$(dirname "$img_path")
  base_name=$(basename "$img_path")
  extension="${base_name##*.}"
  file_no_ext="${base_name%.*}"

  # Define the temporary suffixed path
  sm_path="${dir_name}/${file_no_ext}-sm.${extension}"

  echo "Compressing: $base_name"

  # Run ffmpeg with the requested compression level
  if ffmpeg -i "$img_path" -compression_level 9 -y "$sm_path" -loglevel error; then
    # Delete the old image and remove the "-sm" suffix by moving it back
    rm "$img_path"
    mv "$sm_path" "$img_path"
  else
    echo "Failed to process: $base_name"
  fi
done

echo "Image compression complete."