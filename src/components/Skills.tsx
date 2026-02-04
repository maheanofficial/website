import './Skills.css';

const Skills = () => {
    const skillCategories = [
        {
            title: 'ভয়েস ও বর্ণনা',
            skills: [
                { name: 'Bangla Narration', level: 98 },
                { name: 'Character Voices', level: 95 },
                { name: 'Poetry Recitation', level: 92 },
                { name: 'Voice Modulation', level: 90 },
                { name: 'Emotional Expression', level: 94 }
            ],
            icon: '🔊'
        },
        {
            title: 'অডিও প্রডাকশন',
            skills: [
                { name: 'Audio Editing', level: 88 },
                { name: 'Sound Design', level: 85 },
                { name: 'Audacity/Adobe Audition', level: 90 },
                { name: 'Noise Reduction', level: 87 },
                { name: 'Mixing & Mastering', level: 83 }
            ],
            icon: '🎧'
        },
        {
            title: 'কনটেন্ট ও প্ল্যাটফর্ম',
            skills: [
                { name: 'YouTube Management', level: 92 },
                { name: 'Script Writing', level: 88 },
                { name: 'Storytelling', level: 95 },
                { name: 'Video Editing', level: 80 },
                { name: 'Social Media Marketing', level: 85 }
            ],
            icon: '📹'
        }
    ];

    return (
        <section id="skills" className="section skills-section">
            <div className="container">
                <div className="section-header fade-in-up">
                    <h2 className="section-title">
                        দক্ষতা ও প্রতিভা
                    </h2>
                    <p className="section-subtitle">
                        পেশাদার ভয়েস আর্টিস্ট্রি ও অডিও প্রডাকশন দক্ষতা
                    </p>
                </div>

                <div className="skills-grid">
                    {skillCategories.map((category, index) => (
                        <div
                            key={index}
                            className="skills-category card"
                            style={{ animationDelay: `${index * 0.15}s` }}
                        >
                            <div className="skills-category-header">
                                <span className="skills-icon">{category.icon}</span>
                                <h3 className="skills-category-title">{category.title}</h3>
                            </div>

                            <div className="skills-list">
                                {category.skills.map((skill, i) => (
                                    <div key={i} className="skill-item">
                                        <div className="skill-info">
                                            <span className="skill-name">{skill.name}</span>
                                            <span className="skill-percentage">{skill.level}%</span>
                                        </div>
                                        <div className="skill-bar">
                                            <div
                                                className="skill-progress"
                                                style={{
                                                    width: `${skill.level}%`,
                                                    animationDelay: `${(index * 0.15) + (i * 0.05)}s`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Skills;
