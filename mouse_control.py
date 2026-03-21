import sys
import ctypes
import time

# Windows API constants
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_WHEEL = 0x0800

# Load Windows DLLs
user32 = ctypes.windll.user32

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

def get_mouse_pos():
    pt = POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    return pt.x, pt.y

# Keep process alive and listen for commands
sys.stdout.write("READY\n")
sys.stdout.flush()

for line in sys.stdin:
    try:
        parts = line.strip().split()
        if not parts:
            continue
            
        command = parts[0]
        
        if command == "move":
            dx = int(parts[1])
            dy = int(parts[2])
            x, y = get_mouse_pos()
            user32.SetCursorPos(x + dx, y + dy)
            
        elif command == "leftclick":
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            
        elif command == "doubleclick":
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            time.sleep(0.05)
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            
        elif command == "rightclick":
            user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
            user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
            
        elif command == "scroll":
            direction = parts[1]
            delta = 120 if direction == "up" else -120
            user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, delta, 0)
            
    except Exception as e:
        pass
