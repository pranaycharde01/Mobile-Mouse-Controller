const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start persistent Python process
const pythonScript = path.join(__dirname, 'mouse_control.py');
let pythonProcess = null;

function startPythonProcess() {
  pythonProcess = spawn('python', [pythonScript], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  pythonProcess.stdout.on('data', (data) => {
    if (data.toString().includes('READY')) {
      console.log('✓ Mouse control ready');
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Python process error:', err.message);
  });
  
  pythonProcess.on('exit', () => {
    console.log('Python process exited, restarting...');
    setTimeout(startPythonProcess, 1000);
  });
}

startPythonProcess();

const MouseControl = {
  moveQueue: { dx: 0, dy: 0 },
  moveTimer: null,
  
  move(dx, dy) {
    this.moveQueue.dx += dx;
    this.moveQueue.dy += dy;
    
    if (!this.moveTimer) {
      this.moveTimer = setTimeout(() => {
        if (pythonProcess && pythonProcess.stdin.writable && (this.moveQueue.dx !== 0 || this.moveQueue.dy !== 0)) {
          pythonProcess.stdin.write(`move ${Math.round(this.moveQueue.dx)} ${Math.round(this.moveQueue.dy)}\n`);
          this.moveQueue.dx = 0;
          this.moveQueue.dy = 0;
        }
        this.moveTimer = null;
      }, 16);
    }
  },

  click(button) {
    if (pythonProcess && pythonProcess.stdin.writable) {
      pythonProcess.stdin.write(`${button}click\n`);
    }
  },

  doubleClick() {
    if (pythonProcess && pythonProcess.stdin.writable) {
      pythonProcess.stdin.write(`doubleclick\n`);
    }
  },

  scroll(direction) {
    if (pythonProcess && pythonProcess.stdin.writable) {
      pythonProcess.stdin.write(`scroll ${direction}\n`);
    }
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✓ Mobile device connected:', socket.id);

  // Handle mouse movement
  socket.on('move', (data) => {
    try {
      const { dx, dy } = data;
      MouseControl.move(dx, dy);
    } catch (error) {
      console.error('Mouse move error:', error.message);
    }
  });

  // Handle left click
  socket.on('leftClick', () => {
    try {
      MouseControl.click('left');
      console.log('Left click executed');
    } catch (error) {
      console.error('Left click error:', error.message);
    }
  });

  // Handle double click
  socket.on('doubleClick', () => {
    try {
      MouseControl.doubleClick();
      console.log('Double click executed');
    } catch (error) {
      console.error('Double click error:', error.message);
    }
  });

  // Handle right click
  socket.on('rightClick', () => {
    try {
      MouseControl.click('right');
      console.log('Right click executed');
    } catch (error) {
      console.error('Right click error:', error.message);
    }
  });

  // Handle scroll
  socket.on('scroll', (data) => {
    try {
      const { direction } = data;
      MouseControl.scroll(direction);
      console.log(`Scroll ${direction} executed`);
    } catch (error) {
      console.error('Scroll error:', error.message);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('✗ Mobile device disconnected:', socket.id);
  });
});

// Cleanup on exit
process.on('exit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

process.on('SIGINT', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit();
});

// Start server
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('\n========================================');
  console.log('🖱️  Mobile Mouse Server Started');
  console.log('========================================');
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIP}:${PORT}`);
  console.log('========================================');
  console.log('\n📱 Open the Network URL on your mobile browser');
  console.log('⚠️  Make sure mobile and laptop are on the same WiFi\n');
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use`);
    console.log('\nTo fix this:');
    console.log('1. Close any other instance of this server');
    console.log('2. Or kill the process using the port:');
    console.log(`   netstat -ano | findstr :${PORT}`);
    console.log('   taskkill /PID <PID> /F\n');
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});
