import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { Button } from './ui/button';
import { PhoneOff } from 'lucide-react';

const URL = import.meta.env.VITE_API_URL;

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
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null,
  );
  const [remoteVideoTrack, setRemoteVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] =
    useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io(URL);
    socket.on('send-offer', async ({ roomId }) => {
      console.log('sending offer');
      setLobby(false);
      const pc = new RTCPeerConnection();

      setSendingPc(pc);
      if (localVideoTrack) {
        console.error('added track');
        console.log(localVideoTrack);
        pc.addTrack(localVideoTrack);
      }
      if (localAudioTrack) {
        console.error('added track');
        console.log(localAudioTrack);
        pc.addTrack(localAudioTrack);
      }

      pc.onicecandidate = async (e) => {
        console.log('receiving ice candidate locally');
        if (e.candidate) {
          socket.emit('add-ice-candidate', {
            candidate: e.candidate,
            type: 'sender',
            roomId,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        console.log('on negotiation needed, sending offer');
        const sdp = await pc.createOffer();
        await pc.setLocalDescription(sdp);
        socket.emit('offer', {
          sdp,
          roomId,
        });
      };
    });

    socket.on('offer', async ({ roomId, sdp: remoteSdp }) => {
      console.log('received offer');
      setLobby(false);
      const pc = new RTCPeerConnection();
      await pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      await pc.setLocalDescription(sdp);
      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      setRemoteMediaStream(stream);
      setReceivingPc(pc);
      (window as any).pcr = pc;
      pc.ontrack = () => {
        alert('ontrack');
      };

      pc.onicecandidate = async (e) => {
        if (!e.candidate) {
          return;
        }
        console.log('on ice candidate on receiving side');
        if (e.candidate) {
          socket.emit('add-ice-candidate', {
            candidate: e.candidate,
            type: 'receiver',
            roomId,
          });
        }
      };

      socket.emit('answer', {
        roomId,
        sdp: sdp,
      });
      setTimeout(() => {
        const track1 = pc.getTransceivers()[0].receiver.track;
        const track2 = pc.getTransceivers()[1].receiver.track;
        console.log(track1);
        if (track1.kind === 'video') {
          setRemoteAudioTrack(track2);
          setRemoteVideoTrack(track1);
        } else {
          setRemoteAudioTrack(track1);
          setRemoteVideoTrack(track2);
        }
        if (
          remoteVideoRef.current &&
          remoteVideoRef.current.srcObject instanceof MediaStream
        ) {
          remoteVideoRef.current.srcObject.addTrack(track1);
          remoteVideoRef.current.srcObject.addTrack(track2);
          remoteVideoRef.current.play();
        }
      }, 5000);
    });

    socket.on('answer', ({ sdp: remoteSdp }) => {
      setLobby(false);
      setSendingPc((pc) => {
        pc?.setRemoteDescription(remoteSdp);
        return pc;
      });
      console.log('loop closed');
    });

    socket.on('lobby', () => {
      setLobby(true);
    });

    socket.on('add-ice-candidate', ({ candidate, type }) => {
      console.log('add ice candidate from remote');
      console.log({ candidate, type });
      if (type == 'sender') {
        setReceivingPc((pc) => {
          if (!pc) {
            console.error('receiving pc not found');
          } else {
            console.error(pc.ontrack);
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          if (!pc) {
            console.error('sending pc not found');
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });

    setSocket(socket);
  }, [name, localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
      localVideoRef.current.play();
    }
  }, [localVideoRef, localVideoTrack]);

  console.log(
    socket,
    sendingPc,
    receivingPc,
    remoteVideoTrack,
    remoteAudioTrack,
    remoteMediaStream,
  );

  const handleLeave = () => {
    if (socket) {
      socket.disconnect();
      // socket.emit('disconnect', {
      //   socket,
      // });
      if (localAudioTrack) {
        localAudioTrack.stop();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
      onLeave();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h2 className="text-xl font-semibold text-blue-700">
          MeetWave: <span className="font-normal text-black">{name}</span>
        </h2>
      </header>
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        <div className="flex-grow relative h-[80vh]">
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
            className="absolute w-full bottom-2 object-cover rounded-lg"
          />
          <div className="absolute bottom-3 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
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
