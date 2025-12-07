import express from 'express';

const express = require('express');
const router = express.Router();
// Adjust paths based on your actual backend file structure
const User = require('../models/User'); 
const Post = require('../models/Post'); 

router.get('/search', async (req, res) => {
    const searchQuery = req.query.q;
    // Basic regex for case-insensitive partial match
    const regex = new RegExp(searchQuery, 'gi'); 

    try {
        // Search users by name or username
        const users = await User.find({
            $or: [{ name: regex }, { username: regex }]
        }).limit(10);

        // Search posts by content, populating the author details
        const posts = await Post.find({
            text: regex // Assuming the post content field is named 'text'
        }).limit(20).populate('author', 'name username profile_image_url'); 

        // Send back a structured JSON response
        res.json({ users, posts });

    } catch (err) {
        res.status(500).json({ message: "Search error" });
    }
});

module.exports = router;
