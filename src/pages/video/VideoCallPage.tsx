import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SIGNALING_URL = 'https://starlit-fragrant-devotee.ngrok-free.dev';

type CallStatus = 'connecting' | 'waiting' | 'connected' | 'peer-left' | 'error';

const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [duration, setDuration] = useState(0);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  const statusLabels: Record<CallStatus, string> = {
    connecting: 'Connecting to room...',
    waiting: 'Waiting for the other participant',
    connected: 'Connected',
    'peer-left': 'The other participant left',
    error: 'Could not access camera or microphone',
  };

  useEffect(() => {
    if (callStatus === 'connected') {
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [callStatus]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  useEffect(() => {
    const socket = io(SIGNALING_URL, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
          setCallStatus('connected');
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit('ice-candidate', { roomId, candidate: e.candidate });
        };

        socket.emit('join-room', { roomId });
        setCallStatus('waiting');

        socket.on('peer-joined', async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        });
        socket.on('offer', async ({ offer }: any) => {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        });
        socket.on('answer', async ({ answer }: any) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });
        socket.on('ice-candidate', async ({ candidate }: any) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        });
        socket.on('peer-left', () => {
          setCallStatus('peer-left');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });
      } catch {
        setCallStatus('error');
      }
    };

    start();
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
      socket.disconnect();
    };
  }, [roomId]);

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.emit('leave-room', { roomId });
    socketRef.current?.disconnect();
    navigate(-1);
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter var, Inter, sans-serif',
      color: '#ffffff',
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: callStatus === 'connected' ? '#22c55e' : callStatus === 'error' || callStatus === 'peer-left' ? '#ef4444' : '#f59e0b',
            boxShadow: callStatus === 'connected' ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
          }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
            {statusLabels[callStatus]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {callStatus === 'connected' && (
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatDuration(duration)}
            </span>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.02em',
          }}>
            Room {roomId?.slice(0, 8)}
          </div>
        </div>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>

          {/* Remote video */}
          <div style={{
            position: 'relative',
            background: '#111118',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
          }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            />
            {callStatus !== 'connected' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 500, color: 'rgba(59,130,246,0.9)',
                }}>
                  {callStatus === 'waiting' ? '...' : '?'}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                  {callStatus === 'waiting' ? 'Waiting for participant' : 'No one here'}
                </span>
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '4px 10px',
              fontSize: 12, color: 'rgba(255,255,255,0.8)',
              fontWeight: 500,
            }}>
              Participant
            </div>
          </div>

          {/* Local video */}
          <div style={{
            position: 'relative',
            background: '#111118',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            />
            {!videoEnabled && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: '#111118',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 600, color: 'rgba(59,130,246,0.9)',
                }}>
                  {user?.name ? initials(user.name) : 'ME'}
                </div>
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 2,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '4px 10px',
              fontSize: 12, color: 'rgba(255,255,255,0.8)',
              fontWeight: 500,
            }}>
              {user?.name ?? 'You'} (you)
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingTop: 8,
          paddingBottom: 8,
        }}>
          {/* Mic button */}
          <button
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            style={{
              width: 52, height: 52,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: audioEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.2)',
              color: audioEnabled ? 'rgba(255,255,255,0.9)' : '#ef4444',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
              fontSize: 18,
            }}
          >
            {audioEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>

          {/* Camera button */}
          <button
            onClick={toggleVideo}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            style={{
              width: 52, height: 52,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: videoEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.2)',
              color: videoEnabled ? 'rgba(255,255,255,0.9)' : '#ef4444',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {videoEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>

          {/* End call — prominent red pill */}
          <button
            onClick={endCall}
            title="End call"
            style={{
              height: 52,
              paddingLeft: 28,
              paddingRight: 28,
              borderRadius: 26,
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 500,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 13 19.79 19.79 0 0 1 1.36 4.36 2 2 0 0 1 3.33 2.18 12.84 12.84 0 0 0 4 2.88"/>
              <line x1="23" y1="1" x2="1" y2="23"/>
            </svg>
            End call
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallPage;
