import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
  onLeave,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  onLeave: () => void;
}) => {
  const [lobby, setLobby] = useState(true);
  const [socket, setSocket] = useState<null | Socket>(null);
  const [peerConnection, setPeerConnection] =
    useState<null | RTCPeerConnection>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const newSocket = io(URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join', { name });
    });

    newSocket.on('start_call', async () => {
      console.log('Starting call');
      setLobby(false);
      const pc = createPeerConnection(newSocket);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        newSocket.emit('offer', { sdp: pc.localDescription });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    });

    newSocket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      console.log('Received offer');
      setLobby(false);
      const pc = createPeerConnection(newSocket);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('answer', { sdp: pc.localDescription });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    newSocket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      console.log('Received answer');
      try {
        await peerConnection?.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    newSocket.on('ice_candidate', async (candidate: RTCIceCandidateInit) => {
      console.log('Received ICE candidate');
      try {
        await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [name]);

  const createPeerConnection = (socket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localAudioTrack) pc.addTrack(localAudioTrack);
    if (localVideoTrack) pc.addTrack(localVideoTrack);

    setPeerConnection(pc);
    return pc;
  };

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
    }
  }, [localVideoTrack]);

  const handleLeave = () => {
    if (socket) {
      socket.disconnect();
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
    }
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h2 className="text-xl font-semibold">
          MeetWave: <span className="font-normal">{name}</span>
        </h2>
      </header>
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        <div className="flex-grow relative">
          {lobby ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
              <p className="text-xl text-gray-600">
                Waiting to connect you to someone...
              </p>
            </div>
          ) : (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
          )}
        </div>
        <div className="w-full md:w-64 h-48 md:h-auto relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
            You
          </div>
        </div>
      </main>
      <footer className="bg-white shadow-sm p-4 flex justify-center">
        <Button
          onClick={handleLeave}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <PhoneOff className="h-4 w-4" />
          Leave Meeting
        </Button>
      </footer>
    </div>
  );
};
