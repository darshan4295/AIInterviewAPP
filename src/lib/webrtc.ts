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

    // Create peer connection with robust configuration
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Add some TURN servers as fallbacks for difficult NAT situations
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject',
        }
      ],
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    
    console.log('Creating RTCPeerConnection with config:', JSON.stringify(config));
    this.peerConnection = new RTCPeerConnection(config);

    this.setupPeerConnectionListeners();
    this.setupSignalingChannelListener();
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Generated ICE candidate', event.candidate.candidate.substring(0, 50) + '...');
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
      console.log('Received remote track:', event.track.kind, 'ID:', event.track.id, 'Enabled:', event.track.enabled);
      
      // Ensure track is enabled
      event.track.enabled = true;
      
      if (!this.remoteStream) {
        console.log('Creating new remote stream');
        this.remoteStream = new MediaStream();
      }
      
      // Only add the track if it's not already in the stream
      const trackExists = this.remoteStream.getTracks().some(
        track => track.id === event.track.id
      );
      
      if (!trackExists) {
        console.log(`Adding ${event.track.kind} track to remote stream`);
        this.remoteStream.addTrack(event.track);
      } else {
        console.log(`Track ${event.track.kind} already exists in remote stream`);
      }
      
      console.log(`Remote stream now has ${this.remoteStream.getTracks().length} tracks`);
      this.onRemoteStream(this.remoteStream);
      
      // Listen for track ended events
      event.track.onended = () => {
        console.log('Remote track ended:', event.track.kind);
      };
      
      event.track.onmute = () => {
        console.log('Remote track muted:', event.track.kind);
      };
      
      event.track.onunmute = () => {
        console.log('Remote track unmuted:', event.track.kind);
      };
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

    // Use Perfect Negotiation pattern
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (this.userRole !== 'interviewer') {
          console.log('Skipping negotiation - not interviewer');
          return;
        }

        // Prevent multiple negotiations at once
        if (this.isNegotiating || this.makingOffer) {
          console.log('Already negotiating, skipping');
          return;
        }

        this.makingOffer = true;
        this.isNegotiating = true;
        console.log('Creating offer');

        // Create offer with specific codec preferences
        const offerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        };

        // Important: reset local description first to avoid m-line order issues
        await this.peerConnection.setLocalDescription({type: "rollback"}).catch(() => {
          // Ignore rollback errors if not in have-local-offer state
          console.log('Rollback not needed, continuing');
        });

        const offer = await this.peerConnection.createOffer(offerOptions);
        
        // Check signaling state again before setting local description
        if (this.peerConnection.signalingState !== 'stable') {
          console.log('Signaling state is not stable, waiting...');
          this.makingOffer = false;
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
      // Perfect Negotiation pattern - handle collisions gracefully
      const polite = this.userRole === 'candidate'; // candidates are polite
      
      switch (signal.type) {
        case 'offer':
          {
            console.log('Processing offer in state:', this.peerConnection.signalingState);
            console.log('Offer SDP:', signal.data.sdp);
            
            const offerCollision = this.makingOffer || 
                                  (this.peerConnection.signalingState !== 'stable');

            // If we have a collision, the polite peer will roll back
            const ignoreOffer = !polite && offerCollision;
            
            if (ignoreOffer) {
              console.log('Ignoring offer due to collision (impolite peer)');
              return;
            }

            // If we're the polite peer, roll back as needed
            if (offerCollision) {
              console.log('Handling collision as polite peer - rolling back');
              await this.peerConnection.setLocalDescription({type: "rollback"});
            }
            
            // Modify the SDP to ensure media flows
            let sdp = signal.data.sdp;
            
            // Ensure all m-lines are set to sendrecv
            sdp = sdp.replace(/a=inactive/g, 'a=sendrecv');
            sdp = sdp.replace(/a=recvonly/g, 'a=sendrecv');
            sdp = sdp.replace(/a=sendonly/g, 'a=sendrecv');
            
            // Create modified session description
            const modifiedOffer = new RTCSessionDescription({
              type: 'offer',
              sdp: sdp
            });
            
            console.log('Setting modified remote description');
            await this.peerConnection.setRemoteDescription(modifiedOffer);
            this.hasRemoteDescription = true;
            console.log('Remote description set (offer)');

            // Create transceivers with the correct direction if they don't exist
            const transceivers = this.peerConnection.getTransceivers();
            console.log(`Peer has ${transceivers.length} transceivers before creating answer`);
            
            if (transceivers.length === 0) {
              console.log('Creating transceivers before answering');
              this.peerConnection.addTransceiver('audio', {direction: 'sendrecv'});
              this.peerConnection.addTransceiver('video', {direction: 'sendrecv'});
            }

            console.log('Creating answer');
            const answer = await this.peerConnection.createAnswer();
            
            // Ensure the answer also has sendrecv
            let modifiedAnswerSdp = answer.sdp;
            modifiedAnswerSdp = modifiedAnswerSdp.replace(/a=inactive/g, 'a=sendrecv');
            modifiedAnswerSdp = modifiedAnswerSdp.replace(/a=recvonly/g, 'a=sendrecv');
            modifiedAnswerSdp = modifiedAnswerSdp.replace(/a=sendonly/g, 'a=sendrecv');
            
            const modifiedAnswer = new RTCSessionDescription({
              type: 'answer',
              sdp: modifiedAnswerSdp
            });
            
            await this.peerConnection.setLocalDescription(modifiedAnswer);
            console.log('Local description set (answer)');
            console.log('Answer SDP:', this.peerConnection.localDescription.sdp);

            console.log('Sending answer');
            await this.sendSignalData({
              type: 'answer',
              data: this.peerConnection.localDescription,
              from: this.userId,
              to: signal.from,
              role: this.userRole
            });
            
            // Log the connection states after processing the offer/answer
            console.log('Connection state after answer:', this.peerConnection.connectionState);
            console.log('ICE connection state after answer:', this.peerConnection.iceConnectionState);
            console.log('Signaling state after answer:', this.peerConnection.signalingState);
            break;
          }

        case 'answer':
          if (!this.peerConnection.currentRemoteDescription) {
            console.log('Setting remote description (answer)');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            this.hasRemoteDescription = true;
            this.isNegotiating = false;
          }
          break;

        case 'ice-candidate':
          if (this.hasRemoteDescription && this.peerConnection.remoteDescription) {
            console.log('Adding ICE candidate');
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
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
      // First, clear any existing tracks from the peer connection
      const senders = this.peerConnection.getSenders();
      if (senders.length > 0) {
        console.log('Removing existing tracks before adding new ones');
        senders.forEach(sender => {
          this.peerConnection.removeTrack(sender);
        });
      }

      // Create transceivers first (before adding tracks)
      // This ensures we have the right receivers set up for incoming media
      console.log('Creating transceivers for audio and video');
      this.peerConnection.addTransceiver('audio', {direction: 'sendrecv'});
      this.peerConnection.addTransceiver('video', {direction: 'sendrecv'});

      // Store and display the local stream
      this.localStream = stream;
      this.onLocalStream(this.localStream);

      // Log details about the tracks we're going to add
      console.log(`Starting call with ${stream.getTracks().length} tracks`);
      stream.getTracks().forEach(track => {
        console.log(`Track ${track.kind}: ID=${track.id}, Enabled=${track.enabled}, ReadyState=${track.readyState}`);
        
        // Ensure the track is enabled
        if (!track.enabled) {
          console.log(`Enabling ${track.kind} track`);
          track.enabled = true;
        }
      });

      // Add all the tracks to the peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection`);
        this.peerConnection.addTrack(track, stream);
      });
      
      // Log the transceiver state after adding tracks
      const transceivers = this.peerConnection.getTransceivers();
      console.log(`Peer connection has ${transceivers.length} transceivers:`);
      transceivers.forEach((transceiver, i) => {
        console.log(`Transceiver ${i}: kind=${transceiver.sender.track?.kind || 'unknown'}, direction=${transceiver.direction}`);
      });

      // For the interviewer, create and send the initial offer
      if (this.userRole === 'interviewer') {
        console.log('Interviewer creating initial offer');
        this.makingOffer = true;
        
        try {
          // Create offer with specific codec preferences and constraints
          const offerOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: false  // Disable VAD for better audio quality
          };
          
          const offer = await this.peerConnection.createOffer(offerOptions);
          
          // Modify the SDP to prioritize common codecs and ensure media is flowing
          let modifiedSdp = offer.sdp;
          
          // Ensure audio and video sections have sendrecv
          modifiedSdp = modifiedSdp.replace(/a=inactive/g, 'a=sendrecv');
          modifiedSdp = modifiedSdp.replace(/a=recvonly/g, 'a=sendrecv');
          modifiedSdp = modifiedSdp.replace(/a=sendonly/g, 'a=sendrecv');
          
          const modifiedOffer = new RTCSessionDescription({
            type: 'offer',
            sdp: modifiedSdp
          });
          
          console.log('Setting modified local description');
          await this.peerConnection.setLocalDescription(modifiedOffer);
          
          console.log('Local description set, sending offer');
          await this.sendSignalData({
            type: 'offer',
            data: this.peerConnection.localDescription,
            from: this.userId,
            to: '*',
            role: this.userRole
          });
        } catch (err) {
          console.error('Error creating initial offer:', err);
        } finally {
          this.makingOffer = false;
        }
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