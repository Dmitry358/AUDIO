const callButton = document.getElementById("callButton");
const statusDiv = document.getElementById("status");
const remoteAudio = document.getElementById("remoteAudio");

let pc;
let ws;
let pendingCandidates = [];

callButton.addEventListener("click", async () => {
  // Блокируем кнопку и меняем цвет
  callButton.disabled = true;
  callButton.style.backgroundColor = "red";
  callButton.textContent = "";
  statusDiv.textContent = "Идет соединение...";

  // Создаем RTCPeerConnection с ICE серверами (STUN + TURN)
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:mitiok.ddns.net:3478",
        username: "demouser",
        credential: "demopassword"
      }
    ]
  });

  pc.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc.iceConnectionState);
    statusDiv.textContent = "ICE connection state: " + pc.iceConnectionState;
  };

  pc.onicegatheringstatechange = () => {
    console.log("ICE gathering state:", pc.iceGatheringState);
  };

  pc.onconnectionstatechange = () => {
    console.log("Peer connection state:", pc.connectionState);
  };

  // Подключаем микрофон
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  } 
  catch (err) {
    callButton.disabled = false;
    callButton.style.backgroundColor = "#2ecc71";
    callButton.textContent = "Позвонить";
    statusDiv.textContent = "Ошибка доступа к микрофону " + err;
    //statusDiv.style.backgroundColor = "red";
    return;
  }

  // Получение удаленного аудио
  pc.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
    statusDiv.textContent = "Соединение установлено";
  };

  // ICE кандидаты
  pc.onicecandidate = event => {
    if (!event.candidate) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ candidate: event.candidate }));
    } 
    else {
      pendingCandidates.push(event.candidate);
    }
  };

  // Подключение к WebSocket сигнализации
  ws = new WebSocket(`wss://${location.host}/audio/ws`);

  ws.onopen = () => {
    console.log("WebSocket открыт");
  };

  ws.onmessage = async (msg) => {
    const data = JSON.parse(msg.data);

    if (data.sdp) {
      await pc.setRemoteDescription(data.sdp);
      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ sdp: pc.localDescription }));
      }
    }

    if (data.candidate) {
      await pc.addIceCandidate(data.candidate);
    }
  };

  // Создаем оффер и отправляем
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ sdp: pc.localDescription }));
  });
});
