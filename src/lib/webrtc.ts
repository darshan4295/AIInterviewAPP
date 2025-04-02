import { supabase } from './supabase';

interface RTCSignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  from: string;
  to: string;
  role: 'interviewer' | 'candidate';
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private interviewId: string;
  private userId: string;
  private userRole: 'interviewer' | 'candidate';
  private onRemoteStream: (stream: MediaStream | null) => void;
  private onLocalStream: (stream: MediaStream) => void;
  private subscriptions: (() => void)[] = [];
  private isNegotiating = false;
  private pendingCandidates: RTCIceCandidate[] = [];
  private hasRemoteDescription = false;
  private makingOffer = false;

  constructor(
    interviewId: string,
    userId: string,
    userRole: 'interviewer' | 'candidate',
    onLocalStream: (stream: MediaStream) => void,
    onRemoteStream: (stream: MediaStream | null) => void
  ) {
    this.interviewId = interviewId;
    this.userId = userId;
    this.userRole = userRole;
    this.onLocalStream = onLocalStream;
    this.onRemoteStream = onRemoteStream;

    // Create peer connection with improved ICE servers
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan'
    });

    this.setupPeerConnectionListeners();
    this.setupSignalingChannelListener();
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Generated ICE candidate');
        this.sendSignalData({
          type: 'ice-candidate',
          data: event.candidate,
          from: this.userId,
          to: '*',
          role: this.userRole
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'ID:', event.track.id);
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onRemoteStream(this.remoteStream);
      }

      // Always add the track to ensure we get both audio and video
      this.remoteStream.addTrack(event.track);
      console.log('Added track to remote stream:', event.track.kind);
      this.onRemoteStream(this.remoteStream);

      // Handle track ended events
      event.track.onended = () => {
        console.log('Remote track ended:', event.track.kind);
        if (this.remoteStream) {
          this.remoteStream.removeTrack(event.track);
          if (this.remoteStream.getTracks().length === 0) {
            this.onRemoteStream(null);
          } else {
            this.onRemoteStream(this.remoteStream);
          }
        }
      };
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'failed') {
        this.onRemoteStream(null);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'disconnected') {
        this.onRemoteStream(null);
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection.signalingState);
      if (this.peerConnection.signalingState === 'stable') {
        this.isNegotiating = false;
        
        while (this.pendingCandidates.length > 0) {
          const candidate = this.pendingCandidates.shift();
          if (candidate) {
            this.peerConnection.addIceCandidate(candidate).catch(err => {
              console.error('Error adding pending ICE candidate:', err);
            });
          }
        }
      }
    };

    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (this.isNegotiating || this.makingOffer) {
          console.log('Already negotiating, skipping');
          return;
        }

        this.isNegotiating = true;
        this.makingOffer = true;

        console.log('Creating offer as', this.userRole);
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        if (this.peerConnection.signalingState !== 'stable') {
          console.log('Signaling state not stable, aborting offer creation');
          this.makingOffer = false;
          return;
        }

        await this.peerConnection.setLocalDescription(offer);
        console.log('Local description set, sending offer');

        await this.sendSignalData({
          type: 'offer',
          data: this.peerConnection.localDescription,
          from: this.userId,
          to: '*',
          role: this.userRole
        });
      } catch (err) {
        console.error('Error during negotiation:', err);
      } finally {
        this.makingOffer = false;
      }
    };
  }

  private async setupSignalingChannelListener() {
    const subscription = supabase
      .channel(`interview-${this.interviewId}`)
      .on('broadcast', { event: 'signal' }, async (payload) => {
        const signal: RTCSignalData = payload.payload;
        console.log('Received signal:', signal.type, 'from', signal.role);
        
        if (
          (this.userRole === 'interviewer' && signal.role === 'candidate') ||
          (this.userRole === 'candidate' && signal.role === 'interviewer')
        ) {
          await this.handleSignalData(signal);
        }
      })
      .subscribe();

    this.subscriptions.push(() => subscription.unsubscribe());
  }

  private async handleSignalData(signal: RTCSignalData) {
    try {
      const polite = this.userRole === 'candidate';
      
      switch (signal.type) {
        case 'offer':
          {
            console.log('Processing offer in state:', this.peerConnection.signalingState);
            
            const offerCollision = this.makingOffer || 
              this.peerConnection.signalingState !== 'stable';

            const ignoreOffer = !polite && offerCollision;
            if (ignoreOffer) {
              console.log('Ignoring colliding offer as impolite peer');
              return;
            }

            if (offerCollision) {
              console.log('Handling offer collision as polite peer');
              await Promise.all([
                this.peerConnection.setLocalDescription({ type: 'rollback' }),
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
              ]);
            } else {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            }

            this.hasRemoteDescription = true;
            console.log('Remote description set, creating answer');

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            console.log('Local description (answer) set');

            await this.sendSignalData({
              type: 'answer',
              data: this.peerConnection.localDescription,
              from: this.userId,
              to: signal.from,
              role: this.userRole
            });
          }
          break;

        case 'answer':
          if (this.peerConnection.signalingState === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            this.hasRemoteDescription = true;
            this.isNegotiating = false;
            console.log('Remote description (answer) set');
          }
          break;

        case 'ice-candidate':
          try {
            if (this.hasRemoteDescription) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
              console.log('Added ICE candidate');
            } else {
              console.log('Queuing ICE candidate');
              this.pendingCandidates.push(new RTCIceCandidate(signal.data));
            }
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
            if (!this.hasRemoteDescription) {
              this.pendingCandidates.push(new RTCIceCandidate(signal.data));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }

  private async sendSignalData(signal: RTCSignalData) {
    console.log('Sending signal:', signal.type, 'as', this.userRole);
    await supabase.channel(`interview-${this.interviewId}`).send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
  }

  async startCall(stream: MediaStream) {
    try {
      // Ensure all tracks are enabled
      stream.getTracks().forEach(track => {
        console.log(`Local ${track.kind} track:`, track.id, 'enabled:', track.enabled);
        track.enabled = true;
      });

      // Remove any existing tracks
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          console.log('Removing existing track:', sender.track.kind);
          this.peerConnection.removeTrack(sender);
        }
      });

      // Set local stream and notify UI
      this.localStream = stream;
      this.onLocalStream(stream);

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection`);
        this.peerConnection.addTrack(track, stream);
      });

      // If we're the interviewer, we'll wait for negotiation to trigger
      // If we're the candidate, we'll also wait for negotiation
      console.log(`${this.userRole} ready for connection`);
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  cleanup() {
    console.log('Cleaning up WebRTC connection');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection.close();
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.onRemoteStream(null);
  }
}