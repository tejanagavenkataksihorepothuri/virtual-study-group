const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Group = require('../models/Group');
const StudySession = require('../models/StudySession');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('groups', 'name subject privacy')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName').optional().notEmpty().trim().escape(),
  body('lastName').optional().notEmpty().trim().escape(),
  body('bio').optional().trim().escape(),
  body('studyPreferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatar', 'studyPreferences'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Get user's study statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('studyStats');
    
    // Calculate additional stats
    const totalGroups = await Group.countDocuments({
      'members.user': req.user._id,
      isActive: true
    });

    const ownedGroups = await Group.countDocuments({
      owner: req.user._id,
      isActive: true
    });

    const stats = {
      ...user.studyStats.toObject(),
      totalGroups,
      ownedGroups,
      joinDate: user.createdAt
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username firstName lastName avatar bio studyPreferences')
      .limit(parseInt(limit));

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// Update study time
router.post('/study-time', auth, [
  body('duration').isInt({ min: 1 }),
  body('sessionId').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { duration } = req.body; // duration in minutes

    const user = await User.findById(req.user._id);
    
    user.studyStats.totalStudyTime += duration;
    user.studyStats.sessionsCompleted += 1;
    
    // Update streak logic (simplified)
    const today = new Date();
    const lastStudyDate = user.lastStudyDate || new Date(0);
    const diffDays = Math.floor((today - lastStudyDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      user.studyStats.streak += 1;
    } else if (diffDays > 1) {
      user.studyStats.streak = 1;
    }
    
    user.lastStudyDate = today;

    // Check for achievements
    const achievements = [];
    if (user.studyStats.totalStudyTime >= 60 && !user.studyStats.achievements.includes('first-hour')) {
      achievements.push('first-hour');
    }
    if (user.studyStats.streak >= 7 && !user.studyStats.achievements.includes('week-streak')) {
      achievements.push('week-streak');
    }
    if (user.studyStats.sessionsCompleted >= 10 && !user.studyStats.achievements.includes('session-master')) {
      achievements.push('session-master');
    }

    user.studyStats.achievements.push(...achievements);

    await user.save();

    res.json({
      message: 'Study time updated',
      stats: user.studyStats,
      newAchievements: achievements
    });
  } catch (error) {
    console.error('Update study time error:', error);
    res.status(500).json({ message: 'Server error updating study time' });
  }
});

// Get dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('studyStats lastStudyDate');
    
    // Get recent groups (groups user is a member of, sorted by last activity)
    const recentGroups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
      .populate('owner', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name subject description memberCount updatedAt');

    // Get upcoming sessions (next 5 sessions where user is a participant)
    const upcomingSessions = await StudySession.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ],
      scheduledStart: { $gte: new Date() },
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('group', 'name')
      .populate('host', 'firstName lastName avatar')
      .sort({ scheduledStart: 1 })
      .limit(5)
      .select('title scheduledStart scheduledEnd group host status');

    // Calculate today's study time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysSessions = await StudySession.find({
      'participants.user': req.user._id,
      actualEnd: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    const todayProgress = todaysSessions.reduce((total, session) => {
      const participant = session.participants.find(p => p.user.toString() === req.user._id.toString());
      return total + (participant?.duration || 0);
    }, 0);

    // Calculate weekly goal progress
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekSessions = await StudySession.find({
      'participants.user': req.user._id,
      actualEnd: { $gte: weekStart, $lt: weekEnd },
      status: 'completed'
    });

    const weekProgress = weekSessions.reduce((total, session) => {
      const participant = session.participants.find(p => p.user.toString() === req.user._id.toString());
      return total + (participant?.duration || 0);
    }, 0);

    // Format recent groups data
    const formattedRecentGroups = recentGroups.map(group => ({
      id: group._id,
      name: group.name,
      subject: group.subject,
      memberCount: group.memberCount || 0,
      lastActivity: group.updatedAt
    }));

    // Format upcoming sessions data
    const formattedUpcomingSessions = upcomingSessions.map(session => ({
      id: session._id,
      title: session.title,
      groupName: session.group?.name || 'Unknown Group',
      time: session.scheduledStart,
      host: `${session.host?.firstName || ''} ${session.host?.lastName || ''}`.trim()
    }));

    const dashboardData = {
      recentGroups: formattedRecentGroups,
      upcomingSessions: formattedUpcomingSessions,
      stats: {
        totalStudyTime: user.studyStats?.totalStudyTime || 0,
        sessionsCompleted: user.studyStats?.sessionsCompleted || 0,
        currentStreak: user.studyStats?.streak || 0,
        achievements: user.studyStats?.achievements || [],
      },
      todayProgress, // minutes studied today
      weekProgress, // minutes studied this week
      weeklyGoal: 300, // default goal, can be made configurable per user
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

module.exports = router;
