import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Badge,
  InputAdornment,
} from '@mui/material';
import {
  VideoCameraFront,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat,
  ScreenShare,
  People,
  Settings,
  Send,
  Close,
  StopScreenShare,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessionDetails();
    initializeMedia();
    
    // Initialize with welcome message
    setMessages([
      {
        id: '1',
        sender: 'System',
        content: 'Welcome to the study session! Use this chat to communicate with other participants.',
        timestamp: new Date(),
        isSystem: true
      }
    ]);
    
    return () => {
      // Cleanup media streams when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast.success('Camera and microphone initialized');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera or microphone');
      setVideoEnabled(false);
      setMicEnabled(false);
    }
  };

  const fetchSessionDetails = async () => {
    try {
      // Get the token correctly
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        try {
          const parsedAuth = JSON.parse(authStorage);
          token = parsedAuth.state?.token || '';
        } catch (error) {
          console.error('Error parsing auth token:', error);
        }
      }

      const response = await fetch(`http://localhost:5000/api/study-sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        // Simulate some participants for demo
        setParticipants([
          { id: user?._id, name: `${user?.firstName} ${user?.lastName}`, avatar: user?.avatar },
        ]);
      } else {
        toast.error('Session not found');
        navigate('/sessions');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    toast.success('Call ended');
    navigate('/sessions');
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !micEnabled;
      }
    }
    setMicEnabled(!micEnabled);
    toast.success(micEnabled ? 'Microphone muted' : 'Microphone unmuted');
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoEnabled;
      }
    }
    setVideoEnabled(!videoEnabled);
    toast.success(videoEnabled ? 'Camera turned off' : 'Camera turned on');
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);
        
        // Switch back to camera
        if (videoRef.current && localStream) {
          videoRef.current.srcObject = localStream;
        }
        
        toast.success('Screen sharing stopped');
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        
        // Switch video to screen share
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Listen for when user stops sharing via browser UI
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
          }
          toast.success('Screen sharing stopped');
        });
        
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setUnreadCount(0);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      sender: `${user?.firstName} ${user?.lastName}`,
      content: newMessage,
      timestamp: new Date(),
      isSystem: false,
      isSelf: true
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Simulate receiving the message for demo
    setTimeout(() => {
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading session...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" gutterBottom>
              {session?.title || 'Study Session'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} • Session Active
            </Typography>
          </Box>
          <Chip label="Live" color="error" />
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ flex: 1 }}>
        {/* Main Video Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden', bgcolor: 'grey.900' }}>
            {(videoEnabled || isScreenSharing) && (localStream || screenStream) ? (
              <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isScreenSharing ? 'none' : 'scaleX(-1)', // Don't mirror screen share
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">
                    {isScreenSharing ? 
                      `${user?.firstName} ${user?.lastName} (Screen Sharing)` :
                      `${user?.firstName} ${user?.lastName} (You)`
                    }
                  </Typography>
                </Box>
                {isScreenSharing && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      bgcolor: 'success.main',
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <ScreenShare fontSize="small" />
                    <Typography variant="caption">Sharing Screen</Typography>
                  </Box>
                )}
                {!micEnabled && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bgcolor: 'error.main',
                      color: 'white',
                      p: 1,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MicOff fontSize="small" />
                  </Box>
                )}
              </Box>
            ) : (
              <Box 
                sx={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  gap: 2
                }}
              >
                <Avatar sx={{ width: 120, height: 120, bgcolor: 'primary.main', fontSize: '3rem' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
                <Typography variant="h5">
                  {!localStream ? 'Connecting to camera...' : 'Camera is off'}
                </Typography>
                <Typography variant="body1" color="grey.400">
                  {!localStream ? 'Please allow camera access' : 'Click the camera button to turn on video'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Participants */}
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Participants ({participants.length})
              </Typography>
              <List>
                {participants.map((participant) => (
                  <ListItem key={participant.id}>
                    <ListItemAvatar>
                      <Avatar src={participant.avatar}>
                        {participant.name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">
                            {participant.name}
                          </Typography>
                          {participant.id === user?._id && (
                            <Chip size="small" label="You" color="primary" />
                          )}
                          {videoEnabled && participant.id === user?._id && (
                            <Chip 
                              size="small" 
                              icon={<Videocam />} 
                              label="Video On" 
                              color="success" 
                              variant="outlined"
                            />
                          )}
                          {micEnabled && participant.id === user?._id && (
                            <Chip 
                              size="small" 
                              icon={<Mic />} 
                              label="Audio On" 
                              color="success" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={participant.id === user?._id ? "Host" : "Participant"}
                    />
                  </ListItem>
                ))}
              </List>
              
              {participants.length === 1 && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Waiting for other participants to join...
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Session Info */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Session Details
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {session?.description || 'Study session in progress'}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Started: {new Date().toLocaleTimeString()}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Controls */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
          <Box display="flex" gap={1} alignItems="center">
            <IconButton 
              size="large" 
              onClick={toggleMic}
              sx={{ 
                bgcolor: micEnabled ? 'success.light' : 'error.main',
                color: micEnabled ? 'success.contrastText' : 'white',
                '&:hover': {
                  bgcolor: micEnabled ? 'success.main' : 'error.dark'
                },
                width: 56,
                height: 56
              }}
            >
              {micEnabled ? <Mic /> : <MicOff />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {micEnabled ? 'Mute' : 'Unmute'}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1} alignItems="center">
            <IconButton 
              size="large"
              onClick={toggleVideo}
              sx={{ 
                bgcolor: videoEnabled ? 'success.light' : 'error.main',
                color: videoEnabled ? 'success.contrastText' : 'white',
                '&:hover': {
                  bgcolor: videoEnabled ? 'success.main' : 'error.dark'
                },
                width: 56,
                height: 56
              }}
            >
              {videoEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {videoEnabled ? 'Stop Video' : 'Start Video'}
            </Typography>
          </Box>
          
          <IconButton 
            size="large"
            onClick={toggleScreenShare}
            sx={{ 
              bgcolor: isScreenSharing ? 'success.main' : 'action.hover',
              color: isScreenSharing ? 'white' : 'text.primary',
              width: 56,
              height: 56,
              '&:hover': { 
                bgcolor: isScreenSharing ? 'success.dark' : 'action.selected' 
              }
            }}
          >
            {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
          
          <Badge badgeContent={unreadCount} color="error">
            <IconButton 
              size="large"
              onClick={toggleChat}
              sx={{ 
                bgcolor: chatOpen ? 'primary.main' : 'action.hover',
                color: chatOpen ? 'white' : 'text.primary',
                width: 56,
                height: 56,
                '&:hover': { 
                  bgcolor: chatOpen ? 'primary.dark' : 'action.selected' 
                }
              }}
            >
              <Chat />
            </IconButton>
          </Badge>
          
          <IconButton 
            size="large"
            sx={{ 
              bgcolor: 'action.hover',
              width: 56,
              height: 56,
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <Settings />
          </IconButton>
          
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<CallEnd />}
            onClick={handleEndCall}
            sx={{ 
              ml: 2,
              px: 3,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            End Call
          </Button>
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Session Duration: {new Date().toLocaleTimeString()} • 
            {localStream ? ' Media Connected' : ' Connecting to media...'}
            {isScreenSharing && ' • Screen Sharing Active'}
          </Typography>
        </Box>
      </Paper>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: 350,
            boxSizing: 'border-box',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column'
          },
        }}
      >
        {/* Chat Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Session Chat</Typography>
          <IconButton onClick={() => setChatOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        {/* Messages Area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <List>
            {messages.map((message) => (
              <ListItem 
                key={message.id} 
                alignItems="flex-start"
                sx={{ 
                  flexDirection: message.isSelf ? 'row-reverse' : 'row',
                  mb: 1
                }}
              >
                <ListItemAvatar sx={{ 
                  minWidth: 'auto', 
                  mx: 1,
                  order: message.isSelf ? 1 : 0
                }}>
                  <Avatar sx={{ 
                    bgcolor: message.isSystem ? 'grey.500' : (message.isSelf ? 'primary.main' : 'secondary.main'),
                    width: 32,
                    height: 32
                  }}>
                    {message.isSystem ? '🤖' : message.sender[0]}
                  </Avatar>
                </ListItemAvatar>
                
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: message.isSystem ? 'action.hover' : (message.isSelf ? 'primary.light' : 'background.paper'),
                    borderRadius: 2,
                  }}
                >
                  {!message.isSystem && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {message.sender}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        <Box component="form" onSubmit={sendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            size="small"
            multiline
            maxRows={3}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    color="primary"
                  >
                    <Send />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default SessionDetail;
