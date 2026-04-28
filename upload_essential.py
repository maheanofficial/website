import ftplib
import os
from pathlib import Path

host='122.165.242.4'
user='mahean'
passwd='k4a9W6]8Xsb;EH'
app_dir='/main_mahean.com'

root = Path.cwd()
files_to_upload = [
    'package.json',
    'package-lock.json',
    'server.js',
]

dirs_to_upload = [
    'api',
    'dist',
    'scripts',
]

def upload_file(ftp, local_path, remote_path):
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {remote_path}', f)

def ensure_dir(ftp, remote_dir):
    parts = remote_dir.strip('/').split('/')
    current = ''
    for p in parts:
        current += '/' + p
        try:
            ftp.mkd(current)
        except:
            pass

ftp = ftplib.FTP()
ftp.connect(host, 21, timeout=20)
ftp.login(user, passwd)
ftp.cwd(app_dir)

for f in files_to_upload:
    local = root / f
    remote = f'{app_dir}/{f}'
    print(f'Uploading {f}')
    try:
        upload_file(ftp, local, remote)
        print('OK')
    except Exception as e:
        print('ERROR', e)

for d in dirs_to_upload:
    dpath = root / d
    for p in dpath.rglob('*'):
        if p.is_file():
            rel = p.relative_to(root).as_posix()
            remote = f'{app_dir}/{rel}'
            ensure_dir(ftp, os.path.dirname(remote))
            print(f'Uploading {rel}')
            try:
                upload_file(ftp, p, remote)
                print('OK')
            except Exception as e:
                print('ERROR', e)

# Trigger restart
try:
    ensure_dir(ftp, f'{app_dir}/tmp')
    ftp.storbinary('STOR tmp/restart.txt', open('restart_app.py', 'rb'))  # dummy file
    print('Restart triggered')
except Exception as e:
    print('Restart error', e)

ftp.quit()