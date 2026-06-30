import subprocess
import sys
import os
import signal
import time
import threading

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    venv_python = os.path.join(backend_dir, "venv", "bin", "python")
    if not os.path.exists(venv_python):
        print(f"Error: Virtual environment python not found at: {venv_python}")
        print("Please check that your backend environment installation was completed.")
        sys.exit(1)
        
    print("=================================================================")
    print(" Starting Sign Language Recognition System (Startup MVP)")
    print("=================================================================")
    
    # Start Backend FastAPI
    print("Launching FastAPI Backend on port 8000...")
    backend_proc = subprocess.Popen(
        [venv_python, "main.py"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Start Frontend Vite Dev Server
    print("Launching Vite Frontend dev server...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    processes = [backend_proc, frontend_proc]
    
    def shutdown(sig, frame):
        print("\n=================================================================")
        print(" Shutting down development servers...")
        print("=================================================================")
        for proc in processes:
            try:
                proc.terminate()
            except Exception:
                pass
        for proc in processes:
            try:
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("Servers stopped. Happy coding!")
        sys.exit(0)
        
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    def log_streamer(proc, prefix):
        try:
            for line in iter(proc.stdout.readline, ''):
                if line:
                    print(f"[{prefix}] {line.strip()}")
        except Exception:
            pass
            
    t1 = threading.Thread(target=log_streamer, args=(backend_proc, "API"), daemon=True)
    t2 = threading.Thread(target=log_streamer, args=(frontend_proc, "Vite"), daemon=True)
    t1.start()
    t2.start()
    
    print("\nSystem running in development mode!")
    print("-> Web App Address:    http://localhost:5173")
    print("-> API documentation:  http://localhost:8000/docs")
    print("Press Ctrl+C to terminate both servers...\n")
    
    # Stay alive
    while True:
        # Check if either process died unexpectedly
        if backend_proc.poll() is not None:
            print("[System] API server stopped unexpectedly.")
            break
        if frontend_proc.poll() is not None:
            print("[System] Frontend server stopped unexpectedly.")
            break
        time.sleep(1)
        
    shutdown(None, None)

if __name__ == "__main__":
    main()
