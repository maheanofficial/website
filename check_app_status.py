import ftplib
import os

host = '122.165.242.4'
user = 'mahean'
passwd = 'k4a9W6]8Xsb;EH'

try:
    ftp = ftplib.FTP()
    ftp.connect(host, 21, timeout=20)
    ftp.login(user, passwd)
    
    print(f"✅ Connected to FTP at {host}")
    
    # Check root
    cwd = ftp.pwd()
    print(f"Current directory: {cwd}\n")
    
    # Try to navigate to app directory
    try:
        ftp.cwd('/main_mahean.com')
        print("✅ Found /main_mahean.com directory")
        
        # List all files
        print("\nFiles in /main_mahean.com:")
        files = []
        ftp.retrlines('LIST', files.append)
        for f in files[:20]:  # First 20 files
            print(f)
        
        # Check for package.json
        try:
            ftp.cwd('/main_mahean.com')
            local_path = '/tmp/package.json'
            with open(local_path, 'wb') as f:
                ftp.retrbinary('RETR package.json', f.write)
            with open(local_path, 'r') as f:
                content = f.read()
            print("\n✅ Found package.json:")
            print(content[:500])
        except Exception as e:
            print(f"\n❌ Could not read package.json: {e}")
        
        # Check for .nodejs selector file or config
        try:
            ftp.cwd('/main_mahean.com')
            files_list = ftp.nlst()
            if '.nvm' in files_list or '.nvmrc' in files_list:
                print("\n✅ Found Node version file")
        except:
            pass
    
    except Exception as e:
        print(f"❌ Could not access /main_mahean.com: {e}")
    
    ftp.quit()
    
except Exception as e:
    print(f"❌ FTP Connection Error: {repr(e)}")
