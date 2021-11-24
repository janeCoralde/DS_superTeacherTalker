var mapPeers = {};
var inputUsername = document.getElementById("username");
var btnJoin = document.getElementById("btn-join");

var username;

function sendSignal(action, message) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });

    webSocket.send(jsonStr);
}

function webSocketOnMessage(e) {
    var parsedData = JSON.parse(e.data);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if (username == peerUsername) {
        return;
    }

    var receiver_channel_name = parsedData['message']['receiver_channel_name'];

    if (action == 'new-peer') {
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }

    if (action == 'new-admin') {
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }

    if (action == 'new-offer') {
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiver_channel_name);
    }

    if (action == 'new-answer') {
        var answer = parsedData['message']['sdp'];
        var peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);
        return;
    }
}

btnJoin.addEventListener('click', () => {
    username = inputUsername.value;

    if (username == '') {
        return;
    }

    inputUsername.value = '';
    inputUsername.disabled = true;
    inputUsername.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    document.getElementById("label-username").innerHTML = username;

    var loc = window.location;
    var wsStart = 'ws://';

    if (loc.protocol == 'https:') {
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname;
    console.log(endPoint);

    webSocket = new WebSocket(endPoint)
    webSocket.addEventListener('open', (e) => {
        console.log("Connection Opened!");
        if (username.split(":")[1] == "9876") {
            sendSignal('new-admin', {});
            return;
        }
        sendSignal('new-peer', {});
    });
    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e) => {
        console.log("Connection Closed!");
    });
    webSocket.addEventListener('error', (e) => {
        console.log("Error occurred!");
    });
});

var localStream = new MediaStream();

const localVideo = document.getElementById("local-video");

const constraints = {
    'video': true,
    'audio': true,
};

const btnToggleAudio = document.getElementById("btn-toggle-audio");
const btnToggleVideo = document.getElementById("btn-toggle-video");

var userMedia = navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    localStream = stream;
    localVideo.srcObject = localStream;
    localVideo.muted = true;

    var audioTracks = stream.getAudioTracks();
    var videoTracks = stream.getVideoTracks();
    audioTracks[0].enabled = true;
    videoTracks[0].enabled = true;

    btnToggleAudio.addEventListener('click', () => {
        audioTracks[0].enabled = !audioTracks[0].enabled;

        if (audioTracks[0].enabled) {
            btnToggleAudio.innerHTML = 'Audio Mute';
            return;
        }
        btnToggleAudio.innerHTML = 'Audio Unmute';
    });
    btnToggleVideo.addEventListener('click', () => {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        if (videoTracks[0].enabled) {
            btnToggleVideo.innerHTML = 'Video Off';
            return;
        }
        btnToggleVideo.innerHTML = 'Video On';
    });
}).catch((error) => {
    console.log("error accessing hardware...", error);
});

var btnSendMsg = document.getElementById('btn-send-msg');
var messageList = document.getElementById('message-list');
var messageInput = document.getElementById('msg');

btnSendMsg.addEventListener('click', sendMsgOnClick);

function sendMsgOnClick() {
    var message = messageInput.value;
    var li = document.createElement('LI');
    li.appendChild(document.createTextNode('Me: ' + message));
    messageList.append(li);

    var dataChannels = getDataChannels();
    message = username + ': ' + message;

    for (let index in dataChannels) {
        dataChannels[index].send(message);
    }

    messageInput.value = '';
}

function createOfferer(peerUsername, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);
    addLocalTracks(peer);

    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection opened!');
    });
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        console.log("Made it to state change");
        var iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];

            if (iceConnectionState != 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log("new ice candidate: ", JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });
    });

    peer.createOffer().then((o) => {
        peer.setLocalDescription(o);
        console.log("Local description set successfully");
    })
}

function createAnswerer(offer, peerUsername, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);
    addLocalTracks(peer);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', (e) => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection opened!');
        });
        peer.dc.addEventListener('message', dcOnMessage);
        mapPeers[peerUsername] = [peer, peer.dc];
    });

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];

            if (iceConnectionState != 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log("new ice candidate: ", JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });
    });

    peer.setRemoteDescription(offer).then(() => {
        console.log("Remote description set successfully for %s.", peerUsername);
        return peer.createAnswer();
    }).then((answer) => {
        console.log("answer created", answer);

        peer.setLocalDescription(answer);
    })
}

function addLocalTracks(peer) {
    localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
    });

    return;
}

function dcOnMessage(event) {
    var message = event.data;

    var li = document.createElement('LI');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername) {
    var videoContainer = document.getElementById("video-container");
    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');
    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);
    return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video) {
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels() {
    var dataChannels = [];

    for (peerUsername in mapPeers) {
        var dataChannel = mapPeers[peerUsername][1];
        dataChannels.push(dataChannel);
    }

    return dataChannels;
}
