import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  const roles = ['ভয়েস আর্টিস্ট', 'অডিওবুক ক্রিয়েটর', 'ইউটিউবার', 'অডিও স্টোরিটেলার'];
  const rolesCount = roles.length;
  const [currentRole, setCurrentRole] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRole((prev) => (prev + 1) % rolesCount);
    }, 3000);
    return () => clearInterval(interval);
  }, [rolesCount]);

  return (
    <section className="hero-section" ref={heroRef}>
      <div className="hero-bg-waves">
        <div className="wave wave-1"></div>
        <div className="wave wave-2"></div>
        <div className="wave wave-3"></div>
      </div>

      {/* Floating Background Particles */}
      <div className="floating-shapes">
        <span className="shape shape-1"></span>
        <span className="shape shape-2"></span>
        <span className="shape shape-3"></span>
        <span className="shape shape-4"></span>
      </div>

      <div className="container hero-container">
        <div className="hero-content">
          {/* Profile Photo */}
          <div className="hero-photo-wrapper">
            <img
              src="/mahean-3.jpg"
              alt="Mahean Ahmed"
              className="hero-photo"
            />
          </div>

          <h1 className="hero-title">
            আমি Mahean Ahmed
          </h1>

          <div className="hero-role-container">
            <h2 className="hero-role" key={currentRole}>
              {roles[currentRole]}
            </h2>
          </div>

          <p className="hero-description">
            বাংলা গল্প, উপন্যাস ও অডিওবুকের একটি ব্যক্তিগত গল্পভিত্তিক চ্যানেল। মানবিক কণ্ঠে গল্প বলা, যেখানে শব্দের সাথে মিশে থাকে অনুভূতি।
          </p>

          <div className="hero-cta">
            <Link to="/audiobooks" className="btn btn-primary">
              <span>আমার কাজ শুনুন</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4.5 10H15.5M15.5 10L10.5 5M15.5 10L10.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link to="/contact" className="btn btn-secondary">
              <span>যোগাযোগ করুন</span>
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-number" style={{ color: 'white' }}>৫০+</div>
              <div className="hero-stat-label">অডিওবুক</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number" style={{ color: 'white' }}>১০কে+</div>
              <div className="hero-stat-label">সাবস্ক্রাইবার</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number" style={{ color: 'white' }}>৫ লক্ষ+</div>
              <div className="hero-stat-label">শ্রোতা</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
