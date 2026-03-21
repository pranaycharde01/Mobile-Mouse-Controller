// Initialize Socket.io connection
const socket = io();

// DOM Elements
const trackpad = document.getElementById('trackpad');
const status = document.getElementById('status');
const leftClickBtn = document.getElementById('leftClick');
const rightClickBtn = document.getElementById('rightClick');
const scrollUpBtn = document.getElementById('scrollUp');
const scrollDownBtn = document.getElementById('scrollDown');

// Touch tracking variables
let lastTouchX = 0;
let lastTouchY = 0;
let isTracking = false;
let lastTapTime = 0;
let tapCount = 0;
let lastTouchCount = 0;
let scrollAccumulator = 0;
let lastScrollTime = 0;

// Sensitivity multiplier (higher = faster movement)
const SENSITIVITY = 3.0;
const DOUBLE_TAP_DELAY = 300;
const SCROLL_THRESHOLD = 30;
const SCROLL_THROTTLE = 150;

// Connection status handlers
socket.on('connect', () => {
    console.log('✓ Connected to server');
    status.textContent = 'Connected';
    status.className = 'status connected';
});

socket.on('disconnect', () => {
    console.log('✗ Disconnected from server');
    status.textContent = 'Disconnected';
    status.className = 'status disconnected';
});

// Trackpad touch handlers
trackpad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    lastTouchCount = e.touches.length;
    isTracking = true;
    
    if (e.touches.length === 1) {
        const currentTime = Date.now();
        if (currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
            tapCount++;
            if (tapCount === 1) {
                socket.emit('doubleClick');
                console.log('Double tap - opening app');
                tapCount = 0;
            }
        } else {
            tapCount = 0;
        }
        lastTapTime = currentTime;
    }
});

trackpad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (!isTracking) return;
    
    const touchCount = e.touches.length;
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    const dx = currentX - lastTouchX;
    const dy = currentY - lastTouchY;
    
    if (touchCount === 1) {
        socket.emit('move', { dx: dx * SENSITIVITY, dy: dy * SENSITIVITY });
    } else if (touchCount === 2) {
        scrollAccumulator += dy;
        const currentTime = Date.now();
        
        if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD && currentTime - lastScrollTime >= SCROLL_THROTTLE) {
            const direction = scrollAccumulator < 0 ? 'up' : 'down';
            socket.emit('scroll', { direction });
            scrollAccumulator = 0;
            lastScrollTime = currentTime;
        }
    }
    
    lastTouchX = currentX;
    lastTouchY = currentY;
});

trackpad.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTracking = false;
});

// Prevent context menu on long press
trackpad.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Button click handlers
leftClickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    socket.emit('leftClick');
    console.log('Left click sent');
});

rightClickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    socket.emit('rightClick');
    console.log('Right click sent');
});

scrollUpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    socket.emit('scroll', { direction: 'up' });
    console.log('Scroll up sent');
});

scrollDownBtn.addEventListener('click', (e) => {
    e.preventDefault();
    socket.emit('scroll', { direction: 'down' });
    console.log('Scroll down sent');
});

// Prevent default touch behaviors
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

console.log('Mobile Mouse client initialized');
