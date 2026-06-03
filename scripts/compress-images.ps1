$IMAGE_DIR = "assets/images"

if (-not (Test-Path $IMAGE_DIR)) {
    Write-Host "Error: Directory $IMAGE_DIR does not exist." -ForegroundColor Red
    exit 1
}

# Find common image files and process them
Get-ChildItem -Path $IMAGE_DIR -File | Where-Object { $_.Extension -match "^\.(png|jpg|jpeg|webp)$" } | ForEach-Object {
    $img_path = $_.FullName
    $dir_name = $_.DirectoryName
    $base_name = $_.Name
    $extension = $_.Extension
    $file_no_ext = $_.BaseName

    # Define the temporary path
    $sm_path = Join-Path $dir_name "$($file_no_ext)-sm$($extension)"

    Write-Host "Compressing: $base_name"

    # Run ffmpeg with the requested compression level
    & ffmpeg -i "$img_path" -compression_level 9 -y "$sm_path" -loglevel error

    if ($LASTEXITCODE -eq 0) {
        # Delete the old image and replace it with the compressed one
        Remove-Item -Path "$img_path"
        Move-Item -Path "$sm_path" -Destination "$img_path"
    } else {
        Write-Host "Failed to process: $base_name" -ForegroundColor Yellow
    }
}

Write-Host "Image compression complete."