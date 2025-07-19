#!/bin/bash
set -euo pipefail  # Exit on error, undefined variables are errors, pipe failures are errors

# Setup script for Whisper.cpp with optimal settings

echo "Setting up Whisper.cpp for fastest local inference..."

# Check for required tools
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "ERROR: $1 is required but not installed."
        echo "Install it with: $2"
        exit 1
    fi
}

check_command cmake "brew install cmake"
check_command make "xcode-select --install"
check_command git "xcode-select --install"

# Clone whisper.cpp
if [ ! -d "whisper.cpp" ]; then
    echo "Cloning whisper.cpp..."
    git clone https://github.com/ggml-org/whisper.cpp
fi

cd whisper.cpp

# Clean any previous build attempts
if [ -d "build" ]; then
    echo "Cleaning previous build..."
    rm -rf build
fi

# Build with optimizations for current platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - enable Metal acceleration
    echo "Building for macOS with Metal acceleration..."
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DWHISPER_METAL=ON
    
    if [ $? -ne 0 ]; then
        echo "CMake configuration failed. Trying without Metal..."
        rm -rf build
        cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON
    fi
elif command -v nvcc &> /dev/null; then
    # CUDA available
    echo "Building with CUDA acceleration..."
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DWHISPER_CUBLAS=ON
else
    # Default CPU build
    echo "Building for CPU..."
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON
fi

echo "Compiling... (this will take a few minutes)"
cmake --build build -j$(sysctl -n hw.ncpu 2>/dev/null || nproc || echo 4)

# Verify the library was built
if [[ "$OSTYPE" == "darwin"* ]]; then
    EXPECTED_LIB="build/src/libwhisper.dylib"
else
    EXPECTED_LIB="build/src/libwhisper.so"
fi

if [ ! -f "$EXPECTED_LIB" ]; then
    echo "ERROR: Library not found at $EXPECTED_LIB"
    echo "Build may have failed. Check the output above."
    exit 1
fi

echo "Library successfully built at: $(pwd)/$EXPECTED_LIB"

# Download large-v3-turbo model (5x faster than large-v3)
if [ ! -f "models/ggml-large-v3-turbo.bin" ]; then
    echo "Downloading large-v3-turbo model..."
    bash ./models/download-ggml-model.sh large-v3-turbo
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Model download failed"
        exit 1
    fi
fi

# Check if quantize binary exists
if [ ! -f "build/bin/quantize" ]; then
    echo "ERROR: quantize binary not found. Build may have failed."
    exit 1
fi

# Quantize to Q5_0 for best speed/accuracy balance
if [ ! -f "models/ggml-large-v3-turbo-q5_0.bin" ]; then
    echo "Quantizing model to Q5_0..."
    ./build/bin/quantize models/ggml-large-v3-turbo.bin models/ggml-large-v3-turbo-q5_0.bin q5_0
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Model quantization failed"
        exit 1
    fi
fi

echo ""
echo "✅ Whisper.cpp setup complete!"
echo "Library location: $(pwd)/$EXPECTED_LIB"
echo "Model location: $(pwd)/models/ggml-large-v3-turbo-q5_0.bin"
echo ""
echo "You can now run: bun dev"