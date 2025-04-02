import { supabase } from './supabase';

interface RTCSignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join';
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
  private pendingCandidates: RTCIceCandidate[] = [];
  private hasRemoteDescription = false;
  private connectionTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private channel: any;
  private remoteUserJoined = false;
  private callInProgress = false;
  private isNegotiating = false;
  private canCreateOffer = true;

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

    this.initializePeerConnection();
    this.setupSignalingChannelListener();
  }

  private initializePeerConnection() {
    console.log(`Initializing peer connection as ${this.userRole}`);
    
    // Create a new peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        }
      ],
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    this.setupPeerConnectionListeners();
  }

  private setupPeerConnectionListeners() {
    // Handle ICE candidates
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

    // Handle receiving tracks
    this.peerConnection.ontrack = (event) => {
      console.log(`Received remote track: ${event.track.kind}, id: ${event.track.id}`);
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        console.log('Created new remote stream');
      }

      // Use the stream from the event if available
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        console.log(`Using remote stream from event with ${this.remoteStream.getTracks().length} tracks`);
      } else {
        this.remoteStream.addTrack(event.track);
        console.log(`Added ${event.track.kind} track to remote stream`);
      }
      
      // Force a UI update
      this.onRemoteStream(this.remoteStream);
      
      // Handle track events
      event.track.onunmute = () => {
        console.log(`Track unmuted: ${event.track.kind}`);
        this.onRemoteStream(this.remoteStream);
      };
      
      event.track.onmute = () => {
        console.log(`Track muted: ${event.track.kind}`);
      };
      
      event.track.onended = () => {
        console.log(`Track ended: ${event.track.kind}`);
        if (this.remoteStream) {
          this.remoteStream.removeTrack(event.track);
          this.onRemoteStream(this.remoteStream);
        }
      };
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state: ${this.peerConnection.iceConnectionState}`);
      
      switch (this.peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          this.clearConnectionTimeout();
          this.reconnectAttempts = 0;
          break;
          
        case 'failed':
          console.log('ICE connection failed, attempting to restart ICE');
          this.peerConnection.restartIce();
          break;
          
        case 'disconnected':
          console.log('ICE disconnected, scheduling potential restart');
          this.setConnectionTimeout(5000);
          break;
      }
    };

    // Handle general connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state: ${this.peerConnection.connectionState}`);
      
      switch (this.peerConnection.connectionState) {
        case 'connected':
          this.callInProgress = true;
          this.clearConnectionTimeout();
          break;
          
        case 'failed':
        case 'closed':
          this.handleConnectionFailure();
          break;
      }
    };

    // Handle signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      console.log(`Signaling state: ${this.peerConnection.signalingState}`);
      
      if (this.peerConnection.signalingState === 'stable') {
        this.isNegotiating = false;
        this.processPendingCandidates();
        this.canCreateOffer = true;
      }
    };

    // Handle negotiation needed events
    this.peerConnection.onnegotiationneeded = async () => {
      // Debounce and only allow if we can create offers
      if (this.isNegotiating || !this.canCreateOffer) {
        console.log('Already negotiating or cannot create offer, skipping negotiation');
        return;
      }
      
      try {
        this.isNegotiating = true;
        this.canCreateOffer = false;
        
        // Make sure we're in a stable state
        if (this.peerConnection.signalingState !== 'stable') {
          console.log(`Unstable signaling state: ${this.peerConnection.signalingState}, waiting...`);
          return;
        }
        
        console.log('Creating offer due to negotiation needed event');
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        if (this.peerConnection.signalingState !== 'stable') {
          console.log('Signaling state changed during offer creation, aborting');
          return;
        }
        
        await this.peerConnection.setLocalDescription(offer);
        
        console.log('Sending offer');
        this.sendSignalData({
          type: 'offer',
          data: this.peerConnection.localDescription,
          from: this.userId,
          to: '*',
          role: this.userRole
        });
      } catch (error) {
        console.error('Error during negotiation:', error);
      } finally {
        // Reset in 3 seconds to allow other operations to complete
        setTimeout(() => {
          this.canCreateOffer = true;
        }, 3000);
      }
    };
  }

  private async setupSignalingChannelListener() {
    console.log(`Setting up signaling channel for interview: ${this.interviewId}`);
    
    if (this.channel) {
      try {
        await this.channel.unsubscribe();
        console.log('Unsubscribed from previous channel');
      } catch (error) {
        console.error('Error unsubscribing from previous channel:', error);
      }
    }

    this.channel = supabase.channel(`interview-${this.interviewId}`);
    
    this.channel
      .on('broadcast', { event: 'signal' }, async (payload: { payload: RTCSignalData }) => {
        const signal = payload.payload;
        
        // Only process signals from the other role
        if (
          (this.userRole === 'interviewer' && signal.role === 'candidate') ||
          (this.userRole === 'candidate' && signal.role === 'interviewer')
        ) {
          console.log(`Received signal: ${signal.type} from ${signal.role}`);
          
          // Process the "join" message separately
          if (signal.type === 'join') {
            this.handleRemoteJoin(signal);
          } else {
            this.handleSignalData(signal);
          }
        }
      })
      .subscribe((status: string) => {
        console.log(`Channel subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to channel, announcing presence');
          
          // Announce our presence to the other party
          this.sendSignalData({
            type: 'join',
            data: { timestamp: Date.now() },
            from: this.userId,
            to: '*',
            role: this.userRole
          });
        }
      });

    this.subscriptions.push(() => {
      if (this.channel) {
        this.channel.unsubscribe();
      }
    });
  }

  private handleRemoteJoin(signal: RTCSignalData) {
    console.log(`Remote ${signal.role} joined`);
    this.remoteUserJoined = true;
    
    // If we're the interviewer and have a local stream, create and send an offer
    if (this.userRole === 'interviewer' && this.localStream) {
      console.log('Remote candidate joined, interviewer sending offer');
      this.createAndSendOffer();
    }
  }

  private async handleSignalData(signal: RTCSignalData) {
    try {
      switch (signal.type) {
        case 'offer': {
          console.log('Processing offer');
          
          // If we're the interviewer (who should generate offers), be cautious about accepting offers
          if (this.userRole === 'interviewer') {
            // Only accept in specific circumstances
            if (this.isNegotiating || this.peerConnection.signalingState !== 'stable') {
              console.log('Ignoring offer as interviewer in unstable state');
              return;
            }
          }
          
          // Safety check - don't set remote description in certain states
          if (this.peerConnection.signalingState === 'have-remote-offer') {
            console.log('Already have a remote offer, performing rollback');
            try {
              await this.peerConnection.setLocalDescription({type: 'rollback'});
            } catch (e) {
              console.log('Rollback failed, but continuing:', e.message);
            }
          }
          
          console.log(`Setting remote description (offer) in state: ${this.peerConnection.signalingState}`);
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.hasRemoteDescription = true;
          
          // Process any pending ICE candidates
          await this.processPendingCandidates();
          
          console.log('Creating answer');
          const answer = await this.peerConnection.createAnswer();
          
          console.log('Setting local description (answer)');
          await this.peerConnection.setLocalDescription(answer);
          
          console.log('Sending answer');
          this.sendSignalData({
            type: 'answer',
            data: this.peerConnection.localDescription,
            from: this.userId,
            to: signal.from,
            role: this.userRole
          });
          break;
        }
        
        case 'answer': {
          console.log(`Processing answer in state: ${this.peerConnection.signalingState}`);
          
          if (this.peerConnection.signalingState === 'have-local-offer') {
            console.log('Setting remote description (answer)');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            this.hasRemoteDescription = true;
            await this.processPendingCandidates();
          } else {
            console.log(`Ignoring answer in incompatible state: ${this.peerConnection.signalingState}`);
          }
          break;
        }
        
        case 'ice-candidate': {
          if (!signal.data) {
            console.log('Received null ICE candidate (can be ignored)');
            return;
          }
          
          console.log('Processing ICE candidate');
          
          try {
            if (this.hasRemoteDescription && this.peerConnection.remoteDescription) {
              console.log('Adding ICE candidate');
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
            } else {
              console.log('Queueing ICE candidate (no remote description yet)');
              this.pendingCandidates.push(new RTCIceCandidate(signal.data));
            }
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
            
            // If we get an InvalidStateError, we might want to queue the candidate
            if (error.name === 'InvalidStateError') {
              console.log('Queueing ICE candidate after error');
              this.pendingCandidates.push(new RTCIceCandidate(signal.data));
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error handling signal data:', error);
      
      // Avoid triggering reconnection for OperationError which are usually transient
      if (error.name !== 'OperationError') {
        this.handleConnectionFailure();
      }
    }
  }

  private async processPendingCandidates() {
    if (this.pendingCandidates.length === 0) {
      return;
    }
    
    // Only try to process candidates if we have a remote description
    if (!this.peerConnection.remoteDescription) {
      console.log('Cannot process ICE candidates: No remote description');
      return;
    }
    
    console.log(`Processing ${this.pendingCandidates.length} pending ICE candidates`);
    
    // Take a copy and clear the original array
    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];
    
    for (const candidate of candidates) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
        console.log('Successfully added pending ICE candidate');
      } catch (error) {
        console.error('Error adding pending ICE candidate:', error);
        
        // Only requeue if it's not an OperationError, which usually indicates a permanent failure
        if (error.name !== 'OperationError') {
          this.pendingCandidates.push(candidate);
        }
      }
    }
  }

  private async createAndSendOffer() {
    if (this.isNegotiating) {
      console.log('Already negotiating, skipping offer creation');
      return;
    }
    
    this.isNegotiating = true;
    
    try {
      // Ensure we're in a stable state
      if (this.peerConnection.signalingState !== 'stable') {
        console.log(`Cannot create offer in state: ${this.peerConnection.signalingState}`);
        return;
      }
      
      console.log('Creating offer');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Setting local description');
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('Sending offer');
      this.sendSignalData({
        type: 'offer',
        data: this.peerConnection.localDescription,
        from: this.userId,
        to: '*',
        role: this.userRole
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    } finally {
      setTimeout(() => {
        this.isNegotiating = false;
      }, 1000);
    }
  }

  private async sendSignalData(signal: RTCSignalData) {
    if (!this.channel) {
      console.error('Cannot send signal: No channel available');
      return;
    }
    
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: signal
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  private setConnectionTimeout(delay: number) {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    this.connectionTimeout = window.setTimeout(() => {
      console.log('Connection timeout, attempting to recover');
      
      if (this.peerConnection.iceConnectionState === 'disconnected' ||
          this.peerConnection.iceConnectionState === 'failed') {
        this.handleConnectionFailure();
      }
    }, delay);
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private async handleConnectionFailure() {
    console.log('Connection failure detected');
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      this.onRemoteStream(null);
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    // Close the current connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize
    this.initializePeerConnection();
    await this.setupSignalingChannelListener();
    
    // Restart the call if we have a local stream
    if (this.localStream) {
      this.startCall(this.localStream);
    }
  }

  async startCall(stream: MediaStream) {
    try {
      console.log(`Starting call as ${this.userRole}`);
      
      // Reset state variables
      this.isNegotiating = false;
      this.canCreateOffer = true;
      this.hasRemoteDescription = false;
      this.pendingCandidates = [];
      
      // Store and display the local stream
      this.localStream = stream;
      this.onLocalStream(stream);
      
      // Make sure all tracks are enabled
      stream.getTracks().forEach(track => {
        console.log(`Local track: ${track.kind}, enabled=${track.enabled}`);
        track.enabled = true;
      });
      
      // Remove any existing tracks from the peer connection
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          console.log(`Removing track: ${sender.track.kind}`);
          this.peerConnection.removeTrack(sender);
        }
      });
      
      // Add local tracks to the peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding track to peer connection: ${track.kind}`);
        this.peerConnection.addTrack(track, stream);
      });
      
      // Always announce our presence
      console.log('Announcing presence in call');
      this.sendSignalData({
        type: 'join',
        data: { timestamp: Date.now() },
        from: this.userId,
        to: '*',
        role: this.userRole
      });
      
      // If we're the interviewer and the remote user has already joined, create an offer
      if (this.userRole === 'interviewer' && this.remoteUserJoined) {
        console.log('Remote participant already joined, creating offer');
        this.createAndSendOffer();
      } else {
        console.log('Waiting for remote participant to join');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  cleanup() {
    console.log('Cleaning up WebRTC connection');
    
    this.clearConnectionTimeout();
    
    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
    }
    
    // Close the peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    // Unsubscribe from the signaling channel
    if (this.channel) {
      this.channel.unsubscribe();
    }
    
    // Clear subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    
    // Clear the remote stream
    this.onRemoteStream(null);
    
    // Reset state variables
    this.remoteUserJoined = false;
    this.callInProgress = false;
    this.isNegotiating = false;
    this.hasRemoteDescription = false;
    this.pendingCandidates = [];
  }
}