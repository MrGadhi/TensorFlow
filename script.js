const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const saveButton = document.getElementById('saveButton');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let model;
let combinedCanvas;
let combinedCtx;
let chunks = [];
let mediaRecorder;

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will 
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
        return;
    }
    
    // Hide the button once clicked.
    event.target.classList.add('removed');  
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}

// Pretend model has loaded so we can try out the webcam code.
demosSection.classList.remove('invisible');

// Store the resulting model in the global scope of our app.
model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment 
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.
cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    // Show demo section now model is ready to use.
    demosSection.classList.remove('invisible');
    
    // Initialize combined canvas after the model is loaded
    combinedCanvas = document.createElement('canvas');
    combinedCtx = combinedCanvas.getContext('2d');
    combinedCanvas.width = video.width;
    combinedCanvas.height = video.height;
    liveView.appendChild(combinedCanvas);
});

function predictWebcam() {
    // Now let's start classifying a frame in the stream.
    model.detect(video).then(function (predictions) {
        // Draw video frame
        combinedCtx.drawImage(video, 0, 0, combinedCanvas.width, combinedCanvas.height);

        // Draw bounding boxes and labels on the combined canvas
        for (let n = 0; n < predictions.length; n++) {
            if (predictions[n].score > 0.66) {
                const bbox = predictions[n].bbox;
                // Draw bounding box
                combinedCtx.beginPath();
                combinedCtx.rect(bbox[0], bbox[1], bbox[2], bbox[3]);
                combinedCtx.lineWidth = 2;
                combinedCtx.strokeStyle = 'green';
                combinedCtx.stroke();
                combinedCtx.closePath();
                // Draw label
                combinedCtx.fillText(
                    predictions[n].class + ' - ' + Math.round(predictions[n].score * 100) + '%',
                    bbox[0],
                    bbox[1] > 10 ? bbox[1] - 5 : 10
                );
            }
        }

        // Call this function again to keep predicting when the browser is ready.
        window.requestAnimationFrame(predictWebcam);
    });
}

// Recording functions
startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
saveButton.addEventListener('click', saveRecording);

function startRecording() {
    chunks = [];
    const stream = combinedCanvas.captureStream();
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

function saveRecording() {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = 'recorded_video.webm';
    a.click();
    window.URL.revokeObjectURL(url);
}