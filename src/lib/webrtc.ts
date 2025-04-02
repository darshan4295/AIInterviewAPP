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

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.setupPeerConnectionListeners();
    this.setupSignalingChannelListener();
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
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
      console.log('Received remote track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      // Only add the track if it's not already in the stream
      const trackExists = this.remoteStream.getTracks().some(
        track => track.id === event.track.id
      );
      
      if (!trackExists) {
        this.remoteStream.addTrack(event.track);
      }
      
      this.onRemoteStream(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'disconnected' || 
          this.peerConnection.connectionState === 'failed') {
        this.onRemoteStream(null);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection.signalingState);
      if (this.peerConnection.signalingState === 'stable') {
        this.isNegotiating = false;
        // Process any pending candidates
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
        if (this.isNegotiating || this.userRole !== 'interviewer') {
          console.log('Skipping negotiation - already in progress or not interviewer');
          return;
        }

        this.isNegotiating = true;
        console.log('Creating offer');

        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        if (this.peerConnection.signalingState !== 'stable') {
          console.log('Signaling state is not stable, waiting...');
          return;
        }

        await this.peerConnection.setLocalDescription(offer);
        console.log('Local description set');

        await this.sendSignalData({
          type: 'offer',
          data: this.peerConnection.localDescription,
          from: this.userId,
          to: '*',
          role: this.userRole
        });
      } catch (err) {
        console.error('Error during negotiation:', err);
        this.isNegotiating = false;
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
      switch (signal.type) {
        case 'offer':
          console.log('Processing offer in state:', this.peerConnection.signalingState);
          if (this.peerConnection.signalingState !== 'stable') {
            await Promise.all([
              this.peerConnection.setLocalDescription({ type: 'rollback' }),
              this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
            ]);
          } else {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          }
          
          this.hasRemoteDescription = true;
          console.log('Remote description set (offer)');

          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('Local description set (answer)');

          await this.sendSignalData({
            type: 'answer',
            data: this.peerConnection.localDescription,
            from: this.userId,
            to: signal.from,
            role: this.userRole
          });
          break;

        case 'answer':
          if (!this.peerConnection.currentRemoteDescription) {
            console.log('Setting remote description (answer)');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            this.hasRemoteDescription = true;
          }
          break;

        case 'ice-candidate':
          if (this.hasRemoteDescription && this.peerConnection.remoteDescription) {
            console.log('Adding ICE candidate');
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
          } else {
            console.log('Queuing ICE candidate');
            this.pendingCandidates.push(new RTCIceCandidate(signal.data));
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
      this.localStream = stream;
      this.onLocalStream(this.localStream);

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        if (this.localStream) {
          console.log('Adding track:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      if (this.userRole === 'interviewer') {
        console.log('Creating initial offer');
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await this.peerConnection.setLocalDescription(offer);
        console.log('Local description set');

        await this.sendSignalData({
          type: 'offer',
          data: this.peerConnection.localDescription,
          from: this.userId,
          to: '*',
          role: this.userRole
        });
      }
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