import { useEffect, useRef, useState } from "react"
import { Room } from "./Room";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        // MediaStream
        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (!videoRef.current) {
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack])
        videoRef.current.play();
        // MediaStream
    }

    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam()
        }
    }, [videoRef]);

    if (!joined) {
            
        return (
        <div className="">
        <div className="grid gap-3 justify-center items-center">
            <div><video autoPlay ref={videoRef}></video></div>        
            <div> <Input placeholder="Enter your name" className="w-[200px]" type="text" onChange={(e) => {
                setName(e.target.value);
            }}>
            </Input></div>
           <div>  <Button onClick={() => {
                setJoined(true);
            }}>Join</Button></div> 
        </div>
        </div>
        )
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />
}