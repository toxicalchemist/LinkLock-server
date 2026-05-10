const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

const register = async (req, res, next) => {
    try {
        console.log("Incoming Data:", req.body);
        const { fullName, email, password, role } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
        }
        
        const userRole = (role && typeof role === 'string') ? role.toLowerCase() : 'user';

        const user = new User({ 
            fullName, 
            email: email.toLowerCase(), 
            password, 
            role: userRole
        });
        await user.save();
        
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        
        res.status(201).json({ 
            message: 'User registered successfully', 
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error('Registration error details:', error);
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            message: 'Login successful', 
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error('Login error details:', error);
        next(error);
    }
};

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) return res.status(401).json({ error: 'User no longer exists' });

        res.json({ user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, verifyToken };
