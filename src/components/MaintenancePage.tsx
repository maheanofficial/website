import { Sparkles, Hammer, Clock } from 'lucide-react';

const MaintenancePage = () => {
    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050505',
            color: '#D4AF37',
            fontFamily: "'Hind Siliguri', sans-serif",
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(212, 175, 55, 0.1)',
                padding: '40px',
                borderRadius: '20px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                backdropFilter: 'blur(10px)',
                maxWidth: '600px',
                width: '100%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
                    <Hammer size={48} />
                    <Sparkles size={48} />
                </div>

                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', color: '#F5F5F5' }}>
                    কাজ চলছে...
                </h1>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#D4AF37' }}>
                    আমাদের ওয়েবসাইটটি আপগ্রেড করা হচ্ছে
                </h2>

                <p style={{ color: '#A3A3A3', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '30px' }}>
                    আপনাদের জন্য আরও উন্নত সেবা ও নতুন ফিচার নিয়ে আমরা খুব শীঘ্রই ফিরছি।
                    সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।
                </p>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#121212',
                    padding: '10px 20px',
                    borderRadius: '50px',
                    border: '1px solid #333'
                }}>
                    <Clock size={20} color="#F5F5F5" />
                    <span style={{ color: '#F5F5F5' }}>খুব শীঘ্রই আসছি</span>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePage;
