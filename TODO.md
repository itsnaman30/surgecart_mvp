# Implementation Plan - Scan Limit Fix & UI Overhaul

## Step 1: Server - Add auth, per-user scan limit (lifetime), DELETE/PATCH endpoints
- [x] Add in-memory per-user scan counter (3 lifetime for free)
- [x] Add requireAuth middleware to track endpoints
- [x] Add DELETE /api/tracks/:id and PATCH /api/tracks/:id
- [x] Filter tracks by userId
- [x] Deleting a watch does NOT restore scan slot for free users

## Step 2: Client config - Add scan limit constants
- [x] Update config.js with scan limit constants

## Step 3: Client Dashboard.jsx - Full visual redesign
- [x] Glassmorphism cards, gradients, animations
- [x] Animated scan usage progress bar
- [x] "X of 3 free scans used" display
- [x] Premium upgrade card (compelling design)
- [x] Better visual hierarchy and micro-animations

## Step 4: Client TrackingForm.jsx - Update limit messaging
- [x] Communicates "lifetime" scan limit, not concurrent

## Step 5: Client WatchCard.jsx - Enhanced design
- [x] Hover effects, better status indicators
- [x] Better visual design

## Step 6: Client Premium.jsx - Full feature comparison page
- [x] Feature comparison table
- [x] Compelling premium messaging

## Step 7: CSS Animations
- [x] Added @keyframes pulse to index.css

## Step 8: Done
- [x] All changes complete

