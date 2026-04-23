import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero-section">
            <div className="container hero-container">
                <div className="hero-content">
                    <h1 className="hero-title">যেখানে গল্পগুলো জীবন্ত হয়ে ওঠে</h1>
                    <p className="hero-description">
                        চলুন, মনের কথা তুলে ধরি গল্পে! পড়ুন দারুণ সব লেখকের লেখা আর শেয়ার করুন নিজের গল্প—এক কমিউনিটিতে, যেখানে কল্পনা ছড়ায় ডানা!
                    </p>
                    <div className="hero-cta">
                        <Link to="/series" className="hero-btn hero-btn--primary">গল্প পড়ুন</Link>
                        <Link to="/signup" className="hero-btn hero-btn--secondary">গল্প লিখুন</Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
