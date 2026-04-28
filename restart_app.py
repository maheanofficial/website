import ftplib
import io
host='122.165.242.4'
user='mahean'
passwd='k4a9W6]8Xsb;EH'
app_dir='/main_mahean.com'
try:
    ftp = ftplib.FTP()
    ftp.connect(host, 21, timeout=20)
    ftp.login(user, passwd)
    ftp.cwd(app_dir)
    try:
        ftp.mkd('tmp')
    except:
        pass
    ftp.storbinary('STOR tmp/restart.txt', io.BytesIO(b''))
    ftp.quit()
    print('Restart triggered successfully')
except Exception as e:
    print('ERROR', repr(e))