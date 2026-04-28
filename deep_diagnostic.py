import ftplib
import os

host = '122.165.242.4'
user = 'mahean'
passwd = 'k4a9W6]8Xsb;EH'

def ftp_read_file(ftp, remote_path, max_lines=50):
    """Read a remote file via FTP"""
    try:
        import io
        data = io.BytesIO()
        ftp.retrbinary(f'RETR {remote_path}', data.write)
        content = data.getvalue().decode('utf-8', errors='ignore')
        lines = content.split('\n')
        return '\n'.join(lines[:max_lines])
    except Exception as e:
        return f"Error reading {remote_path}: {e}"

def ftp_list_dir(ftp, path):
    """List directory contents"""
    try:
        ftp.cwd(path)
        files = ftp.nlst()
        return files
    except Exception as e:
        return f"Error listing {path}: {e}"

try:
    ftp = ftplib.FTP()
    ftp.connect(host, 21, timeout=20)
    ftp.login(user, passwd)
    
    print("=" * 70)
    print("DEEP DIAGNOSTIC CHECK")
    print("=" * 70)
    
    # 1. Check .env.cpanel
    print("\n[1] Checking .env.cpanel configuration:")
    print("-" * 70)
    ftp.cwd('/main_mahean.com')
    env_content = ftp_read_file(ftp, '.env.cpanel', max_lines=100)
    print(env_content)
    
    # 2. Check if dist exists
    print("\n[2] Checking if dist/ exists:")
    print("-" * 70)
    try:
        ftp.cwd('/main_mahean.com/dist')
        dist_files = ftp.nlst()
        print(f"✅ dist/ exists. Contains {len(dist_files)} items")
        print(f"First 10 items: {dist_files[:10]}")
        
        # Check for index.html
        if 'index.html' in dist_files:
            print("✅ dist/index.html exists")
        else:
            print("❌ dist/index.html NOT found!")
    except Exception as e:
        print(f"❌ dist/ not found: {e}")
    
    # 3. Check node_modules
    print("\n[3] Checking if node_modules/ exists:")
    print("-" * 70)
    ftp.cwd('/main_mahean.com')
    try:
        ftp.cwd('/main_mahean.com/node_modules')
        nm_files = ftp.nlst()
        print(f"✅ node_modules/ exists. Contains {len(nm_files)} packages")
        print(f"Sample packages: {nm_files[:5]}")
    except Exception as e:
        print(f"❌ node_modules/ not found: {e}")
    
    # 4. Check logs directory
    print("\n[4] Checking for error logs:")
    print("-" * 70)
    ftp.cwd('/home/mahean')
    try:
        log_dirs = ftp.nlst()
        if 'public_html' in log_dirs:
            print("✅ public_html directory exists")
        
        # Try to find logs
        try:
            ftp.cwd('/home/mahean/logs')
            logs = ftp.nlst()
            print(f"Found logs directory with {len(logs)} files")
            print(f"Files: {logs[:10]}")
            
            # Try to read error_log
            if 'error_log' in logs or 'error_logs' in [l.lower() for l in logs]:
                try:
                    ftp.cwd('/home/mahean/logs')
                    error_content = ftp_read_file(ftp, 'error_log', max_lines=30)
                    print("\n=== Last 30 lines of error_log ===")
                    print(error_content)
                except Exception as e2:
                    print(f"Could not read error_log: {e2}")
        except:
            print("No /home/mahean/logs directory")
    except Exception as e:
        print(f"Error checking home directory: {e}")
    
    # 5. Check .nv mrc or Node version selector
    print("\n[5] Checking Node.js configuration:")
    print("-" * 70)
    ftp.cwd('/main_mahean.com')
    try:
        files_in_app = ftp.nlst()
        config_files = [f for f in files_in_app if 'node' in f.lower() or 'nvm' in f.lower() or 'nvm' in f.lower()]
        if config_files:
            print(f"Found config files: {config_files}")
            for cf in config_files:
                try:
                    content = ftp_read_file(ftp, cf, max_lines=10)
                    print(f"\n--- {cf} ---")
                    print(content)
                except:
                    pass
        else:
            print("No Node version config files found (.nvmrc, .nvm, etc)")
    except Exception as e:
        print(f"Error checking Node config: {e}")
    
    # 6. Check package-lock.json or yarn.lock
    print("\n[6] Checking dependency lock file:")
    print("-" * 70)
    ftp.cwd('/main_mahean.com')
    try:
        if 'package-lock.json' in ftp.nlst():
            print("✅ package-lock.json exists")
        elif 'yarn.lock' in ftp.nlst():
            print("✅ yarn.lock exists")
        else:
            print("⚠️  No lock file found (package-lock.json or yarn.lock)")
    except Exception as e:
        print(f"Error checking lock file: {e}")
    
    # 7. Check if there's a startup script or hook
    print("\n[7] Checking for startup/restart scripts:")
    print("-" * 70)
    ftp.cwd('/main_mahean.com')
    try:
        startup_files = [f for f in ftp.nlst() if 'start' in f.lower() or 'restart' in f.lower() or 'app.js' in f or 'index.js' in f]
        if startup_files:
            print(f"Found startup files: {startup_files}")
        else:
            print("Standard startup files not found (looking for start*, restart*, app.js, index.js)")
    except Exception as e:
        print(f"Error checking startup files: {e}")
    
    ftp.quit()
    
except Exception as e:
    print(f"❌ CRITICAL ERROR: {repr(e)}")
