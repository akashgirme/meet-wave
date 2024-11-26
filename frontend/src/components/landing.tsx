import { useEffect, useRef, useState } from 'react';
import { Room } from './room';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { VideoIcon, MicIcon, Waves } from 'lucide-react';

export const Landing = () => {
  const [name, setName] = useState('');
  const [localAudioTrack, setLocalAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [joined, setJoined] = useState(false);

  const getCam = async () => {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
      if (videoRef.current) {
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      getCam();
    }
  }, [videoRef]);

  const toggleCamera = () => {
    if (localVideoTrack) {
      localVideoTrack.enabled = !localVideoTrack.enabled;
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (localAudioTrack) {
      localAudioTrack.enabled = !localAudioTrack.enabled;
      setIsMicOn(!isMicOn);
    }
  };

  const handleLeave = () => {
    setJoined(false);
    if (localAudioTrack) {
      localAudioTrack.stop();
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
    }
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    getCam(); // Reinitialize camera for the landing page
  };

  if (joined) {
    return (
      <Room
        name={name}
        localAudioTrack={localAudioTrack}
        localVideoTrack={localVideoTrack}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-center space-x-2">
          <Waves className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-blue-700">MeetWave</h1>
        </div>
        <p className="text-center text-gray-600">
          Connect with random people around the world through video chat!
        </p>
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
          <video
            autoPlay
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
          ></video>
          <div className="absolute bottom-2 left-2 flex space-x-2">
            <Button
              size="icon"
              variant={isCameraOn ? 'default' : 'destructive'}
              onClick={toggleCamera}
            >
              <VideoIcon className="h-4 w-4" />
              <span className="sr-only">Toggle camera</span>
            </Button>
            <Button
              size="icon"
              variant={isMicOn ? 'default' : 'destructive'}
              onClick={toggleMic}
            >
              <MicIcon className="h-4 w-4" />
              <span className="sr-only">Toggle microphone</span>
            </Button>
          </div>
        </div>
        <Input
          placeholder="Enter your name"
          type="text"
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => setJoined(true)}
          disabled={!name.trim()}
        >
          Start Chatting
        </Button>
      </Card>
    </div>
  );
};
