const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, age, location } = req.body;

    // Check if email already exists
    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password, // Ensure User.create hashes the password
      age,
      location,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.userId }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Token expires in 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        age: newUser.age,
        location: newUser.location,
      },
      token, // Return token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// Verify token and get current user
exports.verify = async (req, res) => {
  try {
    const userId = req.userId; // From authMiddleware
    const user = await User.getById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
      },
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Error verifying user' });
  }
};

// Get current user (protected route)
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // From authMiddleware
    const user = await User.getById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};




