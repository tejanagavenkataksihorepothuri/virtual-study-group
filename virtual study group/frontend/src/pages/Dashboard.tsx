import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Groups,
  Schedule,
  TrendingUp,
  Psychology,
  MoreVert,
  Add,
  PlayArrow,
  Star,
  Timer,
  EmojiEvents,
  LocalFireDepartment,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { usersAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { DashboardData, DashboardGroup, DashboardSession } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);

  // Safe date formatting function
  const formatDate = (date: any, formatString: string, fallback: string = 'N/A'): string => {
    if (!date) return fallback;
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return fallback;
    }
    
    if (!isValid(dateObj)) {
      return fallback;
    }
    
    try {
      return format(dateObj, formatString);
    } catch (error) {
      console.error('Date formatting error:', error, date);
      return fallback;
    }
  };

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    recentGroups: [],
    upcomingSessions: [],
    stats: {
      totalStudyTime: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      achievements: [],
    },
    todayProgress: 0,
    weekProgress: 0,
    weeklyGoal: 300,
  });

  // Load dashboard data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.getDashboard();
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
        
        // Provide fallback mock data with proper dates
        setDashboardData({
          recentGroups: [
            {
              id: '1',
              name: 'JavaScript Study Group',
              subject: 'Programming',
              memberCount: 5,
              lastActivity: new Date(),
            },
            {
              id: '2', 
              name: 'Math Study Circle',
              subject: 'Mathematics',
              memberCount: 3,
              lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
            }
          ],
          upcomingSessions: [
            {
              id: '1',
              title: 'React Fundamentals',
              groupName: 'JavaScript Study Group',
              time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            },
            {
              id: '2',
              title: 'Calculus Review',
              groupName: 'Math Study Circle', 
              time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            }
          ],
          stats: {
            totalStudyTime: 120,
            sessionsCompleted: 8,
            currentStreak: 3,
            achievements: ['First Session', 'Study Streak'],
          },
          todayProgress: 65,
          weekProgress: 45,
          weeklyGoal: 300,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const statsCards = [
    {
      title: 'Study Time',
      value: `${Math.floor(dashboardData.stats.totalStudyTime / 60)}h ${dashboardData.stats.totalStudyTime % 60}m`,
      icon: <Timer sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Sessions',
      value: dashboardData.stats.sessionsCompleted.toString(),
      icon: <Groups sx={{ fontSize: 32, color: theme.palette.success.main }} />,
      color: theme.palette.success.main,
    },
    {
      title: 'Streak',
      value: `${dashboardData.stats.currentStreak} days`,
      icon: <LocalFireDepartment sx={{ fontSize: 32, color: theme.palette.warning.main }} />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Achievements',
      value: dashboardData.stats.achievements.length.toString(),
      icon: <EmojiEvents sx={{ fontSize: 32, color: theme.palette.secondary.main }} />,
      color: theme.palette.secondary.main,
    },
  ];

  const quickActions = [
    {
      title: 'Create Study Group',
      icon: <Groups />,
      action: () => navigate('/groups'),
      color: 'primary',
    },
    {
      title: 'Schedule Session',
      icon: <Schedule />,
      action: () => navigate('/sessions'),
      color: 'secondary',
    },
    {
      title: 'AI Assistant',
      icon: <Psychology />,
      action: () => navigate('/ai-assistant'),
      color: 'success',
    },
    {
      title: 'View Progress',
      icon: <TrendingUp />,
      action: () => navigate('/profile'),
      color: 'warning',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Welcome back, {user?.firstName}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready to continue your learning journey? Here's what's happening today.
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statsCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" component="div" fontWeight="bold">
                          {stat.value}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          backgroundColor: `${stat.color}15`,
                          borderRadius: '50%',
                          p: 1.5,
                        }}
                      >
                        {stat.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Quick Actions */}
            <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={6} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{
                        py: 2,
                        flexDirection: 'column',
                        gap: 1,
                        borderColor: `${action.color}.main`,
                        '&:hover': {
                          backgroundColor: `${action.color}.light`,
                          borderColor: `${action.color}.main`,
                        },
                      }}
                      color={action.color as any}
                    >
                      {action.title}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Study Time: {dashboardData.todayProgress} / {Math.floor(dashboardData.weeklyGoal / 7)} minutes
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(dashboardData.todayProgress / Math.floor(dashboardData.weeklyGoal / 7)) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Keep it up! 💪
                </Typography>
                <Chip
                  icon={<Star />}
                  label={`${Math.floor(((dashboardData.todayProgress / Math.floor(dashboardData.weeklyGoal / 7)) * 100)) || 0}%`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              {/* Weekly Progress */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  This Week: {dashboardData.weekProgress} / {dashboardData.weeklyGoal} minutes
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(dashboardData.weekProgress / dashboardData.weeklyGoal) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                  color="secondary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Groups */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Groups
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/groups')}
                  endIcon={<Add />}
                >
                  View All
                </Button>
              </Box>
              <List dense>
                {dashboardData.recentGroups.map((group, index) => (
                  <React.Fragment key={group.id}>
                    <ListItem
                      button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      sx={{ px: 0, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {group.subject.substring(0, 2)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={group.name}
                        secondary={`${group.memberCount} members • ${formatDate(group.lastActivity, 'MMM dd', 'No activity')}`}
                      />
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </ListItem>
                    {index < dashboardData.recentGroups.length - 1 && <Divider variant="inset" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Sessions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Upcoming Sessions
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/sessions')}
                  endIcon={<Add />}
                >
                  Schedule
                </Button>
              </Box>
              {dashboardData.upcomingSessions.length > 0 ? (
                <List dense>
                  {dashboardData.upcomingSessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      <ListItem
                        button
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        sx={{ px: 0, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <Schedule />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={session.title}
                          secondary={`${session.groupName} • ${formatDate(session.time, 'MMM dd, HH:mm', 'Time TBD')}`}
                        />
                        <IconButton size="small" color="primary">
                          <PlayArrow />
                        </IconButton>
                      </ListItem>
                      {index < dashboardData.upcomingSessions.length - 1 && <Divider variant="inset" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Schedule sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No upcoming sessions scheduled
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/sessions')}
                  >
                    Schedule a Session
                  </Button>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      )}
    </Box>
  );
};

export default Dashboard;
