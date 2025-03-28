import { supabase } from './supabase';

interface RTCSignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  from: string;
  to: string;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private interviewId: string;
  private userId: string;
  private onRemoteStream: (stream: MediaStream) => void;
  private subscriptions: (() => void)[] = [];

  constructor(
    interviewId: string,
    userId: string,
    onRemoteStream: (stream: MediaStream) => void
  ) {
    this.interviewId = interviewId;
    this.userId = userId;
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
          to: this.getOtherUserId(),
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream(this.remoteStream);
    };
  }

  private async setupSignalingChannelListener() {
    const subscription = supabase
      .channel(`interview-${this.interviewId}`)
      .on('broadcast', { event: 'signal' }, async (payload) => {
        const signal: RTCSignalData = payload.payload;
        if (signal.to === this.userId) {
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
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          await this.sendSignalData({
            type: 'answer',
            data: answer,
            from: this.userId,
            to: signal.from,
          });
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          break;

        case 'ice-candidate':
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }

  private async sendSignalData(signal: RTCSignalData) {
    await supabase.channel(`interview-${this.interviewId}`).send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
  }

  private getOtherUserId(): string {
    // In a real app, you'd get this from the interview participants
    return `other-${this.interviewId}`;
  }

  async startCall(stream: MediaStream) {
    this.localStream = stream;
    this.localStream.getTracks().forEach(track => {
      if (this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.sendSignalData({
      type: 'offer',
      data: offer,
      from: this.userId,
      to: this.getOtherUserId(),
    });
  }

  async answerCall(stream: MediaStream) {
    this.localStream = stream;
    this.localStream.getTracks().forEach(track => {
      if (this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection.close();
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }
}