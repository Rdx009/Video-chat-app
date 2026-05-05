const socket = io();

let localStream;
let peer;
let partnerId;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// START CAMERA
async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.srcObject = localStream;

    socket.emit("join");
  } catch (err) {
    alert("Camera/mic access denied!");
  }
}

start();

// MATCHED USER
socket.on("matched", (id) => {
  partnerId = id;
  createPeer(true);
});

// CREATE PEER CONNECTION
function createPeer(isInitiator) {
  peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },

      // ✅ TURN SERVER (IMPORTANT)
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  });

  // ADD LOCAL STREAM
  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  // RECEIVE REMOTE VIDEO
  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // SEND ICE CANDIDATES
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice", {
        candidate: event.candidate,
        to: partnerId
      });
    }
  };

  // CREATE OFFER (if initiator)
  if (isInitiator) {
    peer.createOffer()
      .then(offer => {
        return peer.setLocalDescription(offer);
      })
      .then(() => {
        socket.emit("offer", {
          offer: peer.localDescription,
          to: partnerId
        });
      });
  }
}

// RECEIVE OFFER
socket.on("offer", async ({ offer, from }) => {
  partnerId = from;
  createPeer(false);

  await peer.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", {
    answer: peer.localDescription,
    to: from
  });
});

// RECEIVE ANSWER
socket.on("answer", async ({ answer }) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

// RECEIVE ICE
socket.on("ice", async ({ candidate }) => {
  try {
    if (peer) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (e) {
    console.error("ICE error", e);
  }
});

// NEXT USER
function nextUser() {
  if (peer) {
    peer.close();
    peer = null;
  }

  remoteVideo.srcObject = null;
  socket.emit("join");
}
