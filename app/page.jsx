"use client";

import React, { useEffect, useRef, useState } from "react";
import "tailwindcss/tailwind.css";

const MusicVisualizer = () => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [visualizerType, setVisualizerType] = useState("waveform");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isStartDisabled, setIsStartDisabled] = useState(false);

  useEffect(() => {
    if (!audioFile) return;

    const startAudio = async () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();

      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.fftSize = 256;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const audioEl = new Audio(URL.createObjectURL(audioFile));
      setAudioElement(audioEl);

      sourceRef.current =
        audioContextRef.current.createMediaElementSource(audioEl);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      const renderFrame = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        switch (visualizerType) {
          case "bars":
            drawBars(ctx, dataArray, WIDTH, HEIGHT);
            break;
          case "barsBothSides":
            drawBarsBothSides(ctx, dataArray, WIDTH, HEIGHT);
            break;
          case "lines":
            drawLines(ctx, dataArray, WIDTH, HEIGHT);
            break;
          case "waveform":
            drawWaveform(ctx, dataArray, WIDTH, HEIGHT);
            break;
          default:
            drawBars(ctx, dataArray, WIDTH, HEIGHT);
        }

        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    };

    startAudio();
  }, [audioFile, visualizerType]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      setSelectedFileName(file.name);
    } else {
      alert("Please upload a valid audio file");
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    const stream = canvas.captureStream();

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp8",
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setIsStartDisabled(true); // Disable the start recording button

    const id = setInterval(() => {
      setRecordingDuration((prevDuration) => {
        const newDuration = prevDuration + 1;
        const widthPercentage = Math.min((newDuration / 25) * 100, 100);
        setTimelineWidth(widthPercentage);
        return newDuration;
      });

      if (recordingDuration >= 25) {
        stopRecording();
      }
    }, 1000); // Update every second
    setIntervalId(id);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    clearInterval(intervalId);
    setIsStartDisabled(false); // Re-enable the start recording button

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "visualizer.webm";
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    setRecordingDuration(0); // Reset the duration
    setTimelineWidth(0); // Reset the timeline
    setRecordedChunks([]); // Reset the chunks
  };

  const cancelRecording = () =>{
    if (mediaRecorder) {
    mediaRecorder.stop();
  }
  setIsRecording(false);
  clearInterval(intervalId);
  setIsStartDisabled(false); // Re-enable the start recording button

 

  setRecordingDuration(0); // Reset the duration
  setTimelineWidth(0); // Reset the timeline
  setRecordedChunks([]); // Reset the chunks
  }
 
  const handleStyleChange = (type) => {
    setVisualizerType(type);
    handlePlayPause();
  };

  return (
    <div className="h-screen flex md:flex-row flex-col items-center justify-center bg-black text-white overflow-hidden">
      <div className="flex flex-col gap-8 md:w-2/5 w-full px-8">
        <h1 className="text-4xl mb-6">Music Visualizer</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="px-4 py-2 border w-40 border-slate-950 bg-slate-900 rounded-lg text-white">
              Choose File
            </button>
          </div>
          {selectedFileName && (
            <span className="text-white truncate">{selectedFileName}</span>
          )}
        </div>

        <button
          onClick={handlePlayPause}
          className="px-6 py-2 bg-blue-500 rounded-full hover:bg-blue-600 transition"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <div className="flex flex-col items-center space-y-4 md:w-3/5 w-full">
        {audioFile && (
          <>
            <div className="flex flex-wrap justify-center items-center space-y-2 space-x-4 md:mt-4 mt-0">
              {["bars", "barsBothSides", "lines", "waveform"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleStyleChange(type)}
                  className={`px-4 py-2 rounded-full ${
                    visualizerType === type
                      ? "bg-purple-900"
                      : "bg-purple-500 "
                  } hover:bg-purple-600 transition`}
                >
                  {type === "bars"
                    ? "Bars"
                    : type === "barsBothSides"
                    ? "Bars (Both Sides)"
                    : type === "lines"
                    ? "Lines"
                    : "Waveform"}
                </button>
              ))}
            </div>

            <canvas
              ref={canvasRef}
              width="800"
              height="450"
              className="border border-gray-600 mt-4"
            ></canvas>

            {isRecording && (
              <div className="w-full bg-gray-800 mt-2 rounded-lg overflow-hidden">
                <div
                  className="bg-green-500 h-2 rounded-lg"
                  style={{
                    width: `${timelineWidth}%`,
                    transition: "width 0.1s linear", // Smoother transition
                  }}
                />
              </div>
            )}

            <div className="mt-4 flex space-x-4">
              <button
                onClick={startRecording}
                className="px-6 py-2 bg-green-500 rounded-full hover:bg-green-600 transition"
                disabled={isStartDisabled} // Disable button during recording
              >
                Start Recording
              </button>
              <button
             
                onClick={recordingDuration > 25 ? stopRecording : cancelRecording}
                className={`px-6 py-2 rounded-full ${
                  recordingDuration >= 25
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-red-500 hover:bg-red-600"
                } transition`}
              >
                {recordingDuration >= 25 ? "Save to Files" : "Cancel Recording"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
// Visualizer Functions
const drawBars = (ctx, dataArray, WIDTH, HEIGHT) => {
  const barWidth = (WIDTH / dataArray.length) * 2.5;
  let x = 0;
  const maxHeight = HEIGHT / 4;
  ctx.lineCap = "round"; // Round the ends of the bars

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = Math.min(dataArray[i] * 0.8, maxHeight);
    const red = barHeight + 25 * (i / dataArray.length);
    const green = 250 * (i / dataArray.length);
    const blue = 50;
    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
};

const drawBarsBothSides = (ctx, dataArray, WIDTH, HEIGHT) => {
  const barWidth = (WIDTH / dataArray.length) * 2.5;
  let x = 0;
  const maxHeight = HEIGHT / 5;
  ctx.lineCap = "round"; // Round the ends of the bars

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = Math.min(dataArray[i] * 0.8, maxHeight);
    const red = barHeight + 25 * (i / dataArray.length);
    const green = 250 * (i / dataArray.length);
    const blue = 50;
    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    ctx.fillRect(x, HEIGHT / 2 - barHeight / 2, barWidth, barHeight); // Center the bars
    x += barWidth + 1;
  }
};

// Line visualizer
const drawLines = (ctx, dataArray, WIDTH, HEIGHT) => {
  let x = 0;
  const sliceWidth = WIDTH / dataArray.length;
  const maxHeight = HEIGHT / 2;
  ctx.beginPath();
  for (let i = 0; i < dataArray.length; i++) {
    const y = Math.min(dataArray[i] * 0.8, maxHeight);
    ctx.lineTo(x, HEIGHT - y);
    x += sliceWidth;
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.strokeStyle = "rgb(0, 150, 255)";
  ctx.stroke();
};

// DNA-style waveform
const drawWaveform = (ctx, dataArray, WIDTH, HEIGHT) => {
  const sliceWidth = WIDTH / dataArray.length;
  let x = 0;
  const maxHeight = HEIGHT / 4;
  ctx.beginPath();

  for (let i = 0; i < dataArray.length; i++) {
    const y = Math.min(dataArray[i] * 0.8, maxHeight);
    const yPos = HEIGHT / 2 + (i % 2 === 0 ? y : -y);
    ctx.lineTo(x, yPos);
    x += sliceWidth;
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.strokeStyle = "rgb(0, 150, 255)";
  ctx.stroke();
};

export default MusicVisualizer;
