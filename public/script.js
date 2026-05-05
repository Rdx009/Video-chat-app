const socket = io();

let localStream;
let peer;
let partnerId;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;

  socket.emit("join");
}

start();

socket.on("matched", (id) => {
  partnerId = id;
  createPeer(true);
});

function createPeer(isInitiator) {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { candidate: e.candidate, to: partnerId });
    }
  };

  if (isInitiator) {
    peer.createOffer().then(offer => {
      peer.setLocalDescription(offer);
      socket.emit("offer", { offer, to: partnerId });
    });
  }
}

socket.on("offer", async ({ offer, from }) => {
  partnerId = from;
  createPeer(false);

  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { answer, to: from });
});

socket.on("answer", async ({ answer }) => {
  await peer.setRemoteDescription(answer);
});

socket.on("ice", async ({ candidate }) => {
  if (peer) await peer.addIceCandidate(candidate);
});

function nextUser() {
  if (peer) {
    peer.close();
    peer = null;
  }
  remoteVideo.srcObject = null;
  socket.emit("join");
}
