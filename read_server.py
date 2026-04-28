import ftplib

host = '122.165.242.4'
user = 'mahean'
passwd = 'k4a9W6]8Xsb;EH'

try:
    ftp = ftplib.FTP()
    ftp.connect(host, 21, timeout=20)
    ftp.login(user, passwd)
    ftp.cwd('/main_mahean.com')
    
    # Read server.js
    print("Reading server.js...\n")
    local_path = 'server_remote.js'
    with open(local_path, 'wb') as f:
        ftp.retrbinary('RETR server.js', f.write)
    
    with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    print(f"server.js ({len(lines)} lines):")
    print("".join(lines[:50]))  # First 50 lines
    
    ftp.quit()
    
except Exception as e:
    print(f"ERROR: {repr(e)}")
